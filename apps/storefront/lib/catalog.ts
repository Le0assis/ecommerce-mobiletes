/**
 * Leitura da vitrine.
 *
 * Modelos, preço de tabela, selo, amostra e avaria vêm de `GET /v1/products`.
 * Pix, boleto, parcela e a prévia de frete usam as funções de `@lume/domain`
 * em cima desses números. A vitrine não inventa centavo e, se a API não
 * responde, não abre o catálogo gravado no código.
 */
import {
  applyDiscount,
  BOLETO_DISCOUNT_BPS,
  PIX_DISCOUNT_BPS,
  registrationLabel,
  registrationNote,
  type Category,
  type RegistrationClass,
} from "@lume/domain";
import { cache } from "react";

export {
  amountForMethod,
  estimateFuelSavings,
  formatBRL,
  formatCep,
  installmentByCount,
  LAUNCH_INTEREST_FREE_UP_TO,
  quoteShipping,
  simulateInstallments,
} from "@lume/domain";

export { applyDiscount, BOLETO_DISCOUNT_BPS, PIX_DISCOUNT_BPS };

export type { Category, QuizAnswers } from "@lume/domain";

const unavailable = "A vitrine não alcançou o catálogo. Confira se a API está no ar.";
const malformed = "O catálogo veio num formato que a vitrine não lê.";

export type CatalogOrder = "destaque" | "preco" | "preco-desc" | "velocidade";

export type StoreColor = {
  id: string;
  name: string;
  hex: string;
  priceDeltaCents: number;
  stock: number;
};

export type StoreBattery = {
  id: string;
  name: string;
  kwh: number;
  rangeKm: number;
  priceDeltaCents: number;
  stock: number;
};

export type StoreAccessory = {
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

export type StoreDamage = {
  id: string;
  variantId: string | null;
  description: string;
  severity: "leve" | "moderada" | "grave";
  discountCents: number;
  images: { id: string; url: string; position: number }[];
};

export type StoreImage = {
  id: string;
  variantId: string | null;
  url: string;
  alt: string;
  position: number;
  isCover: boolean;
};

export type StoreSpecs = {
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

export type StoreBadge = {
  eligible: boolean;
  label: string | null;
  notice: string;
  missing: string[];
};

export type StoreProduct = {
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
  isEnabled?: boolean;
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
  colors: StoreColor[];
  batteries: StoreBattery[];
  accessoryIds: string[];
  specs: StoreSpecs;
  variants: unknown[];
  accessories: StoreAccessory[];
  damages: StoreDamage[];
  images: StoreImage[];
  autopropelido: StoreBadge;
};

export type StoreReview = {
  id: string;
  productSlug: string;
  city: string;
  rating: number;
  title: string;
  body: string;
  monthsUsing: number;
  photo?: string;
};

export type ProductDetail = {
  product: StoreProduct;
  accessories: StoreAccessory[];
  reviews: StoreReview[];
};

export type CatalogLoad<T> = { ok: true; data: T } | { ok: false; notFound?: boolean; message: string };

export type LineQuote = {
  product: StoreProduct;
  color: StoreColor | null;
  battery: StoreBattery | null;
  accessories: StoreAccessory[];
  lines: { label: string; cents: number }[];
  subtotalCents: number;
  pixCents: number;
  boletoCents: number;
  weightKg: number | null;
};

const orders: CatalogOrder[] = ["destaque", "preco", "preco-desc", "velocidade"];

const categoryNames: Record<string, string> = {
  mobilete: "Mobilete",
  scooter: "Scooter",
  naked: "Naked",
  adventure: "Adventure",
  sport: "Sport",
  citycoco: "Citycoco",
};

export function isCatalogOrder(value: string | undefined): value is CatalogOrder {
  return orders.some((item) => item === value);
}

export function categoryName(category: string): string {
  return categoryNames[category] ?? category;
}

export function illustrationCategory(category: string): Category {
  if (category === "mobilete" || category === "scooter" || category === "naked" || category === "adventure" || category === "sport") {
    return category;
  }
  return "scooter";
}

export function registrationCopy(value: string | null): { label: string; note: string | null } {
  if (value === "autopropelido" || value === "ciclomotor" || value === "moto") {
    const key = value as RegistrationClass;
    return { label: registrationLabel[key], note: registrationNote[key] };
  }
  return { label: value && value.trim() ? value : "não informado", note: null };
}

export function measure(value: number | null | undefined, suffix: string): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "não informado";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)} ${suffix}`;
}

function fold(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR");
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isProduct(value: unknown): value is StoreProduct {
  if (!value || typeof value !== "object") return false;
  const item = value as StoreProduct;
  const badge = item.autopropelido;
  return (
    typeof item.id === "string" &&
    typeof item.slug === "string" &&
    typeof item.name === "string" &&
    typeof item.brand === "string" &&
    typeof item.category === "string" &&
    typeof item.basePriceCents === "number" &&
    Number.isInteger(item.basePriceCents) &&
    typeof item.isSample === "boolean" &&
    (item.isEnabled === undefined || typeof item.isEnabled === "boolean") &&
    isNumberOrNull(item.rangeKm) &&
    Array.isArray(item.colors) &&
    Array.isArray(item.batteries) &&
    Array.isArray(item.accessoryIds) &&
    Array.isArray(item.accessories) &&
    Array.isArray(item.damages) &&
    Array.isArray(item.images) &&
    !!item.specs &&
    !!badge &&
    typeof badge.eligible === "boolean" &&
    (badge.label === null || typeof badge.label === "string") &&
    typeof badge.notice === "string" &&
    Array.isArray(badge.missing)
  );
}

function apiBase() {
  return process.env.COMMERCE_API_URL ?? "http://127.0.0.1:8787";
}

async function readJson(path: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${apiBase()}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  const body = (await response.json().catch(() => null)) as unknown;
  return { status: response.status, body };
}

export const loadProducts = cache(async (): Promise<CatalogLoad<StoreProduct[]>> => {
  try {
    const { status, body } = await readJson("/v1/products");
    if (status !== 200 || !body || typeof body !== "object" || !Array.isArray((body as { products?: unknown }).products)) {
      return { ok: false, message: status === 200 ? malformed : unavailable };
    }
    const raw = (body as { products: unknown[] }).products;
    const parsed = raw.filter(isProduct);
    if (parsed.length !== raw.length) return { ok: false, message: malformed };
    return { ok: true, data: parsed.filter((item) => item.isEnabled !== false) };
  } catch {
    return { ok: false, message: unavailable };
  }
});

export const loadProduct = cache(async (slug: string): Promise<CatalogLoad<ProductDetail>> => {
  try {
    const { status, body } = await readJson(`/v1/products/${encodeURIComponent(slug)}`);
    if (status === 404) return { ok: false, notFound: true, message: "Modelo não encontrado." };
    if (status !== 200 || !body || typeof body !== "object") return { ok: false, message: unavailable };
    const payload = body as { product?: unknown; accessories?: unknown; reviews?: unknown };
    if (!isProduct(payload.product) || !Array.isArray(payload.reviews)) return { ok: false, message: malformed };
    return {
      ok: true,
      data: {
        product: payload.product,
        accessories: Array.isArray(payload.accessories) ? (payload.accessories as StoreAccessory[]) : payload.product.accessories,
        reviews: payload.reviews as StoreReview[],
      },
    };
  } catch {
    return { ok: false, message: unavailable };
  }
});

export const loadReviews = cache(async (): Promise<CatalogLoad<StoreReview[]>> => {
  try {
    const { status, body } = await readJson("/v1/reviews");
    if (status !== 200 || !body || typeof body !== "object" || !Array.isArray((body as { reviews?: unknown }).reviews)) {
      return { ok: false, message: "Os relatos não carregaram." };
    }
    return { ok: true, data: (body as { reviews: StoreReview[] }).reviews };
  } catch {
    return { ok: false, message: "Os relatos não carregaram." };
  }
});

export function filterProducts(
  list: StoreProduct[],
  query: { q?: string; category?: string; brand?: string },
): StoreProduct[] {
  const q = query.q ? fold(query.q.trim()) : "";
  const brand = query.brand ? fold(query.brand.trim()) : "";
  return list.filter((item) => {
    if (query.category && item.category !== query.category) return false;
    if (brand && fold(item.brand) !== brand) return false;
    if (!q) return true;
    const haystack = fold(
      [item.name, item.brand, item.tagline, item.category, categoryName(item.category), item.description, item.registrationClass ?? ""].join(" "),
    );
    return haystack.includes(q);
  });
}

export function sortProducts(list: StoreProduct[], order: string | undefined): StoreProduct[] {
  const next = [...list];
  if (order === "preco") next.sort((a, b) => a.basePriceCents - b.basePriceCents);
  if (order === "preco-desc") next.sort((a, b) => b.basePriceCents - a.basePriceCents);
  if (order === "velocidade") {
    next.sort((a, b) => (b.topSpeedKmh ?? -1) - (a.topSpeedKmh ?? -1));
  }
  return next;
}

export function relatedProducts(list: StoreProduct[], product: StoreProduct, limit = 3): StoreProduct[] {
  return list
    .filter((item) => item.id !== product.id)
    .map((item) => ({
      item,
      score: (item.category === product.category ? 3 : 0) + (Math.abs(item.basePriceCents - product.basePriceCents) < 1_500_000 ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.item.basePriceCents - b.item.basePriceCents)
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function productBrands(list: StoreProduct[]): string[] {
  return [...new Set(list.map((item) => item.brand))];
}

export function productCategories(list: StoreProduct[]): { id: string; label: string }[] {
  const ids = [...new Set(list.map((item) => item.category))];
  return ids.map((id) => ({ id, label: categoryName(id) }));
}

export function coverImage(product: StoreProduct): StoreImage | undefined {
  return product.images.find((item) => item.isCover) ?? [...product.images].sort((a, b) => a.position - b.position)[0];
}

/** Preço de vitrine a partir da ficha da API. Lista de bateria vazia entra com delta zero. */
export function priceProduct(
  product: StoreProduct,
  input: { colorId?: string; batteryId?: string; accessoryIds?: string[] } = {},
): { quote: LineQuote } | { error: string } {
  const color = input.colorId ? product.colors.find((item) => item.id === input.colorId) : (product.colors.find((item) => item.stock > 0) ?? product.colors[0]);
  if (input.colorId && !color) return { error: "Essa cor não existe neste modelo." };
  if (color && input.colorId && color.stock <= 0) return { error: `${color.name} está esgotada na ${product.name}.` };

  const chosen: StoreAccessory[] = [];
  for (const id of [...new Set(input.accessoryIds ?? [])]) {
    const accessory = product.accessories.find((item) => item.id === id);
    if (!accessory || !product.accessoryIds.includes(id)) return { error: "Esse acessório não encaixa neste modelo." };
    chosen.push(accessory);
  }

  let battery: StoreBattery | null = null;
  if (product.batteries.length > 0) {
    const wanted = input.batteryId ?? product.batteries[0]?.id;
    battery = product.batteries.find((item) => item.id === wanted) ?? null;
    if (!battery) return { error: "Essa bateria não existe neste modelo." };
    if (battery.stock <= 0) return { error: `${battery.name} está esgotada na ${product.name}.` };
  }

  const colorCents = color?.priceDeltaCents ?? 0;
  const batteryCents = battery?.priceDeltaCents ?? 0;
  const accessoriesCents = chosen.reduce((sum, item) => sum + item.priceCents, 0);
  const subtotalCents = product.basePriceCents + colorCents + batteryCents + accessoriesCents;
  const lines = [
    { label: product.name, cents: product.basePriceCents },
    ...(color && colorCents ? [{ label: `Cor ${color.name}`, cents: colorCents }] : []),
    ...(battery && batteryCents ? [{ label: `Bateria ${battery.name}`, cents: batteryCents }] : []),
    ...chosen.map((item) => ({ label: item.name, cents: item.priceCents })),
  ];

  return {
    quote: {
      product,
      color: color ?? null,
      battery,
      accessories: chosen,
      lines,
      subtotalCents,
      pixCents: applyDiscount(subtotalCents, PIX_DISCOUNT_BPS),
      boletoCents: applyDiscount(subtotalCents, BOLETO_DISCOUNT_BPS),
      weightKg: product.weightKg,
    },
  };
}
