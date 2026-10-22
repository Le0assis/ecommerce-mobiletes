import { accessories, banners, dealers, motorcycles } from "@lume/domain";
import { sql } from "drizzle-orm";
import { createDatabase } from "./client";
import { accessories as accessoryTable, banners as bannerTable, dealers as dealerTable, productColors, products } from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ausente. Copie apps/commerce/.env.example para apps/commerce/.env e suba o Postgres.");
  process.exit(1);
}

const { db, close } = createDatabase(url);

await db
  .insert(products)
  .values(
    motorcycles.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      basePriceCents: product.basePriceCents,
      weightKg: product.weightKg,
      active: true,
    })),
  )
  .onConflictDoUpdate({
    target: products.id,
    set: {
      name: sql`excluded.name`,
      basePriceCents: sql`excluded.base_price_cents`,
      weightKg: sql`excluded.weight_kg`,
    },
  });

for (const product of motorcycles) {
  for (const color of product.colors) {
    await db
      .insert(productColors)
      .values({
        productId: product.id,
        colorId: color.id,
        name: color.name,
        hex: color.hex,
        priceDeltaCents: color.priceDeltaCents,
        stock: color.stock,
      })
      .onConflictDoUpdate({
        target: [productColors.productId, productColors.colorId],
        set: {
          name: sql`excluded.name`,
          priceDeltaCents: sql`excluded.price_delta_cents`,
          stock: sql`excluded.stock`,
        },
      });
  }
}

await db
  .insert(accessoryTable)
  .values(accessories.map((item) => ({ id: item.id, name: item.name, priceCents: item.priceCents })))
  .onConflictDoNothing();

await db
  .insert(dealerTable)
  .values(dealers.map((item) => ({ id: item.id, name: item.name, city: item.city, uf: item.uf, cep: item.cep })))
  .onConflictDoNothing();

await db
  .insert(bannerTable)
  .values(banners.map((item) => ({ id: item.id, slot: item.slot, eyebrow: item.eyebrow, title: item.title, href: item.href, active: item.active })))
  .onConflictDoNothing();

console.log("Catálogo gravado no Postgres.");
await close();
