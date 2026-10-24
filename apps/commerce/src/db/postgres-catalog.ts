import type { Database } from "./client";
import {
  CatalogUnavailable,
  createCatalog,
  type Catalog,
  type CatalogAccessory,
  type CatalogDamage,
  type CatalogImage,
  type CatalogProduct,
  type CatalogState,
  type CatalogVariant,
  type DamageImage,
  type ProductCategory,
  type ProductStatus,
  type ProductStyle,
} from "../catalog-store";
import { flushCatalog } from "./catalog-flush";
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

/**
 * O cadastro de produto vive no Postgres. Cada escrita relê e faz upsert por linha
 * na mesma transação. Não apaga produto nem `product_colors`. Banners ficam na
 * memória do processo. O mutex é do processo; dois processos no mesmo banco
 * ainda podem se atropelar.
 */
export function createPostgresCatalog(
  db: Database,
  options: { now?: () => Date; bannerOverrides?: Map<string, boolean> } = {},
): Catalog {
  const memory = createCatalog({
    now: options.now,
    bannerOverrides: options.bannerOverrides,
    seedProducts: false,
    seedAccessories: false,
  });
  let chain: Promise<void> = Promise.resolve();

  function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function load() {
    memory.importState(await readState(db));
  }

  async function save() {
    await writeState(db, memory.exportState());
  }

  async function work<T>(fn: () => T | Promise<T>, persist: boolean): Promise<T> {
    return exclusive(async () => {
      try {
        await load();
        const result = await fn();
        if (persist) await save();
        return result;
      } catch (error) {
        if (error instanceof CatalogUnavailable) throw error;
        console.error(
          JSON.stringify({
            msg: "catalogo_indisponivel",
            message: error instanceof Error ? error.message : "falha",
          }),
        );
        throw new CatalogUnavailable();
      }
    });
  }

  return {
    listProducts: (query) => work(() => memory.listProducts(query), false),
    getProduct: (id) => work(() => memory.getProduct(id), false),
    findProduct: (idOrSlug) => work(() => memory.findProduct(idOrSlug), false),
    productBySlug: (slug) => work(() => memory.productBySlug(slug), false),
    publicBySlug: (slug) => work(() => memory.publicBySlug(slug), false),
    publicList: (input) => work(() => memory.publicList(input), false),
    createProduct: (draft) => work(() => memory.createProduct(draft), true),
    updateProduct: (id, patch) => work(() => memory.updateProduct(id, patch), true),
    archiveProduct: (id) => work(() => memory.archiveProduct(id), true),
    duplicateProduct: (id) => work(() => memory.duplicateProduct(id), true),
    addVariant: (productId, input) => work(() => memory.addVariant(productId, input), true),
    updateVariant: (productId, variantId, patch) => work(() => memory.updateVariant(productId, variantId, patch), true),
    removeVariant: (productId, variantId) => work(() => memory.removeVariant(productId, variantId), true),
    addImage: (productId, input) => work(() => memory.addImage(productId, input), true),
    reorderImages: (productId, order) => work(() => memory.reorderImages(productId, order), true),
    removeImage: (productId, imageId) => work(() => memory.removeImage(productId, imageId), true),
    listAccessories: () => work(() => memory.listAccessories(), false),
    createAccessory: (input) => work(() => memory.createAccessory(input), true),
    updateAccessory: (id, patch) => work(() => memory.updateAccessory(id, patch), true),
    removeAccessory: (id) => work(() => memory.removeAccessory(id), true),
    listDamages: () => work(() => memory.listDamages(), false),
    createDamage: (input) => work(() => memory.createDamage(input), true),
    updateDamage: (id, patch) => work(() => memory.updateDamage(id, patch), true),
    removeDamage: (id) => work(() => memory.removeDamage(id), true),
    listBanners: () => Promise.resolve(memory.listBanners()),
    createBanner: (input) => Promise.resolve(memory.createBanner(input)),
    updateBanner: (id, patch) => Promise.resolve(memory.updateBanner(id, patch)),
    removeBanner: (id) => Promise.resolve(memory.removeBanner(id)),
  };
}

function num(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function flag(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1 || value === "1";
}

function flagOrNull(value: unknown): boolean | null {
  if (value == null) return null;
  return flag(value);
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  return iso(value);
}

function statusOf(value: string): ProductStatus {
  if (value === "ativo" || value === "arquivado" || value === "rascunho") return value;
  return "rascunho";
}

function categoryOf(value: string): ProductCategory {
  if (value === "scooter" || value === "mobilete" || value === "citycoco") return value;
  return "scooter";
}

function styleOf(value: string): ProductStyle {
  if (value === "retro" || value === "citycoco" || value === "esportivo") return value;
  return "retro";
}

function severityOf(value: string): CatalogDamage["severity"] {
  if (value === "leve" || value === "moderada" || value === "grave") return value;
  return "leve";
}

function specsFrom(row: {
  powerNominalW: unknown;
  powerPeakW: unknown;
  topSpeedKmh: unknown;
  widthCm: unknown;
  wheelbaseCm: unknown;
  weightKg: unknown;
  seatHeightMm: unknown;
  batteryV: unknown;
  batteryAh: unknown;
  batteryChem: string | null;
  batteryRemovable: unknown;
  chargeHours: unknown;
  rangeKmDeclared: unknown;
  hasSpeedLimiter: unknown;
  hasBell: unknown;
  hasLights: unknown;
}): SampleSpec {
  return {
    powerNominalW: num(row.powerNominalW),
    powerPeakW: num(row.powerPeakW),
    topSpeedKmh: num(row.topSpeedKmh),
    widthCm: num(row.widthCm),
    wheelbaseCm: num(row.wheelbaseCm),
    weightKg: num(row.weightKg),
    seatHeightMm: num(row.seatHeightMm),
    batteryV: num(row.batteryV),
    batteryAh: num(row.batteryAh),
    batteryChem: row.batteryChem,
    batteryRemovable: flagOrNull(row.batteryRemovable),
    chargeHours: num(row.chargeHours),
    rangeKmDeclared: num(row.rangeKmDeclared),
    hasSpeedLimiter: flagOrNull(row.hasSpeedLimiter),
    hasBell: flagOrNull(row.hasBell),
    hasLights: flagOrNull(row.hasLights),
  };
}

async function readState(db: Database): Promise<CatalogState> {
  const [productRows, specRows, variantRows, imageRows, accessoryRows, linkRows, damageRows, damageImageRows] = await Promise.all([
    db.select().from(products),
    db.select().from(productSpecs),
    db.select().from(productVariants),
    db.select().from(productImages),
    db.select().from(accessories),
    db.select().from(productAccessories),
    db.select().from(damages),
    db.select().from(damageImages),
  ]);

  const specs = new Map(specRows.map((row) => [row.productId, row]));
  const variants = group(variantRows);
  const images = group(imageRows);
  const links = group(linkRows);
  const pictures = new Map<string, DamageImage[]>();
  for (const row of damageImageRows) {
    const list = pictures.get(row.damageId) ?? [];
    list.push({ id: row.id, url: row.url, position: row.position });
    pictures.set(row.damageId, list);
  }

  const state: CatalogState = {
    products: productRows.map((row) => {
      const spec = specs.get(row.id);
      const product: CatalogProduct = {
        id: row.id,
        slug: row.slug,
        name: row.name,
        brand: row.brand,
        category: categoryOf(row.category),
        style: styleOf(row.style),
        tagline: row.tagline,
        description: row.description,
        basePriceCents: row.basePriceCents,
        status: statusOf(row.status),
        isSample: flag(row.isSample),
        isEnabled: flag(row.isEnabled),
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        specs: spec
          ? specsFrom(spec)
          : {
              powerNominalW: null,
              powerPeakW: null,
              topSpeedKmh: null,
              widthCm: null,
              wheelbaseCm: null,
              weightKg: null,
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
            },
        variants: (variants.get(row.id) ?? []).map(
          (item): CatalogVariant => ({
            id: item.id,
            sku: item.sku,
            colorName: item.colorName,
            colorHex: item.colorHex,
            batteryLabel: item.batteryLabel,
            priceDeltaCents: item.priceDeltaCents,
            stock: item.stock,
            active: flag(item.active),
          }),
        ),
        images: (images.get(row.id) ?? [])
          .map(
            (item): CatalogImage => ({
              id: item.id,
              variantId: item.variantId,
              url: item.url,
              alt: item.alt,
              position: item.position,
              isCover: flag(item.isCover),
            }),
          )
          .sort((a, b) => a.position - b.position),
        accessories: (links.get(row.id) ?? []).map((item) => ({
          accessoryId: item.accessoryId,
          recommended: flag(item.recommended),
        })),
      };
      return product;
    }),
    accessories: accessoryRows.map(
      (row): CatalogAccessory => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        kind: row.kind,
        priceCents: row.priceCents,
        stock: row.stock,
        imageUrl: row.imageUrl,
      }),
    ),
    damages: damageRows.map(
      (row): CatalogDamage => ({
        id: row.id,
        productId: row.productId,
        variantId: row.variantId,
        description: row.description,
        severity: severityOf(row.severity),
        discountCents: row.discountCents,
        isPublic: flag(row.isPublic),
        resolvedAt: isoOrNull(row.resolvedAt),
        createdAt: iso(row.createdAt),
        images: (pictures.get(row.id) ?? []).sort((a, b) => a.position - b.position),
      }),
    ),
  };
  return state;
}

function group<T extends { productId: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.productId) ?? [];
    list.push(row);
    map.set(row.productId, list);
  }
  return map;
}

async function writeState(db: Database, state: CatalogState) {
  await flushCatalog(db, state);
}
