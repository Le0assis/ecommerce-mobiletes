import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { applyMigrations, migrationFiles } from "./db/migrate";
import { createPostgresCatalog } from "./db/postgres-catalog";
import { seedCatalog } from "./db/seed-catalog";
import { orders, products } from "./db/schema";
import { openTestDatabase } from "./db/test-database";

const headers = { "content-type": "application/json", "x-admin-token": "dev-admin-token" };
const customer = { name: "Cliente Teste", email: "cliente@example.com", phone: "11999990000" };

describe("fase 5: cadastro no Postgres", () => {
  let database: Awaited<ReturnType<typeof openTestDatabase>>;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    database = await openTestDatabase();
    await applyMigrations(database.db, ["0005_product_specs_numeric.sql"]);
    await applyMigrations(database.db, ["0005_product_specs_numeric.sql"]);
    await seedCatalog(database.db);
    const now = () => new Date("2026-10-23T15:00:00.000Z");
    app = createApp({
      now,
      catalog: createPostgresCatalog(database.db, { now }),
      persistent: true,
    });
  }, 30_000);

  afterAll(async () => {
    await database.close();
  });

  it("responde 503 sem banco e não confirma o produto na memória", async () => {
    const memory = createApp();
    const created = await memory.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify(sheet("sem-banco", "Sem banco", 100_000)),
    });
    expect(created.status).toBe(503);
    expect((await created.json()).error).toBe("catalogo_indisponivel");
    const listed = await (await memory.request("/v1/products?q=sem-banco")).json();
    expect(listed.products.some((item: { slug: string }) => item.slug === "sem-banco")).toBe(false);
  });

  it("responde 503 quando o Postgres já caiu", async () => {
    const fallen = await openTestDatabase();
    const catalog = createPostgresCatalog(fallen.db);
    const down = createApp({ catalog, persistent: true });
    await fallen.close();
    const created = await down.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify(sheet("banco-caiu", "Banco caiu", 100_000)),
    });
    expect(created.status).toBe(503);
    expect((await created.json()).error).toBe("catalogo_indisponivel");
  });

  it("grava ficha decimal, variante, foto, acessório e avaria, e outra instância lê", async () => {
    const created = await app.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...sheet("ficha-decimal", "Ficha decimal", 500_000),
        status: "ativo",
        specs: { topSpeedKmh: 32.5, rangeKmDeclared: 55, powerPeakW: 800, widthCm: 70, wheelbaseCm: 130, powerNominalW: 1000 },
      }),
    });
    expect(created.status).toBe(200);
    const product = (await created.json()).product;
    expect(product.specs.topSpeedKmh).toBe(32.5);
    expect(product.specs.rangeKmDeclared).toBe(55);

    const variant = await app.request(`/v1/admin/products/${product.id}/variants`, {
      method: "POST",
      headers,
      body: JSON.stringify({ sku: "FICHA-DECIMAL", colorName: "Névoa", colorHex: "#c5c8ce", stock: 3, priceDeltaCents: 0 }),
    });
    expect(variant.status).toBe(200);
    const variantId = (await variant.json()).variant.id as string;

    const image = await app.request(`/v1/admin/products/${product.id}/images`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url: "https://cdn.example/ficha.jpg", alt: "Capa", isCover: true }),
    });
    expect(image.status).toBe(200);

    const accessory = await app.request("/v1/admin/accessories", {
      method: "POST",
      headers,
      body: JSON.stringify({ slug: "bau-teste", name: "Baú teste", kind: "carga", priceCents: 12_000, stock: 4 }),
    });
    expect(accessory.status).toBe(200);
    const accessoryId = (await accessory.json()).accessory.id as string;
    const linked = await app.request(`/v1/admin/products/${product.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ accessories: [{ accessoryId, recommended: true }] }),
    });
    expect(linked.status).toBe(200);

    const damage = await app.request("/v1/admin/damages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: product.id,
        description: "Risco público na tampa.",
        severity: "leve",
        discountCents: 1_000,
        isPublic: true,
        images: [{ url: "https://cdn.example/risco.jpg" }],
      }),
    });
    expect(damage.status).toBe(200);
    await app.request("/v1/admin/damages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: product.id,
        description: "Avaria interna.",
        severity: "grave",
        isPublic: false,
      }),
    });

    const again = createPostgresCatalog(database.db);
    const stored = await again.getProduct(product.id);
    expect(stored?.specs.topSpeedKmh).toBe(32.5);
    expect(stored?.specs.rangeKmDeclared).toBe(55);
    expect(stored?.variants.some((item) => item.id === variantId && item.sku === "FICHA-DECIMAL")).toBe(true);
    expect(stored?.images.some((item) => item.url === "https://cdn.example/ficha.jpg" && item.isCover)).toBe(true);
    expect(stored?.accessories).toEqual([{ accessoryId, recommended: true }]);
    expect(stored?.damages.filter((item) => item.isPublic)).toHaveLength(1);
    expect(stored?.damages.filter((item) => !item.isPublic)).toHaveLength(1);

    const pub = await (await app.request("/v1/products/ficha-decimal")).json();
    expect(pub.product.rangeKm).toBe(55);
    expect(pub.product.specs.rangeKmDeclared).toBe(55);
    expect(pub.product.specs.topSpeedKmh).toBe(32.5);
    expect(pub.product.specs.powerPeakW).toBe(800);
    expect(pub.product.damages).toHaveLength(1);
    expect(pub.product.accessories[0].id).toBe(accessoryId);

    const peakOnly = await app.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...sheet("so-pico", "Só pico", 400_000),
        status: "ativo",
        specs: { powerPeakW: 500 },
      }),
    });
    expect(peakOnly.status).toBe(200);
    const peak = await (await app.request("/v1/products/so-pico")).json();
    expect(peak.product.rangeKm).toBeNull();
    expect(peak.product.specs.rangeKmDeclared).toBeNull();
    expect(peak.product.powerKw).toBe(0.5);

    await expect(
      database.db.execute(sql`update product_specs set top_speed_kmh = 150.01 where product_id = ${product.id}`),
    ).rejects.toThrow();
    await database.db.execute(sql`update product_specs set top_speed_kmh = 150 where product_id = ${product.id}`);
    const capped = await createPostgresCatalog(database.db).getProduct(product.id);
    expect(capped?.specs.topSpeedKmh).toBe(150);
  });

  it("arquiva no DELETE e a linha continua no Postgres", async () => {
    const created = await app.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...sheet("vai-arquivo", "Vai arquivo", 300_000), status: "ativo" }),
    });
    const id = (await created.json()).product.id as string;
    const archived = await app.request(`/v1/admin/products/${id}`, { method: "DELETE", headers });
    expect(archived.status).toBe(200);
    expect((await archived.json()).product.status).toBe("arquivado");
    const rows = await database.db.select().from(products).where(eq(products.id, id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("arquivado");
    const again = await createPostgresCatalog(database.db).getProduct(id);
    expect(again?.status).toBe("arquivado");
    expect((await app.request("/v1/products/vai-arquivo")).status).toBe(404);
  });

  it("lista, slug, busca e quiz só com ativo e habilitado", async () => {
    await app.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...sheet("fase5-rascunho", "Fase rascunho", 200_000), status: "rascunho" }),
    });
    await app.request("/v1/admin/products", {
      method: "POST",
      headers,
      body: JSON.stringify({ ...sheet("fase5-off", "Fase off", 200_000), status: "ativo", isEnabled: false }),
    });
    const visible = await (await app.request("/v1/products?q=Fase")).json();
    const slugs = visible.products.map((item: { slug: string }) => item.slug);
    expect(slugs).not.toContain("fase5-rascunho");
    expect(slugs).not.toContain("fase5-off");
    expect(slugs).not.toContain("vai-arquivo");
    expect((await app.request("/v1/products/fase5-off")).status).toBe(404);
    expect((await app.request("/v1/products/fase5-rascunho")).status).toBe(404);
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
    const recommended = (await quiz.json()).recommendations.map((item: { slug: string }) => item.slug);
    expect(recommended).not.toContain("fase5-off");
    expect(recommended).not.toContain("fase5-rascunho");
    expect(recommended).not.toContain("vai-arquivo");
    const admin = await (await app.request("/v1/admin/products?q=fase5", { headers })).json();
    expect(admin.products.some((item: { slug: string; isEnabled: boolean }) => item.slug === "fase5-off" && item.isEnabled === false)).toBe(true);
  });

  it("precifica a scooter da semente no checkout e recusa desabilitada", async () => {
    const seededQuote = await app.request("/v1/pricing/configure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: "watts-w1", colorId: "watts-w1-padrao", accessoryIds: [] }),
    });
    expect(seededQuote.status).toBe(200);
    const seededPrice = await seededQuote.json();
    expect(seededPrice.product.weightKg).toBe(51);
    expect(seededPrice.color.name).toBe("Preto (EXEMPLO)");
    expect(seededPrice.color.stock).toBe(5);

    const stock = await app.request("/v1/admin/products/watts-w1/variants/watts-w1-padrao", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ stock: 2 }),
    });
    expect(stock.status).toBe(200);
    const weight = await app.request("/v1/admin/products/watts-w1", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ specs: { weightKg: 80 } }),
    });
    expect(weight.status).toBe(200);

    const quote = await app.request("/v1/pricing/configure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: "watts-w1", colorId: "watts-w1-padrao", accessoryIds: [] }),
    });
    expect(quote.status).toBe(200);
    const priced = await quote.json();
    expect(priced.baseCents).toBe(430_000);
    expect(priced.subtotalCents).toBe(430_000);
    expect(priced.pixCents).toBe(408_500);
    const listed = await (await app.request("/v1/products/watts-w1")).json();
    expect(listed.product.rangeKm).toBeNull();
    expect(listed.product.specs.weightKg).toBe(80);

    const pay = await app.request("/v1/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ productId: "watts-w1", colorId: "watts-w1-padrao", accessoryIds: [], qty: 1 }],
        cep: "01310-100",
        shippingServiceId: "dedicado",
        method: "pix",
        installments: 1,
        customer,
      }),
    });
    expect(pay.status).toBe(200);
    const order = await pay.json();
    expect(order.order.totalCents).toBe(451_900);
    expect(order.order.lines[0].productId).toBe("watts-w1");
    expect(order.order.pix.copyPaste).toContain("LUME-MOCK-PIX");

    const before = await (await app.request("/v1/admin/overview", { headers })).json();
    const off = await app.request("/v1/admin/products/watts-w1", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isEnabled: false }),
    });
    expect(off.status).toBe(200);

    const refused = await app.request("/v1/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [
          { productId: "watts-w1", colorId: "watts-w1-padrao", accessoryIds: [], qty: 1 },
          { productId: "apex", colorId: "obsidiana", accessoryIds: [], qty: 1 },
        ],
        cep: "01310-100",
        shippingServiceId: "dedicado",
        method: "pix",
        installments: 1,
        customer,
      }),
    });
    expect(refused.status).toBe(400);
    expect((await refused.json()).error).toBe("produto_desabilitado");
    const configureOff = await app.request("/v1/pricing/configure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: "watts-w1", colorId: "watts-w1-padrao", accessoryIds: [] }),
    });
    expect(configureOff.status).toBe(400);
    expect((await configureOff.json()).error).toBe("produto_desabilitado");
    const after = await (await app.request("/v1/admin/overview", { headers })).json();
    expect(after.orders).toBe(before.orders);
    const search = await (await app.request("/v1/products?q=Watts")).json();
    expect(search.products.some((item: { slug: string }) => item.slug === "watts-w1")).toBe(false);

    await app.request("/v1/admin/products/watts-w1", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isEnabled: true }),
    });
  });

  it("recusa o checkout com peso ausente, zero ou acima de 400 kg", async () => {
    const before = await (await app.request("/v1/admin/overview", { headers })).json();
    async function pay() {
      return app.request("/v1/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: [{ productId: "watts-w1", colorId: "watts-w1-padrao", accessoryIds: [], qty: 1 }],
          cep: "01310-100",
          shippingServiceId: "dedicado",
          method: "pix",
          installments: 1,
          customer,
        }),
      });
    }
    for (const weightKg of [null, 0, 401]) {
      const patched = await app.request("/v1/admin/products/watts-w1", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ specs: { weightKg } }),
      });
      expect(patched.status).toBe(200);
      const refused = await pay();
      expect(refused.status).toBe(400);
      const body = await refused.json();
      expect(body.error).toBe("peso_invalido");
      expect(body.message).toBe("Peso fora da faixa de transporte.");
    }
    const after = await (await app.request("/v1/admin/overview", { headers })).json();
    expect(after.orders).toBe(before.orders);
    await app.request("/v1/admin/products/watts-w1", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ specs: { weightKg: 80 } }),
    });
  });

  it("a 0006 não apaga pedido com centavo negativo e pode rodar de novo", async () => {
    const side = await openTestDatabase(migrationFiles.filter((name) => name < "0006_consultas_loja.sql"));
    try {
      await side.db.execute(sql`
        insert into orders (
          code, status, customer_name, customer_email, customer_phone, method, provider,
          installments, subtotal_cents, shipping_cents, total_cents, cep, payload
        ) values (
          'LM-NEG', 'aguardando_pagamento', ${customer.name}, ${customer.email}, ${customer.phone},
          'pix', 'mock', 1, -1, 0, 0, '01310100', '{"lines":[]}'::jsonb
        )
      `);
      await applyMigrations(side.db, ["0006_consultas_loja.sql", "0006_consultas_loja.sql"]);
      const kept = rowsOf(await side.db.execute(sql`select subtotal_cents from orders where code = 'LM-NEG'`));
      expect(kept).toHaveLength(1);
      expect(Number(kept[0]?.subtotal_cents)).toBe(-1);
      const indexes = rowsOf(
        await side.db.execute(sql`
          select indexname from pg_indexes
          where schemaname = 'public' and indexname in (
            'products_public_listing_idx',
            'products_status_enabled_idx',
            'orders_status_created_at_idx',
            'orders_created_at_idx',
            'orders_customer_email_idx',
            'reviews_product_slug_created_at_idx',
            'addresses_customer_id_idx',
            'fiscal_documents_order_code_idx',
            'test_ride_bookings_dealer_id_idx',
            'test_ride_bookings_product_id_idx',
            'customers_email_idx'
          )
        `),
      );
      expect(indexes).toHaveLength(11);
      const constraint = rowsOf(
        await side.db.execute(sql`select convalidated from pg_constraint where conname = 'orders_money_non_negative'`),
      );
      expect(constraint[0]?.convalidated).toBe(false);
    } finally {
      await side.close();
    }
  });

  it("convive com a migration do DBA no nome is_enabled e nos tetos da ficha", async () => {
    const side = await openTestDatabase();
    try {
      await applyMigrations(side.db, ["0005_product_specs_numeric.sql", "0004_products_habilitacao_ficha.sql"]);
      await applyMigrations(side.db, ["0004_products_habilitacao_ficha.sql", "0005_product_specs_numeric.sql"]);
      await seedCatalog(side.db);
      const column = rowsOf(
        await side.db.execute(sql`
          select data_type, is_nullable, column_default
          from information_schema.columns
          where table_schema = 'public' and table_name = 'products' and column_name = 'is_enabled'
        `),
      );
      expect(column).toHaveLength(1);
      expect(column[0]?.data_type).toBe("boolean");
      expect(column[0]?.is_nullable).toBe("NO");
      expect(String(column[0]?.column_default)).toContain("true");

      await side.db.execute(sql`
        insert into products (id, slug, name, brand, category, style, tagline, description, base_price_cents, status)
        values ('rascunho-ligado', 'rascunho-ligado', 'Rascunho ligado', 'Yadea', 'scooter', 'retro', 'Exemplo.', 'Dado de exemplo.', 0, 'rascunho')
      `);
      const draft = rowsOf(await side.db.execute(sql`select status, is_enabled from products where id = 'rascunho-ligado'`));
      expect(draft[0]?.status).toBe("rascunho");
      expect(draft[0]?.is_enabled).toBe(true);

      const brands = rowsOf(
        await side.db.execute(sql`
          select brand
          from products
          where is_sample = true and brand in ('Yadea', 'Aima', 'MotoChefe', 'Shineray', 'MXF', 'Watts')
          group by brand
          order by brand
        `),
      ).map((row) => row.brand);
      expect(brands).toEqual(["Aima", "MXF", "MotoChefe", "Shineray", "Watts", "Yadea"]);
    } finally {
      await side.close();
    }
  });

  it("atualiza a cor da DT3 no mesmo id que o pedido LM269544 já gravou", async () => {
    await database.db.insert(orders).values({
      code: "LM269544",
      status: "aguardando_pagamento",
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      method: "pix",
      provider: "mock",
      installments: 1,
      subtotalCents: 990_000,
      shippingCents: 0,
      totalCents: 990_000,
      cep: "01310100",
      payload: {
        lines: [{ productId: "yadea-dt3", colorId: "yadea-dt3-padrao", accessoryIds: [], qty: 1, cents: 990_000 }],
      },
    });
    await database.db.execute(sql`update product_variants set color_name = 'A confirmar' where id = 'yadea-dt3-padrao'`);
    await seedCatalog(database.db);

    const variants = rowsOf(
      await database.db.execute(sql`select id, color_name, color_hex, stock from product_variants where product_id = 'yadea-dt3'`),
    );
    expect(variants).toHaveLength(1);
    expect(variants[0]?.id).toBe("yadea-dt3-padrao");
    expect(variants[0]?.color_name).toBe("Branco (EXEMPLO)");
    expect(variants[0]?.color_hex).toBe("#f4f4f4");
    expect(Number(variants[0]?.stock)).toBe(5);

    const stored = rowsOf(await database.db.execute(sql`select payload from orders where code = 'LM269544'`));
    const payload = stored[0]?.payload as { lines: { colorId: string }[] };
    expect(payload.lines[0]?.colorId).toBe("yadea-dt3-padrao");

    const quote = await app.request("/v1/pricing/configure", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: "yadea-dt3", colorId: "yadea-dt3-padrao", accessoryIds: [] }),
    });
    expect(quote.status).toBe(200);
    expect((await quote.json()).color.name).toBe("Branco (EXEMPLO)");
  });

  it("não religa is_enabled quando a semente roda de novo", async () => {
    await app.request("/v1/admin/products/yadea-dt3", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isEnabled: false }),
    });
    await seedCatalog(database.db);
    const again = await createPostgresCatalog(database.db).getProduct("yadea-dt3");
    expect(again?.isEnabled).toBe(false);
    expect(again?.isSample).toBe(true);
    expect((await app.request("/v1/products/yadea-dt3")).status).toBe(404);
    await app.request("/v1/admin/products/yadea-dt3", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ isEnabled: true }),
    });
  });
});

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows as Record<string, unknown>[];
  }
  return [];
}

function sheet(slug: string, name: string, basePriceCents: number) {
  return {
    slug,
    name,
    brand: "LUME",
    category: "scooter" as const,
    style: "retro" as const,
    tagline: "Dado de teste.",
    description: "Produto criado pelo teste da fase 5.",
    basePriceCents,
    isSample: true,
  };
}
