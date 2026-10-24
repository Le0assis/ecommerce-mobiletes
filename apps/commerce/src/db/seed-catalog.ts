import { accessories, banners, dealers } from "@lume/domain";
import { and, eq, sql } from "drizzle-orm";
import type { Database } from "./client";
import { sampleScooters } from "./sample-scooters";
import {
  accessories as accessoryTable,
  banners as bannerTable,
  dealers as dealerTable,
  productSpecs,
  orders,
  productVariants,
  products,
} from "./schema";

/** Grava a semente atual. Não recoloca `is_enabled` numa linha que o admin já desligou. */
export async function seedCatalog(db: Database) {
  await db.transaction(async (tx) => {
    // O id aposentado só sai se nenhum pedido o citou. A exclusão não mexe em pedido nem em is_enabled.
    await tx.delete(products).where(
      and(
        eq(products.id, "foston-x15-max"),
        sql`not exists (select 1 from ${orders} where ${orders.payload}::text like '%foston-x15-max%')`,
      ),
    );

    await tx
      .insert(products)
      .values(
        sampleScooters.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          category: product.category,
          style: product.style,
          tagline: product.tagline,
          description: product.description,
          basePriceCents: product.basePriceCents,
          status: "ativo" as const,
          isSample: true,
          isEnabled: true,
        })),
      )
      .onConflictDoUpdate({
        target: products.id,
        set: {
          slug: sql`excluded.slug`,
          name: sql`excluded.name`,
          brand: sql`excluded.brand`,
          category: sql`excluded.category`,
          style: sql`excluded.style`,
          tagline: sql`excluded.tagline`,
          description: sql`excluded.description`,
          basePriceCents: sql`excluded.base_price_cents`,
          status: sql`excluded.status`,
          isSample: sql`excluded.is_sample`,
          updatedAt: sql`now()`,
        },
      });

    // weight_kg é kg de EXEMPLO (não ficha do fabricante). O upsert regrava o peso e a cor.
    await tx
      .insert(productSpecs)
      .values(sampleScooters.map((product) => ({ productId: product.id, ...product.specs })))
      .onConflictDoUpdate({
        target: productSpecs.productId,
        set: {
          powerNominalW: sql`excluded.power_nominal_w`,
          powerPeakW: sql`excluded.power_peak_w`,
          topSpeedKmh: sql`excluded.top_speed_kmh`,
          widthCm: sql`excluded.width_cm`,
          wheelbaseCm: sql`excluded.wheelbase_cm`,
          weightKg: sql`excluded.weight_kg`,
          seatHeightMm: sql`excluded.seat_height_mm`,
          batteryV: sql`excluded.battery_v`,
          batteryAh: sql`excluded.battery_ah`,
          batteryChem: sql`excluded.battery_chem`,
          batteryRemovable: sql`excluded.battery_removable`,
          chargeHours: sql`excluded.charge_hours`,
          rangeKmDeclared: sql`excluded.range_km_declared`,
          hasSpeedLimiter: sql`excluded.has_speed_limiter`,
          hasBell: sql`excluded.has_bell`,
          hasLights: sql`excluded.has_lights`,
        },
      });

    // Atualiza a variante pelo id estável. Não apaga nem cria outra linha, para o colorId
    // já gravado no pedido (ex.: LM269544 na Yadea DT3, id yadea-dt3-padrao) continuar na mesma cor.
    await tx
      .insert(productVariants)
      .values(
        sampleScooters.map((product) => ({
          id: product.variant.id,
          productId: product.id,
          sku: product.variant.sku,
          colorName: product.variant.colorName,
          colorHex: product.variant.colorHex,
          batteryLabel: product.variant.batteryLabel,
          priceDeltaCents: product.variant.priceDeltaCents,
          // estoque de exemplo
          stock: product.variant.stock,
          active: true,
        })),
      )
      .onConflictDoUpdate({
        target: productVariants.id,
        set: {
          productId: sql`excluded.product_id`,
          sku: sql`excluded.sku`,
          colorName: sql`excluded.color_name`,
          colorHex: sql`excluded.color_hex`,
          batteryLabel: sql`excluded.battery_label`,
          priceDeltaCents: sql`excluded.price_delta_cents`,
          stock: sql`excluded.stock`,
          active: sql`excluded.active`,
        },
      });
  });

  await db
    .insert(accessoryTable)
    .values(
      accessories.map((item) => ({
        id: item.id,
        slug: item.id,
        name: item.name,
        kind: item.group,
        priceCents: item.priceCents,
        stock: 0,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(dealerTable)
    .values(dealers.map((item) => ({ id: item.id, name: item.name, city: item.city, uf: item.uf, cep: item.cep })))
    .onConflictDoNothing();

  await db
    .insert(bannerTable)
    .values(
      banners.map((item, index) => ({
        id: item.id,
        slot: item.slot,
        eyebrow: item.eyebrow,
        title: item.title,
        subtitle: item.subtitle ?? "",
        href: item.href,
        imageUrl: item.imageUrl ?? null,
        position: item.position ?? index,
        active: item.active,
      })),
    )
    .onConflictDoUpdate({
      target: bannerTable.id,
      set: {
        slot: sql`excluded.slot`,
        eyebrow: sql`excluded.eyebrow`,
        title: sql`excluded.title`,
        subtitle: sql`excluded.subtitle`,
        href: sql`excluded.href`,
        imageUrl: sql`excluded.image_url`,
        position: sql`excluded.position`,
        active: sql`excluded.active`,
      },
    });
}
