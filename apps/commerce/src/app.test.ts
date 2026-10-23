import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("API de commerce", () => {
  const app = createApp({ now: () => new Date("2026-10-22T12:00:00.000Z") });

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
});
