import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createPostgresCatalog } from "./db/postgres-catalog";
import { seedCatalog } from "./db/seed-catalog";
import { openTestDatabase } from "./db/test-database";

describe("API de commerce", () => {
  let app!: ReturnType<typeof createApp>;
  let close: () => Promise<void> = async () => undefined;

  beforeAll(async () => {
    const database = await openTestDatabase();
    await seedCatalog(database.db);
    const now = () => new Date("2026-10-22T12:00:00.000Z");
    app = createApp({
      now,
      catalog: createPostgresCatalog(database.db, { now }),
      persistent: true,
    });
    close = database.close;
  }, 30_000);

  afterAll(async () => {
    await close();
  });

  it("responde saúde", async () => {
    const response = await app.request("/health");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
  });

  it("filtra a vitrine por categoria e cidade", async () => {
    const response = await app.request("/v1/products?categoria=mobilete&cidade=Sao%20Paulo");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.products.map((item: { slug: string }) => item.slug)).toContain("s");
  });

  it("filtra marca parceira", async () => {
    const response = await app.request("/v1/products?marca=SENDA");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.products.map((item: { slug: string }) => item.slug)).toEqual(["rua"]);
  });

  it("responde peso_invalido no frete quando o peso falta, é zero ou passa de 400 kg", async () => {
    const cases = [
      { cep: "01310-100" },
      { cep: "01310-100", weightKg: null },
      { cep: "01310-100", weightKg: 0 },
      { cep: "01310-100", weightKg: -1 },
      { cep: "01310-100", weightKg: 400.01 },
    ];
    for (const body of cases) {
      const response = await app.request("/v1/shipping/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("peso_invalido");
      expect(json.message).toBe("Peso fora da faixa de transporte.");
    }
    const ok = await app.request("/v1/shipping/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cep: "01310-100", weightKg: 80 }),
    });
    expect(ok.status).toBe(200);
    expect((await ok.json()).services[0].priceCents).toBe(29_000 + 80 * 180);
  });

  it("recalcula o checkout e destaca o Pix sem confiar no preço do cliente", async () => {
    const response = await app.request("/v1/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ productId: "apex", colorId: "obsidiana", accessoryIds: [], qty: 1 }],
        cep: "01310-100",
        shippingServiceId: "dedicado",
        method: "pix",
        installments: 1,
        customer: { name: "Gustavo Teste", email: "gustavo@example.com", phone: "11999990000" },
      }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.order.totalCents).toBe(6_043_020);
    expect(body.order.provider).toBe("mercadopago");
    expect(body.order.pix.copyPaste).toContain("LUME-MOCK-PIX");
  });

  it("parcela em 21 vezes sem juros no cartão", async () => {
    const response = await app.request("/v1/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ productId: "s", colorId: "obsidiana", accessoryIds: [], qty: 1 }],
        cep: "05435-000",
        shippingServiceId: "dedicado",
        method: "cartao",
        installments: 21,
        customer: { name: "Gustavo Teste", email: "gustavo@example.com", phone: "11999990000" },
      }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.order.provider).toBe("pagarme");
    expect(body.order.installments).toBe(21);
    expect(body.order.subtotalCents).toBe(1_490_000);
    expect(body.order.totalCents).toBeGreaterThan(1_490_000);
  });

  it("aplica cupom antes do Pix e avança o sandbox", async () => {
    const response = await app.request("/v1/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ productId: "s", colorId: "obsidiana", accessoryIds: [], qty: 1 }],
        cep: "05435-000",
        shippingServiceId: "dedicado",
        method: "pix",
        installments: 1,
        couponCode: "LUME10",
        customer: { name: "Gustavo Teste", email: "gustavo@example.com", phone: "11999990000" },
      }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.order.couponCents).toBe(149_000);
    expect(body.order.totalCents).toBeLessThan(1_490_000);

    const advanced = await app.request(`/v1/orders/${body.order.code}/sandbox`, { method: "POST" });
    const next = await advanced.json();
    expect(advanced.status).toBe(200);
    expect(next.order.status).toBe("pago");
    expect(next.message).toContain("LUME-SANDBOX");

    const code = await app.request("/v1/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "gustavo@example.com", code: "LUME-SANDBOX" }),
    });
    const session = await code.json();
    const mine = await app.request("/v1/account/orders", { headers: { authorization: `Bearer ${session.token}` } });
    const account = await mine.json();
    expect(mine.status).toBe(200);
    expect(account.orders.map((item: { code: string }) => item.code)).toContain(body.order.code);
  });

  it("registra pedido de troca sem oferecer preço", async () => {
    const response = await app.request("/v1/trade-ins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Gustavo Teste",
        email: "gustavo@example.com",
        phone: "11999990000",
        brand: "Usada",
        model: "150",
        year: 2018,
        km: 18000,
        city: "São Paulo",
      }),
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.tradeIn.id).toBeTruthy();
    expect(body.message).toContain("Nenhum valor");
    const overview = await app.request("/v1/admin/overview", { headers: { "x-admin-token": "dev-admin-token" } });
    const listed = await overview.json();
    expect(listed.recentTradeIns.some((item: { brand: string }) => item.brand === "Usada")).toBe(true);
  });

  it("agenda serviço numa loja existente", async () => {
    const response = await app.request("/v1/service-bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        dealerId: "sp-vila-madalena",
        productId: "apex",
        name: "Gustavo Teste",
        email: "gustavo@example.com",
        phone: "11999990000",
        preferredDate: "2026-11-02",
        note: "Revisão dos primeiros mil quilômetros.",
      }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.booking.id).toBeTruthy();
    const overview = await app.request("/v1/admin/overview", { headers: { "x-admin-token": "dev-admin-token" } });
    const listed = await overview.json();
    expect(listed.serviceBookings).toBeGreaterThanOrEqual(1);
    expect(listed.recentService.some((item: { productId: string }) => item.productId === "apex")).toBe(true);
  });

  it("não publica lojas nem o simulador de autonomia", async () => {
    const dealers = await app.request("/v1/dealers");
    const dealersCity = await app.request("/v1/dealers?cidade=Sao%20Paulo");
    const range = await app.request("/v1/range", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: "apex", speedKmh: 40, extraWeightKg: 0, mode: "cidade" }),
    });
    expect(dealers.status).toBe(404);
    expect(dealersCity.status).toBe(404);
    expect(range.status).toBe(404);

    const products = await app.request("/v1/products?categoria=mobilete&cidade=Sao%20Paulo");
    const listed = await products.json();
    expect(listed.dealers).toBeUndefined();
    expect(listed.products.map((item: { slug: string }) => item.slug)).toContain("s");

    const hidden = await app.request("/v1/admin/dealers");
    expect(hidden.status).toBe(401);
    const admin = await app.request("/v1/admin/dealers?cidade=Sao%20Paulo", {
      headers: { "x-admin-token": "dev-admin-token" },
    });
    const body = await admin.json();
    expect(admin.status).toBe(200);
    expect(body.dealers.map((item: { id: string }) => item.id)).toEqual(["sp-vila-madalena"]);
  });

  it("expõe o selo autopropelido calculado e o esconde sem a ficha nominal", async () => {
    const response = await app.request("/v1/products/s");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.product.autopropelido.eligible).toBe(false);
    expect(body.product.autopropelido.label).toBeNull();
    expect(body.product.autopropelido.notice).toBe("verifique as regras da sua cidade");
    expect(body.product.autopropelido.missing).toEqual(["powerNominalW", "widthCm", "wheelbaseCm"]);
    expect(body.product.registrationClass).toBe("ciclomotor");

    const list = await app.request("/v1/products");
    const listed = await list.json();
    expect(listed.products.every((item: { autopropelido: { eligible: boolean } }) => item.autopropelido.eligible === false)).toBe(
      true,
    );
  });

  it("entrega ficha, variantes, acessórios, amostra, avaria pública, selo e autonomia", async () => {
    const list = await app.request("/v1/products");
    const listed = await list.json();
    const apex = listed.products.find((item: { slug: string }) => item.slug === "apex");
    expect(apex.rangeKm).toBeGreaterThan(0);
    expect(apex.isSample).toBe(false);
    expect(apex.specs.rangeKmDeclared).toBe(apex.rangeKm);
    expect(apex.specs.powerNominalW).toBeNull();
    expect(apex.variants).toHaveLength(apex.colors.length);
    expect(apex.accessories.length).toBeGreaterThan(0);
    expect(apex.accessoryIds.length).toBe(apex.accessories.length);
    expect(apex.damages).toEqual([]);
    expect(apex.autopropelido.eligible).toBe(false);
    expect(apex.images).toEqual([]);
    expect(listed.products.some((item: { slug: string; isSample: boolean }) => item.slug === "yadea-dt3" && item.isSample)).toBe(true);

    const city = await app.request("/v1/products?categoria=mobilete&cidade=Sao%20Paulo");
    const filtered = await city.json();
    expect(filtered.products.map((item: { slug: string }) => item.slug)).not.toContain("watts-w1");

    const sample = await app.request("/v1/products/yadea-dt3");
    const body = await sample.json();
    expect(body.product.rangeKm).toBe(55);
    expect(body.product.specs.rangeKmDeclared).toBe(55);
    expect(body.product.specs.batteryRemovable).toBe(true);
    expect(body.product.variants[0].sku).toBe("YADEA-DT3");
    expect(body.product.variants[0].colorName).toBe("A confirmar");
    expect(body.product.isSample).toBe(true);
    expect(body.product.style).toBe("esportivo");
    expect(body.product.damages).toEqual([]);
    expect(body.product.autopropelido.missing).toEqual(expect.arrayContaining(["widthCm", "wheelbaseCm"]));
    expect(body.accessories).toEqual(body.product.accessories);
    expect(body.reviews).toEqual([]);

    const jet = await app.request("/v1/products/motochefe-jet");
    const openRange = await jet.json();
    expect(openRange.product.rangeKm).toBeNull();
    expect(openRange.product.specs.rangeKmDeclared).toBeNull();

    const samples = listed.products.filter((item: { isSample: boolean }) => item.isSample);
    expect(samples).toHaveLength(8);
    expect(
      samples.every(
        (item: { weightKg: number; description: string }) =>
          item.weightKg > 0 && item.weightKg <= 400 && item.description.includes("peso de exemplo, a confirmar"),
      ),
    ).toBe(true);

    const watts = await app.request("/v1/products/watts-w1");
    const wattsBody = await watts.json();
    expect(wattsBody.product.weightKg).toBe(51);
    expect(wattsBody.product.variants[0].colorName).toBe("Preto (EXEMPLO)");
    expect(wattsBody.product.variants[0].stock).toBe(5);
    expect(wattsBody.product.colors[0].stock).toBe(5);
  });

  it("o quiz usa o catálogo ativo, respeita o teto e muda com o estilo", async () => {
    const headers = { "content-type": "application/json", "x-admin-token": "dev-admin-token" };
    for (const [slug, style] of [
      ["quiz-retro", "retro"],
      ["quiz-esporte", "esportivo"],
    ] as const) {
      const created = await app.request("/v1/admin/products", {
        method: "POST",
        headers,
        body: JSON.stringify({
          slug,
          name: slug,
          brand: "LUME",
          category: "scooter",
          style,
          tagline: "Quiz.",
          description: "Ativo só para o teste do quiz.",
          basePriceCents: 500_000,
          status: "ativo",
          specs: { rangeKmDeclared: 40, topSpeedKmh: 32 },
        }),
      });
      expect(created.status).toBe(200);
    }
    const draft = await app.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify({
        slug: "quiz-rascunho",
        name: "Rascunho",
        brand: "LUME",
        category: "scooter",
        style: "retro",
        tagline: "Fora.",
        description: "Rascunho não entra no quiz.",
        basePriceCents: 100_000,
        status: "rascunho",
        specs: { rangeKmDeclared: 200 },
      }),
    });
    expect(draft.status).toBe(200);

    const ask = (style: string) =>
      app.request("/v1/quiz", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          use: "passeio",
          dailyKm: "ate20",
          hills: false,
          charging: "tomada",
          carry: "sozinho",
          cargo: "nenhum",
          budget: "ate6",
          style,
          color: "indiferente",
        }),
      });

    const retro = await (await ask("retro")).json();
    const sport = await (await ask("esportivo")).json();
    const retroSlugs = retro.recommendations.map((item: { slug: string }) => item.slug);
    const sportSlugs = sport.recommendations.map((item: { slug: string }) => item.slug);
    expect(retroSlugs[0]).toBe("quiz-retro");
    expect(sportSlugs[0]).toBe("quiz-esporte");
    expect(retroSlugs).toContain("watts-w1");
    expect(retroSlugs).not.toContain("quiz-rascunho");
    expect(retroSlugs).not.toContain("yadea-dt3");
    expect(retroSlugs).not.toContain("pico");
    expect(sportSlugs).not.toContain("pico");
  });

  it("esconde da vitrine o produto ativo que está desabilitado", async () => {
    const headers = { "content-type": "application/json", "x-admin-token": "dev-admin-token" };
    const created = await app.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify({
        slug: "desligado",
        name: "Desligado",
        brand: "LUME",
        category: "scooter",
        style: "retro",
        tagline: "Fora da vitrine.",
        description: "Ativo no editorial e desabilitado na listagem.",
        basePriceCents: 100_000,
        status: "ativo",
        isEnabled: false,
      }),
    });
    expect(created.status).toBe(200);
    const list = await app.request("/v1/products");
    const listed = await list.json();
    expect(listed.products.some((item: { slug: string }) => item.slug === "desligado")).toBe(false);
    const page = await app.request("/v1/products/desligado");
    expect(page.status).toBe(404);
  });

  it("entrega banners ativos e a recomendação do quiz", async () => {
    const banners = await app.request("/v1/banners");
    expect(banners.status).toBe(200);
    const listed = await banners.json();
    expect(listed.banners.map((item: { id: string }) => item.id)).toEqual(["hero-apex", "faixa-pix"]);
    expect(listed.banners[0].position).toBe(0);
    expect(listed.banners[0].imageUrl).toBeNull();

    const hidden = createApp({ banners: new Map([["faixa-pix", false]]) });
    const filtered = await hidden.request("/v1/banners");
    const body = await filtered.json();
    expect(body.banners.map((item: { id: string }) => item.id)).toEqual(["hero-apex"]);

    const quiz = await app.request("/v1/quiz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        use: "trabalho",
        dailyKm: "ate20",
        hills: false,
        charging: "tomada",
        carry: "sozinho",
        cargo: "nenhum",
        budget: "mais10",
        style: "esportivo",
        color: "indiferente",
      }),
    });
    const result = await quiz.json();
    expect(quiz.status).toBe(200);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
    expect(result.recommendations[0].reasons.length).toBeGreaterThan(0);
    expect(result.recommendations[0].accessories.map((item: { kind: string }) => item.kind)).toEqual(
      expect.arrayContaining(["retrovisor", "capacete", "suporte-celular"]),
    );
  });

  it("protege o admin", async () => {
    const denied = await app.request("/v1/admin/overview");
    expect(denied.status).toBe(401);
    const allowed = await app.request("/v1/admin/overview", { headers: { "x-admin-token": "dev-admin-token" } });
    expect(allowed.status).toBe(200);
    const overview = await allowed.json();
    expect(overview.coupons.map((item: { code: string }) => item.code)).toEqual(["LUME10", "OFICINA"]);
    expect(overview.guides.map((item: { slug: string }) => item.slug)).toContain("carregar-em-casa");
    expect(overview.products.find((item: { id: string }) => item.id === "lume-apex").batteries.map((item: { id: string }) => item.id)).toEqual(["serie", "longa"]);
    expect(Array.isArray(overview.recentOrders)).toBe(true);
  });

  it("marca a semente como exemplo e esconde o produto desabilitado", async () => {
    const listed = await (await app.request("/v1/products")).json();
    const seedSlugs = [
      "yadea-dt3",
      "yadea-m6-h",
      "yadea-gfx6",
      "motochefe-jet",
      "aima-liberty-a500",
      "shineray-pt2xs",
      "mxf-muv-e-road",
      "watts-w1",
    ];
    const seeded = seedSlugs.map((slug) =>
      listed.products.find((item: { slug: string; isSample: boolean; isEnabled: boolean; brand: string }) => item.slug === slug),
    );
    expect(seeded.every((item) => item?.isSample === true && item?.isEnabled === true)).toBe(true);
    const brands = [...new Set(seeded.map((item) => item?.brand))].sort();
    expect(brands).toEqual(["Aima", "MXF", "MotoChefe", "Shineray", "Watts", "Yadea"]);
    expect(listed.products.some((item: { slug: string }) => item.slug === "foston-x15-max")).toBe(false);
    expect(listed.products.find((item: { slug: string }) => item.slug === "apex").isEnabled).toBe(true);
    expect(listed.products.find((item: { slug: string }) => item.slug === "watts-w1").rangeKm).toBeNull();

    const headers = { "content-type": "application/json", "x-admin-token": "dev-admin-token" };
    const created = await app.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify({
        slug: "fora-da-loja",
        name: "Fora da loja",
        brand: "Watts",
        category: "mobilete",
        style: "retro",
        tagline: "Teste do interruptor.",
        description: "Produto de teste para o status habilitado.",
        basePriceCents: 450_000,
        status: "ativo",
        isEnabled: true,
        isSample: true,
      }),
    });
    expect(created.status).toBe(200);
    const id = (await created.json()).product.id as string;

    const visible = await (await app.request("/v1/products?q=Fora")).json();
    expect(visible.products.some((item: { slug: string }) => item.slug === "fora-da-loja")).toBe(true);

    const off = await app.request(`/v1/admin/products/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isEnabled: false }),
    });
    expect(off.status).toBe(200);
    expect((await off.json()).product.isEnabled).toBe(false);

    const hiddenList = await (await app.request("/v1/products?q=Fora")).json();
    expect(hiddenList.products.some((item: { slug: string }) => item.slug === "fora-da-loja")).toBe(false);
    expect((await app.request("/v1/products/fora-da-loja")).status).toBe(404);

    const admin = await (await app.request("/v1/admin/products?q=fora", { headers })).json();
    expect(admin.products.some((item: { slug: string; isEnabled: boolean }) => item.slug === "fora-da-loja" && item.isEnabled === false)).toBe(true);

    const quiz = await app.request("/v1/quiz", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        use: "passeio",
        dailyKm: "ate20",
        hills: false,
        charging: "tomada",
        carry: "sozinho",
        cargo: "nenhum",
        budget: "ate6",
        style: "retro",
        color: "indiferente",
      }),
    });
    const slugs = (await quiz.json()).recommendations.map((item: { slug: string }) => item.slug);
    expect(slugs).not.toContain("fora-da-loja");

    const pay = await app.request("/v1/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ productId: id, colorId: "qualquer", accessoryIds: [], qty: 1 }],
        cep: "01310-100",
        shippingServiceId: "dedicado",
        method: "pix",
        installments: 1,
        customer: { name: "Gustavo Teste", email: "gustavo@example.com", phone: "11999990000" },
      }),
    });
    expect(pay.status).toBe(400);
    expect((await pay.json()).error).toBe("produto_desabilitado");
  });
});
