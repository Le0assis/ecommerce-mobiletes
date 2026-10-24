import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { CatalogAccessory, CatalogDamage, CatalogImage, CatalogProduct, CatalogState, CatalogVariant } from "../catalog-store";
import type { Database } from "./client";
import type { SampleSpec } from "./sample-scooters";
import {
  accessories,
  damageImages,
  damages,
  productAccessories,
  productImages,
  productSpecs,
  productVariants,
  products,
} from "./schema";

type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Grava o cadastro inteiro numa transação, linha a linha.
 * Não apaga `products` nem `product_colors`: o id fica estável para pedido e FK.
 * Some do banco só a filha que não está mais no estado (o admin removeu).
 * Linha igual não recebe UPDATE.
 */
export async function flushCatalog(db: Database, state: CatalogState) {
  const next = normalize(state);
  await db.transaction(async (tx) => {
    const current = await loadCurrent(tx);
    for (const item of next.accessories) {
      if (!sameAccessory(current.accessories.get(item.id), item)) await upsertAccessory(tx, item);
    }
    for (const product of next.products) {
      if (!sameProduct(current.products.get(product.id), product)) await upsertProduct(tx, product);
      if (!sameSpec(current.specs.get(product.id), product.specs)) await upsertSpec(tx, product.id, product.specs);
      for (const variant of product.variants) {
        if (!sameVariant(current.variants.get(variant.id), product.id, variant)) await upsertVariant(tx, product.id, variant);
      }
      await upsertImages(tx, product, current.images);
      for (const link of product.accessories) {
        const key = linkKey(product.id, link.accessoryId);
        if (current.links.get(key) !== link.recommended) await upsertLink(tx, product.id, link.accessoryId, link.recommended);
      }
    }
    for (const damage of next.damages) {
      if (!sameDamage(current.damages.get(damage.id), damage)) await upsertDamage(tx, damage);
      for (const image of damage.images) {
        if (!sameDamageImage(current.damageImages.get(image.id), damage.id, image)) await upsertDamageImage(tx, damage.id, image);
      }
    }
    await deleteRemoved(tx, next);
  });
}

function normalize(state: CatalogState): CatalogState {
  return {
    accessories: state.accessories,
    damages: state.damages,
    products: state.products.map((product) => ({ ...product, images: oneCover(product.images) })),
  };
}

function oneCover(images: CatalogImage[]): CatalogImage[] {
  let seen = false;
  return images.map((image) => {
    if (!image.isCover || seen) return { ...image, isCover: image.isCover && !seen };
    seen = true;
    return image;
  });
}

async function loadCurrent(tx: Tx) {
  const [productRows, specRows, variantRows, imageRows, accessoryRows, linkRows, damageRows, damageImageRows] = await Promise.all([
    tx.select().from(products),
    tx.select().from(productSpecs),
    tx.select().from(productVariants),
    tx.select().from(productImages),
    tx.select().from(accessories),
    tx.select().from(productAccessories),
    tx.select().from(damages),
    tx.select().from(damageImages),
  ]);
  return {
    products: new Map(productRows.map((row) => [row.id, row])),
    specs: new Map(specRows.map((row) => [row.productId, row])),
    variants: new Map(variantRows.map((row) => [row.id, row])),
    images: new Map(imageRows.map((row) => [row.id, row])),
    accessories: new Map(accessoryRows.map((row) => [row.id, row])),
    links: new Map(linkRows.map((row) => [linkKey(row.productId, row.accessoryId), row.recommended])),
    damages: new Map(damageRows.map((row) => [row.id, row])),
    damageImages: new Map(damageImageRows.map((row) => [row.id, row])),
  };
}

function linkKey(productId: string, accessoryId: string) {
  return `${productId}\t${accessoryId}`;
}

function time(value: Date | string | null | undefined) {
  if (value == null) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function measure(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bit(value: unknown): boolean | null {
  if (value == null) return null;
  return value === true || value === "t" || value === "true" || value === 1 || value === "1";
}

function sameProduct(row: { slug: string; name: string; brand: string; category: string; style: string; tagline: string; description: string; basePriceCents: number; status: string; isSample: boolean; isEnabled: boolean; updatedAt: Date } | undefined, item: CatalogProduct) {
  if (!row) return false;
  return (
    row.slug === item.slug &&
    row.name === item.name &&
    row.brand === item.brand &&
    row.category === item.category &&
    row.style === item.style &&
    row.tagline === item.tagline &&
    row.description === item.description &&
    row.basePriceCents === item.basePriceCents &&
    row.status === item.status &&
    row.isSample === item.isSample &&
    row.isEnabled === item.isEnabled &&
    time(row.updatedAt) === time(item.updatedAt)
  );
}

function sameSpec(row: Record<string, unknown> | undefined, spec: SampleSpec) {
  if (!row) return false;
  const fields: (keyof SampleSpec)[] = [
    "powerNominalW",
    "powerPeakW",
    "topSpeedKmh",
    "widthCm",
    "wheelbaseCm",
    "weightKg",
    "seatHeightMm",
    "batteryV",
    "batteryAh",
    "chargeHours",
    "rangeKmDeclared",
  ];
  for (const field of fields) {
    if (measure(row[field]) !== spec[field]) return false;
  }
  if ((row.batteryChem ?? null) !== spec.batteryChem) return false;
  if (bit(row.batteryRemovable) !== spec.batteryRemovable) return false;
  if (bit(row.hasSpeedLimiter) !== spec.hasSpeedLimiter) return false;
  if (bit(row.hasBell) !== spec.hasBell) return false;
  if (bit(row.hasLights) !== spec.hasLights) return false;
  return true;
}

function sameVariant(row: { productId: string; sku: string; colorName: string; colorHex: string; batteryLabel: string | null; priceDeltaCents: number; stock: number; active: boolean } | undefined, productId: string, item: CatalogVariant) {
  if (!row) return false;
  return (
    row.productId === productId &&
    row.sku === item.sku &&
    row.colorName === item.colorName &&
    row.colorHex === item.colorHex &&
    row.batteryLabel === item.batteryLabel &&
    row.priceDeltaCents === item.priceDeltaCents &&
    row.stock === item.stock &&
    row.active === item.active
  );
}

function sameImage(row: { productId: string; variantId: string | null; url: string; alt: string; position: number; isCover: boolean } | undefined, productId: string, item: CatalogImage) {
  if (!row) return false;
  return (
    row.productId === productId &&
    row.variantId === item.variantId &&
    row.url === item.url &&
    row.alt === item.alt &&
    row.position === item.position &&
    row.isCover === item.isCover
  );
}

function sameAccessory(row: { slug: string; name: string; kind: string; priceCents: number; stock: number; imageUrl: string | null } | undefined, item: CatalogAccessory) {
  if (!row) return false;
  return row.slug === item.slug && row.name === item.name && row.kind === item.kind && row.priceCents === item.priceCents && row.stock === item.stock && row.imageUrl === item.imageUrl;
}

function sameDamage(row: { productId: string; variantId: string | null; description: string; severity: string; discountCents: number; isPublic: boolean; resolvedAt: Date | null; createdAt: Date } | undefined, item: CatalogDamage) {
  if (!row) return false;
  return (
    row.productId === item.productId &&
    row.variantId === item.variantId &&
    row.description === item.description &&
    row.severity === item.severity &&
    row.discountCents === item.discountCents &&
    row.isPublic === item.isPublic &&
    time(row.resolvedAt) === time(item.resolvedAt) &&
    time(row.createdAt) === time(item.createdAt)
  );
}

function sameDamageImage(row: { damageId: string; url: string; position: number } | undefined, damageId: string, item: { url: string; position: number }) {
  if (!row) return false;
  return row.damageId === damageId && row.url === item.url && row.position === item.position;
}

async function upsertAccessory(tx: Tx, item: CatalogAccessory) {
  await tx
    .insert(accessories)
    .values({
      id: item.id,
      slug: item.slug,
      name: item.name,
      kind: item.kind,
      priceCents: item.priceCents,
      stock: item.stock,
      imageUrl: item.imageUrl,
    })
    .onConflictDoUpdate({
      target: accessories.id,
      set: {
        slug: sql`excluded.slug`,
        name: sql`excluded.name`,
        kind: sql`excluded.kind`,
        priceCents: sql`excluded.price_cents`,
        stock: sql`excluded.stock`,
        imageUrl: sql`excluded.image_url`,
      },
    });
}

async function upsertProduct(tx: Tx, item: CatalogProduct) {
  await tx
    .insert(products)
    .values({
      id: item.id,
      slug: item.slug,
      name: item.name,
      brand: item.brand,
      category: item.category,
      style: item.style,
      tagline: item.tagline,
      description: item.description,
      basePriceCents: item.basePriceCents,
      status: item.status,
      isSample: item.isSample,
      isEnabled: item.isEnabled,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    })
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
        isEnabled: sql`excluded.is_enabled`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

async function upsertSpec(tx: Tx, productId: string, spec: SampleSpec) {
  await tx
    .insert(productSpecs)
    .values({ productId, ...spec })
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
}

async function upsertVariant(tx: Tx, productId: string, item: CatalogVariant) {
  await tx
    .insert(productVariants)
    .values({
      id: item.id,
      productId,
      sku: item.sku,
      colorName: item.colorName,
      colorHex: item.colorHex,
      batteryLabel: item.batteryLabel,
      priceDeltaCents: item.priceDeltaCents,
      stock: item.stock,
      active: item.active,
    })
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
}

async function upsertImages(tx: Tx, product: CatalogProduct, current: Map<string, { productId: string; variantId: string | null; url: string; alt: string; position: number; isCover: boolean }>) {
  const changed = product.images.filter((image) => !sameImage(current.get(image.id), product.id, image));
  if (changed.length === 0) return;
  const nextCover = product.images.find((image) => image.isCover)?.id ?? null;
  const previousCover = [...current.entries()].find(([, image]) => image.productId === product.id && image.isCover)?.[0] ?? null;
  if (nextCover !== previousCover) {
    await tx
      .update(productImages)
      .set({ isCover: false })
      .where(and(eq(productImages.productId, product.id), eq(productImages.isCover, true)));
  }
  for (const image of changed) {
    await tx
      .insert(productImages)
      .values({
        id: image.id,
        productId: product.id,
        variantId: image.variantId,
        url: image.url,
        alt: image.alt,
        position: image.position,
        isCover: image.isCover,
      })
      .onConflictDoUpdate({
        target: productImages.id,
        set: {
          productId: sql`excluded.product_id`,
          variantId: sql`excluded.variant_id`,
          url: sql`excluded.url`,
          alt: sql`excluded.alt`,
          position: sql`excluded.position`,
          isCover: sql`excluded.is_cover`,
        },
      });
  }
}

async function upsertLink(tx: Tx, productId: string, accessoryId: string, recommended: boolean) {
  await tx
    .insert(productAccessories)
    .values({ productId, accessoryId, recommended })
    .onConflictDoUpdate({
      target: [productAccessories.productId, productAccessories.accessoryId],
      set: { recommended: sql`excluded.recommended` },
    });
}

async function upsertDamage(tx: Tx, item: CatalogDamage) {
  await tx
    .insert(damages)
    .values({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      description: item.description,
      severity: item.severity,
      discountCents: item.discountCents,
      isPublic: item.isPublic,
      resolvedAt: item.resolvedAt ? new Date(item.resolvedAt) : null,
      createdAt: new Date(item.createdAt),
    })
    .onConflictDoUpdate({
      target: damages.id,
      set: {
        productId: sql`excluded.product_id`,
        variantId: sql`excluded.variant_id`,
        description: sql`excluded.description`,
        severity: sql`excluded.severity`,
        discountCents: sql`excluded.discount_cents`,
        isPublic: sql`excluded.public`,
        resolvedAt: sql`excluded.resolved_at`,
      },
    });
}

async function upsertDamageImage(tx: Tx, damageId: string, item: { id: string; url: string; position: number }) {
  await tx
    .insert(damageImages)
    .values({ id: item.id, damageId, url: item.url, position: item.position })
    .onConflictDoUpdate({
      target: damageImages.id,
      set: {
        damageId: sql`excluded.damage_id`,
        url: sql`excluded.url`,
        position: sql`excluded.position`,
      },
    });
}

async function deleteRemoved(tx: Tx, state: CatalogState) {
  const productIds = state.products.map((product) => product.id);
  if (productIds.length > 0) {
    const variantIds = state.products.flatMap((product) => product.variants.map((variant) => variant.id));
    const imageIds = state.products.flatMap((product) => product.images.map((image) => image.id));
    await deleteChildren(tx, productImages, productImages.productId, productImages.id, productIds, imageIds);
    await deleteChildren(tx, productVariants, productVariants.productId, productVariants.id, productIds, variantIds);

    for (const product of state.products) {
      const keep = new Set(product.accessories.map((link) => link.accessoryId));
      const links = await tx.select().from(productAccessories).where(eq(productAccessories.productId, product.id));
      for (const link of links) {
        if (keep.has(link.accessoryId)) continue;
        await tx
          .delete(productAccessories)
          .where(and(eq(productAccessories.productId, product.id), eq(productAccessories.accessoryId, link.accessoryId)));
      }
    }

    const damageIds = state.damages.filter((damage) => productIds.includes(damage.productId)).map((damage) => damage.id);
    const pictureIds = state.damages.flatMap((damage) => damage.images.map((image) => image.id));
    if (damageIds.length === 0) {
      await tx.delete(damages).where(inArray(damages.productId, productIds));
    } else {
      if (pictureIds.length === 0) await tx.delete(damageImages).where(inArray(damageImages.damageId, damageIds));
      else {
        await tx.delete(damageImages).where(and(inArray(damageImages.damageId, damageIds), notInArray(damageImages.id, pictureIds)));
      }
      await tx.delete(damages).where(and(inArray(damages.productId, productIds), notInArray(damages.id, damageIds)));
    }
  }

  const keepAccessories = new Set(state.accessories.map((item) => item.id));
  const accessoryRows = await tx.select({ id: accessories.id }).from(accessories);
  for (const row of accessoryRows) {
    if (keepAccessories.has(row.id)) continue;
    const links = await tx.select({ accessoryId: productAccessories.accessoryId }).from(productAccessories).where(eq(productAccessories.accessoryId, row.id));
    if (links.length > 0) continue;
    await tx.delete(accessories).where(eq(accessories.id, row.id));
  }
}

async function deleteChildren(
  tx: Tx,
  table: typeof productImages | typeof productVariants,
  productColumn: typeof productImages.productId | typeof productVariants.productId,
  idColumn: typeof productImages.id | typeof productVariants.id,
  productIds: string[],
  keepIds: string[],
) {
  if (keepIds.length === 0) {
    await tx.delete(table).where(inArray(productColumn, productIds));
    return;
  }
  await tx.delete(table).where(and(inArray(productColumn, productIds), notInArray(idColumn, keepIds)));
}
