import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { CatalogProduct, CatalogState } from "./catalog-store";
import { flushCatalog } from "./db/catalog-flush";
import type { SampleSpec } from "./db/sample-scooters";
import { dealers, orders, productColors } from "./db/schema";
import { openTestDatabase } from "./db/test-database";

const at = "2026-10-24T12:00:00.000Z";

const spec = (weightKg: number): SampleSpec => ({
  powerNominalW: null,
  powerPeakW: null,
  topSpeedKmh: null,
  widthCm: null,
  wheelbaseCm: null,
  weightKg,
  seatHeightMm: null,
  batteryV: null,
  batteryAh: null,
  batteryChem: null,
  batteryRemovable: null,
  chargeHours: null,
  rangeKmDeclared: null,
  hasSpeedLimiter: null,
  hasBell: null,
  hasLights: null,
});

function product(id: string, name: string): CatalogProduct {
  return {
    id,
    slug: id,
    name,
    brand: "LUME",
    category: "scooter",
    style: "retro",
    tagline: "Linha.",
    description: "Produto do teste de upsert.",
    basePriceCents: 100_000,
    status: "ativo",
    isSample: false,
    isEnabled: true,
    createdAt: at,
    updatedAt: at,
    specs: spec(80),
    variants: [
      {
        id: `${id}-cor`,
        sku: id.toUpperCase(),
        colorName: "Preto",
        colorHex: "#111111",
        batteryLabel: null,
        priceDeltaCents: 0,
        stock: 2,
        active: true,
      },
    ],
    images: [
      {
        id: `${id}-foto`,
        variantId: `${id}-cor`,
        url: "https://cdn.example/foto.jpg",
        alt: "Foto",
        position: 0,
        isCover: true,
      },
    ],
    accessories: [{ accessoryId: "bau", recommended: true }],
  };
}

function state(products: CatalogProduct[]): CatalogState {
  return {
    products,
    accessories: [
      { id: "bau", slug: "bau", name: "Baú", kind: "carga", priceCents: 12_000, stock: 4, imageUrl: null },
    ],
    damages: [
      {
        id: "avaria-a",
        productId: "a",
        variantId: "a-cor",
        description: "Risco.",
        severity: "leve",
        discountCents: 100,
        isPublic: true,
        resolvedAt: null,
        createdAt: at,
        images: [{ id: "avaria-a-foto", url: "https://cdn.example/risco.jpg", position: 0 }],
      },
    ],
  };
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows as Record<string, unknown>[];
  }
  return [];
}

async function marker(db: Awaited<ReturnType<typeof openTestDatabase>>["db"], table: string, column: string, id: string) {
  const found = rowsOf(await db.execute(sql.raw(`select ctid::text as ctid from ${table} where ${column} = '${id}'`)));
  return String(found[0]?.ctid ?? "");
}

describe("upsert do catálogo", () => {
  it("mantém id e não mexe nas outras linhas; erro desfaz a transação", async () => {
    const database = await openTestDatabase();
    try {
      const original = state([product("a", "Modelo A"), product("b", "Modelo B")]);
      await flushCatalog(database.db, original);
      await database.db.insert(productColors).values([
        { productId: "a", colorId: "legado-a", name: "Cobre", hex: "#8a5a44", priceDeltaCents: 0, stock: 1 },
        { productId: "b", colorId: "legado-b", name: "Névoa", hex: "#c5c8ce", priceDeltaCents: 0, stock: 1 },
      ]);
      await database.db.insert(dealers).values({ id: "loja", name: "Loja", city: "São Paulo", uf: "SP", cep: "01310100" });
      await database.db.insert(orders).values({
        code: "LM269544",
        status: "aguardando_pagamento",
        customerName: "Cliente Teste",
        customerEmail: "cliente@example.com",
        customerPhone: "11999990000",
        method: "pix",
        provider: "mock",
        installments: 1,
        subtotalCents: 100_000,
        shippingCents: 0,
        totalCents: 100_000,
        cep: "01310100",
        payload: { lines: [{ productId: "b", colorId: "b-cor", cents: 100_000 }] },
      });

      const before = {
        productB: await marker(database.db, "products", "id", "b"),
        variantA: await marker(database.db, "product_variants", "id", "a-cor"),
        variantB: await marker(database.db, "product_variants", "id", "b-cor"),
        colorA: await marker(database.db, "product_colors", "color_id", "legado-a"),
        colorB: await marker(database.db, "product_colors", "color_id", "legado-b"),
        imageB: await marker(database.db, "product_images", "id", "b-foto"),
        order: await marker(database.db, "orders", "code", "LM269544"),
      };

      const edited = state([product("a", "Modelo A"), product("b", "Modelo B")]);
      edited.products[0]!.name = "Modelo A editado";
      edited.products[0]!.updatedAt = "2026-10-24T13:00:00.000Z";
      await flushCatalog(database.db, edited);

      const names = rowsOf(await database.db.execute(sql`select id, name from products order by id`));
      expect(names.map((row) => [row.id, row.name])).toEqual([
        ["a", "Modelo A editado"],
        ["b", "Modelo B"],
      ]);
      expect(await marker(database.db, "products", "id", "a")).not.toBe("");
      expect(await marker(database.db, "product_variants", "id", "a-cor")).toBe(before.variantA);
      expect(await marker(database.db, "products", "id", "b")).toBe(before.productB);
      expect(await marker(database.db, "product_variants", "id", "b-cor")).toBe(before.variantB);
      expect(await marker(database.db, "product_colors", "color_id", "legado-a")).toBe(before.colorA);
      expect(await marker(database.db, "product_colors", "color_id", "legado-b")).toBe(before.colorB);
      expect(await marker(database.db, "product_images", "id", "b-foto")).toBe(before.imageB);
      expect(await marker(database.db, "orders", "code", "LM269544")).toBe(before.order);
      const payload = rowsOf(await database.db.execute(sql`select payload from orders where code = 'LM269544'`));
      expect((payload[0]?.payload as { lines: { colorId: string }[] }).lines[0]?.colorId).toBe("b-cor");

      const withoutVariant = state([product("a", "Modelo A editado"), product("b", "Modelo B")]);
      withoutVariant.products[0]!.updatedAt = "2026-10-24T13:00:00.000Z";
      withoutVariant.products[0]!.variants = [];
      withoutVariant.products[0]!.images = [{ ...withoutVariant.products[0]!.images[0]!, variantId: null }];
      withoutVariant.damages = [{ ...withoutVariant.damages[0]!, variantId: null }];
      await flushCatalog(database.db, withoutVariant);

      const variants = rowsOf(await database.db.execute(sql`select id, product_id from product_variants order by id`));
      expect(variants.map((row) => row.id)).toEqual(["b-cor"]);
      expect(await marker(database.db, "product_variants", "id", "b-cor")).toBe(before.variantB);
      expect(await marker(database.db, "product_colors", "color_id", "legado-a")).toBe(before.colorA);
      const keptImage = rowsOf(await database.db.execute(sql`select id, variant_id from product_images where id = 'a-foto'`));
      expect(keptImage[0]?.variant_id).toBeNull();

      const broken = state([product("a", "Modelo A editado"), product("b", "Modelo B")]);
      broken.products[0]!.name = "Não grava";
      broken.products[0]!.updatedAt = "2026-10-24T14:00:00.000Z";
      broken.products.push({ ...product("c", "Modelo C"), slug: "a" });
      await expect(flushCatalog(database.db, broken)).rejects.toThrow();

      const after = rowsOf(await database.db.execute(sql`select id, name from products order by id`));
      expect(after).toEqual([
        { id: "a", name: "Modelo A editado" },
        { id: "b", name: "Modelo B" },
      ]);
      expect(await marker(database.db, "product_variants", "id", "b-cor")).toBe(before.variantB);
      expect(await marker(database.db, "orders", "code", "LM269544")).toBe(before.order);
    } finally {
      await database.close();
    }
  });
});
