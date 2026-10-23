import {
  autopropelidoBadge,
  packsFor,
  specsForAutopropelido,
  accessories as domainAccessories,
  type AutopropelidoBadge,
  type Motorcycle,
} from "@lume/domain";
import type { CatalogAccessory, CatalogDamage, CatalogProduct } from "./catalog-store";

export type PublicSpecs = {
  powerNominalW: number | null;
  powerPeakW: number | null;
  topSpeedKmh: number | null;
  widthCm: number | null;
  wheelbaseCm: number | null;
  weightKg: number | null;
  seatHeightMm: number | null;
  batteryV: number | null;
  batteryAh: number | null;
  batteryChem: string | null;
  batteryRemovable: boolean | null;
  chargeHours: number | null;
  rangeKmDeclared: number | null;
  hasSpeedLimiter: boolean | null;
  hasBell: boolean | null;
  hasLights: boolean | null;
};

export type PublicVariant = {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  batteryLabel: string | null;
  priceDeltaCents: number;
  stock: number;
  active: boolean;
};

export type PublicAccessory = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  priceCents: number;
  description: string;
  imageUrl: string | null;
  stock: number | null;
  recommended: boolean;
};

export type PublicDamage = {
  id: string;
  variantId: string | null;
  description: string;
  severity: "leve" | "moderada" | "grave";
  discountCents: number;
  images: { id: string; url: string; position: number }[];
};

export type PublicImage = {
  id: string;
  variantId: string | null;
  url: string;
  alt: string;
  position: number;
  isCover: boolean;
};

export type PublicColor = {
  id: string;
  name: string;
  hex: string;
  priceDeltaCents: number;
  stock: number;
};

export type PublicBattery = {
  id: string;
  name: string;
  kwh: number;
  rangeKm: number;
  priceDeltaCents: number;
  stock: number;
};

/** Forma única de `GET /v1/products` e `GET /v1/products/:slug`. */
export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  style: "retro" | "citycoco" | "esportivo" | null;
  tagline: string;
  description: string;
  basePriceCents: number;
  isSample: boolean;
  rangeKm: number | null;
  topSpeedKmh: number | null;
  powerKw: number | null;
  powerNominalW: number | null;
  widthCm: number | null;
  wheelbaseCm: number | null;
  torqueNm: number | null;
  batteryKwh: number | null;
  weightKg: number | null;
  seatHeightMm: number | null;
  chargeHours: number | null;
  fastChargeMin: number | null;
  registrationClass: string | null;
  licenseNote: string | null;
  optimalSpeedKmh: number | null;
  colors: PublicColor[];
  batteries: PublicBattery[];
  accessoryIds: string[];
  specs: PublicSpecs;
  variants: PublicVariant[];
  accessories: PublicAccessory[];
  damages: PublicDamage[];
  images: PublicImage[];
  autopropelido: AutopropelidoBadge;
};

type ManagedProduct = CatalogProduct & {
  damages: CatalogDamage[];
  autopropelido: AutopropelidoBadge;
};

const emptySpecs = (): PublicSpecs => ({
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
});

function publicDamage(damage: CatalogDamage): PublicDamage {
  return {
    id: damage.id,
    variantId: damage.variantId,
    description: damage.description,
    severity: damage.severity,
    discountCents: damage.discountCents,
    images: damage.images.map((image) => ({ id: image.id, url: image.url, position: image.position })),
  };
}

export function publicDomainProduct(product: Motorcycle): PublicProduct {
  const specs: PublicSpecs = {
    ...emptySpecs(),
    powerNominalW: product.powerNominalW ?? null,
    powerPeakW: Number.isFinite(product.powerKw) ? Math.round(product.powerKw * 1000) : null,
    topSpeedKmh: product.topSpeedKmh,
    widthCm: product.widthCm ?? null,
    wheelbaseCm: product.wheelbaseCm ?? null,
    weightKg: product.weightKg,
    seatHeightMm: product.seatHeightMm,
    chargeHours: product.chargeHours,
    rangeKmDeclared: product.rangeKm,
  };
  const linked = new Set(product.accessoryIds);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    style: null,
    tagline: product.tagline,
    description: product.description,
    basePriceCents: product.basePriceCents,
    isSample: false,
    rangeKm: product.rangeKm,
    topSpeedKmh: product.topSpeedKmh,
    powerKw: product.powerKw,
    powerNominalW: product.powerNominalW ?? null,
    widthCm: product.widthCm ?? null,
    wheelbaseCm: product.wheelbaseCm ?? null,
    torqueNm: product.torqueNm,
    batteryKwh: product.batteryKwh,
    weightKg: product.weightKg,
    seatHeightMm: product.seatHeightMm,
    chargeHours: product.chargeHours,
    fastChargeMin: product.fastChargeMin,
    registrationClass: product.registrationClass,
    licenseNote: product.licenseNote,
    optimalSpeedKmh: product.optimalSpeedKmh,
    colors: product.colors.map((color) => ({ ...color })),
    batteries: packsFor(product).map((battery) => ({ ...battery })),
    accessoryIds: [...product.accessoryIds],
    specs,
    variants: product.colors.map((color) => ({
      id: color.id,
      sku: `${product.slug}-${color.id}`,
      colorName: color.name,
      colorHex: color.hex,
      batteryLabel: null,
      priceDeltaCents: color.priceDeltaCents,
      stock: color.stock,
      active: true,
    })),
    accessories: domainAccessories
      .filter((item) => linked.has(item.id))
      .map((item) => ({
        id: item.id,
        slug: item.id,
        name: item.name,
        kind: item.group,
        priceCents: item.priceCents,
        description: item.description,
        imageUrl: null,
        stock: null,
        recommended: false,
      })),
    damages: [],
    images: [],
    autopropelido: autopropelidoBadge(specsForAutopropelido(product)),
  };
}

export function publicCatalogProduct(product: ManagedProduct, catalogAccessories: readonly CatalogAccessory[]): PublicProduct {
  const byId = new Map(catalogAccessories.map((item) => [item.id, item]));
  const accessories = product.accessories.flatMap((link) => {
    const item = byId.get(link.accessoryId);
    if (!item) return [];
    return [
      {
        id: item.id,
        slug: item.slug,
        name: item.name,
        kind: item.kind,
        priceCents: item.priceCents,
        description: "",
        imageUrl: item.imageUrl,
        stock: item.stock,
        recommended: link.recommended,
      },
    ];
  });
  const colors = product.variants.map((variant) => ({
    id: variant.id,
    name: variant.colorName,
    hex: variant.colorHex,
    priceDeltaCents: variant.priceDeltaCents,
    stock: variant.stock,
  }));
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    style: product.style,
    tagline: product.tagline,
    description: product.description,
    basePriceCents: product.basePriceCents,
    isSample: product.isSample,
    rangeKm: product.specs.rangeKmDeclared,
    topSpeedKmh: product.specs.topSpeedKmh,
    powerKw: product.specs.powerPeakW == null ? null : product.specs.powerPeakW / 1000,
    powerNominalW: product.specs.powerNominalW,
    widthCm: product.specs.widthCm,
    wheelbaseCm: product.specs.wheelbaseCm,
    torqueNm: null,
    batteryKwh: null,
    weightKg: product.specs.weightKg,
    seatHeightMm: product.specs.seatHeightMm,
    chargeHours: product.specs.chargeHours,
    fastChargeMin: null,
    registrationClass: null,
    licenseNote: null,
    optimalSpeedKmh: null,
    colors,
    batteries: [],
    accessoryIds: product.accessories.map((link) => link.accessoryId),
    specs: { ...product.specs },
    variants: product.variants.map((variant) => ({ ...variant })),
    accessories,
    damages: product.damages.filter((item) => item.isPublic && !item.resolvedAt).map(publicDamage),
    images: product.images.map((image) => ({ ...image })),
    autopropelido: product.autopropelido,
  };
}
