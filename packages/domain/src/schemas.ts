import { z } from "zod";

/** https com host, ou caminho do site que começa com uma única barra. */
export function isSafePublicUrl(value: string) {
  if (!value || value.length > 500 || /[\u0000-\u001F\u007F\\]/.test(value)) return false;
  if (value.startsWith("//")) return false;
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.length > 0;
  } catch {
    return false;
  }
}

const safeUrlMessage = "Use https ou um caminho que comece com /.";

function safeUrl(max: number) {
  return z.string().trim().min(1).max(max).refine(isSafePublicUrl, { message: safeUrlMessage });
}

export const configureBody = z.object({
  productId: z.string().min(1),
  colorId: z.string().min(1),
  accessoryIds: z.array(z.string()).max(8).default([]),
});

export const installmentsBody = z.object({
  amountCents: z.number().int().positive(),
  max: z.number().int().min(1).max(21).optional(),
});

export const shippingBody = z.object({
  cep: z.string().min(8).max(12),
  weightKg: z.number().positive().max(400),
});

export const rangeBody = z.object({
  productId: z.string().min(1),
  speedKmh: z.number().min(10).max(220),
  extraWeightKg: z.number().min(0).max(150),
  mode: z.enum(["eco", "cidade", "esporte"]),
});

export const quizBody = z.object({
  use: z.enum(["trabalho", "entregas", "passeio", "crianca"]),
  dailyKm: z.enum(["ate20", "20a40", "40a70", "mais70"]),
  hills: z.boolean(),
  charging: z.enum(["tomada", "removivel"]),
  carry: z.enum(["sozinho", "passageiro", "crianca", "pet"]),
  cargo: z.enum(["bau", "cesta", "nenhum"]),
  budget: z.enum(["ate6", "6a10", "mais10"]),
  style: z.enum(["retro", "citycoco", "esportivo"]),
  color: z.enum(["escura", "clara", "quente", "indiferente"]),
});

export const testRideBody = z.object({
  productId: z.string().min(1),
  dealerId: z.string().min(1),
  name: z.string().trim().min(3).max(80),
  email: z.email(),
  phone: z.string().trim().min(10).max(20),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const cartLineBody = z.object({
  productId: z.string().min(1),
  colorId: z.string().min(1),
  accessoryIds: z.array(z.string()).max(8).default([]),
  batteryId: z.string().min(1).optional(),
  qty: z.number().int().min(1).max(2).default(1),
});

export const checkoutBody = z.object({
  lines: z.array(cartLineBody).min(1).max(5),
  cep: z.string().min(8).max(12),
  shippingServiceId: z.enum(["dedicado"]),
  method: z.enum(["pix", "boleto", "cartao"]),
  installments: z.number().int().min(1).max(21).default(1),
  couponCode: z.string().trim().max(20).optional(),
  customer: z.object({
    name: z.string().trim().min(3).max(80),
    email: z.email(),
    phone: z.string().trim().min(10).max(20),
  }),
});

export const reviewBody = z.object({
  productId: z.string().min(1),
  city: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(10).max(800),
});

export const serviceBody = z.object({
  dealerId: z.string().min(1),
  productId: z.string().min(1),
  name: z.string().trim().min(3).max(80),
  email: z.email(),
  phone: z.string().trim().min(10).max(20),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().min(8).max(400),
});

export const tradeInBody = z.object({
  name: z.string().trim().min(3).max(80),
  email: z.email(),
  phone: z.string().trim().min(10).max(20),
  brand: z.string().trim().min(2).max(40),
  model: z.string().trim().min(1).max(60),
  year: z.number().int().min(1990).max(2030),
  km: z.number().int().min(0).max(500_000),
  city: z.string().trim().min(2).max(60),
});

export const authRequestBody = z.object({
  email: z.email(),
});

export const authVerifyBody = z.object({
  email: z.email(),
  code: z.string().trim().min(4).max(40),
});

/** Texto do 400 quando a medida da ficha é negativa. */
export const NEGATIVE_MEASURE_MESSAGE = "O valor não pode ser negativo";

/** Tetos da ficha. Zero entra. Vazio chega como null. Decimal entra (32.5). */
export const SPEC_LIMITS = {
  powerNominalW: { max: 20_000, maxMessage: "A potência nominal vai até 20000 W." },
  powerPeakW: { max: 20_000, maxMessage: "A potência de pico vai até 20000 W." },
  topSpeedKmh: { max: 150, maxMessage: "A velocidade vai até 150 km/h." },
  widthCm: { max: 300, maxMessage: "A largura vai até 300 cm." },
  wheelbaseCm: { max: 400, maxMessage: "O entre-eixos vai até 400 cm." },
  weightKg: { max: 1_000, maxMessage: "O peso vai até 1000 kg." },
  seatHeightMm: { max: 1_500, maxMessage: "A altura do banco vai até 1500 mm." },
  batteryV: { max: 200, maxMessage: "A bateria vai até 200 V." },
  batteryAh: { max: 500, maxMessage: "A bateria vai até 500 Ah." },
  chargeHours: { max: 48, maxMessage: "A carga vai até 48 h." },
  rangeKmDeclared: { max: 1_000, maxMessage: "A autonomia declarada vai até 1000 km." },
} as const;

export type SpecField = keyof typeof SPEC_LIMITS;

function boundedMeasure(field: SpecField) {
  const limit = SPEC_LIMITS[field];
  return z.number().min(0, NEGATIVE_MEASURE_MESSAGE).max(limit.max, limit.maxMessage).nullable();
}

export const productSpecsBody = z.object({
  powerNominalW: boundedMeasure("powerNominalW").optional(),
  powerPeakW: boundedMeasure("powerPeakW").optional(),
  topSpeedKmh: boundedMeasure("topSpeedKmh").optional(),
  widthCm: boundedMeasure("widthCm").optional(),
  wheelbaseCm: boundedMeasure("wheelbaseCm").optional(),
  weightKg: boundedMeasure("weightKg").optional(),
  seatHeightMm: boundedMeasure("seatHeightMm").optional(),
  batteryV: boundedMeasure("batteryV").optional(),
  batteryAh: boundedMeasure("batteryAh").optional(),
  batteryChem: z.string().trim().max(40).nullable().optional(),
  batteryRemovable: z.boolean().nullable().optional(),
  chargeHours: boundedMeasure("chargeHours").optional(),
  rangeKmDeclared: boundedMeasure("rangeKmDeclared").optional(),
  hasSpeedLimiter: z.boolean().nullable().optional(),
  hasBell: z.boolean().nullable().optional(),
  hasLights: z.boolean().nullable().optional(),
});

export const adminProductBody = z.object({
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(80),
  brand: z.string().trim().min(1).max(40),
  category: z.enum(["scooter", "mobilete", "citycoco"]),
  style: z.enum(["retro", "citycoco", "esportivo"]),
  tagline: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  basePriceCents: z.number().int().nonnegative(),
  status: z.enum(["rascunho", "ativo", "arquivado"]).optional(),
  isSample: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  specs: productSpecsBody.optional(),
  accessories: z
    .array(z.object({ accessoryId: z.string().min(1), recommended: z.boolean().default(false) }))
    .max(40)
    .optional(),
});

export const adminProductPatchBody = adminProductBody.partial();

export const adminVariantBody = z.object({
  sku: z.string().trim().min(1).max(40),
  colorName: z.string().trim().min(1).max(40),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  batteryLabel: z.string().trim().max(80).nullable().optional(),
  priceDeltaCents: z.number().int().nonnegative().default(0),
  stock: z.number().int().nonnegative().default(0),
  active: z.boolean().default(true),
});

export const adminVariantPatchBody = z.object({
  sku: z.string().trim().min(1).max(40).optional(),
  colorName: z.string().trim().min(1).max(40).optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  batteryLabel: z.string().trim().max(80).nullable().optional(),
  priceDeltaCents: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export const adminImageBody = z.object({
  url: safeUrl(500),
  alt: z.string().trim().max(160).default(""),
  variantId: z.string().min(1).nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  isCover: z.boolean().optional(),
});

export const adminImageOrderBody = z.object({
  images: z
    .array(
      z.object({
        id: z.string().min(1),
        position: z.number().int().nonnegative(),
        isCover: z.boolean().optional(),
      }),
    )
    .min(1),
});

export const adminAccessoryBody = z.object({
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(1).max(80),
  kind: z.string().trim().min(1).max(40),
  priceCents: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  imageUrl: safeUrl(500).nullable().optional(),
});

export const adminAccessoryPatchBody = z.object({
  slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  kind: z.string().trim().min(1).max(40).optional(),
  priceCents: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  imageUrl: safeUrl(500).nullable().optional(),
});

export const adminDamageBody = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullable().optional(),
  description: z.string().trim().min(3).max(500),
  severity: z.enum(["leve", "moderada", "grave"]),
  discountCents: z.number().int().nonnegative().default(0),
  isPublic: z.boolean().default(false),
  resolvedAt: z.string().datetime().nullable().optional(),
  images: z
    .array(z.object({ url: safeUrl(500), position: z.number().int().nonnegative().optional() }))
    .max(8)
    .optional(),
});

export const adminDamagePatchBody = z.object({
  variantId: z.string().min(1).nullable().optional(),
  description: z.string().trim().min(3).max(500).optional(),
  severity: z.enum(["leve", "moderada", "grave"]).optional(),
  discountCents: z.number().int().nonnegative().optional(),
  isPublic: z.boolean().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  images: z
    .array(z.object({ url: safeUrl(500), position: z.number().int().nonnegative().optional() }))
    .max(8)
    .optional(),
});

export const adminBannerBody = z.object({
  slot: z.string().trim().min(1).max(40).default("home-carrossel"),
  eyebrow: z.string().trim().max(40).default(""),
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(160).default(""),
  href: safeUrl(300),
  imageUrl: safeUrl(500).nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  active: z.boolean().default(true),
});

export const adminBannerPatchBody = z.object({
  slot: z.string().trim().min(1).max(40).optional(),
  eyebrow: z.string().trim().max(40).optional(),
  title: z.string().trim().min(1).max(120).optional(),
  subtitle: z.string().trim().max(160).optional(),
  href: safeUrl(300).optional(),
  imageUrl: safeUrl(500).nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
});

export const adminLoginBody = z.object({
  password: z.string().min(1).max(200),
});

export const adminUploadBody = z.object({
  filename: z.string().trim().min(1).max(120),
  contentType: z.string().trim().min(1).max(80),
});

export const stockPatchBody = z.object({
  productId: z.string().min(1),
  colorId: z.string().min(1),
  stock: z.number().int().min(0).max(999),
});

export type CheckoutBody = z.infer<typeof checkoutBody>;
export type TestRideBody = z.infer<typeof testRideBody>;
