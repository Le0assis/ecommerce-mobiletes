import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").references(() => customers.id),
  cep: text("cep").notNull(),
  street: text("street"),
  number: text("number"),
  complement: text("complement"),
  district: text("district"),
  city: text("city"),
  state: text("state"),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  category: text("category").notNull(),
  style: text("style").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  basePriceCents: integer("base_price_cents").notNull(),
  /** rascunho, ativo ou arquivado. O produto sai de linha por arquivamento. */
  status: text("status").notNull().default("rascunho"),
  /** Ficha e preço de exemplo, até o fabricante confirmar. A vitrine mostra a faixa. */
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ficha do autopropelido. O selo não é coluna: só existe quando potência nominal,
 * velocidade, largura e entre-eixos estão preenchidos e cabem na CONTRAN 996/2023.
 */
export const productSpecs = pgTable("product_specs", {
  productId: text("product_id")
    .primaryKey()
    .references(() => products.id),
  powerNominalW: integer("power_nominal_w"),
  powerPeakW: integer("power_peak_w"),
  topSpeedKmh: integer("top_speed_kmh"),
  widthCm: integer("width_cm"),
  wheelbaseCm: integer("wheelbase_cm"),
  weightKg: integer("weight_kg"),
  seatHeightMm: integer("seat_height_mm"),
  batteryV: integer("battery_v"),
  batteryAh: integer("battery_ah"),
  batteryChem: text("battery_chem"),
  batteryRemovable: boolean("battery_removable"),
  chargeHours: integer("charge_hours"),
  rangeKmDeclared: integer("range_km_declared"),
  hasSpeedLimiter: boolean("has_speed_limiter"),
  hasBell: boolean("has_bell"),
  hasLights: boolean("has_lights"),
});

export const productColors = pgTable(
  "product_colors",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    colorId: text("color_id").notNull(),
    name: text("name").notNull(),
    hex: text("hex").notNull(),
    priceDeltaCents: integer("price_delta_cents").notNull(),
    stock: integer("stock").notNull(),
  },
  (table) => [uniqueIndex("product_colors_pk").on(table.productId, table.colorId)],
);

export const productVariants = pgTable("product_variants", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  sku: text("sku").notNull(),
  colorName: text("color_name").notNull(),
  colorHex: text("color_hex").notNull(),
  batteryLabel: text("battery_label"),
  priceDeltaCents: integer("price_delta_cents").notNull().default(0),
  stock: integer("stock").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const productImages = pgTable("product_images", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  variantId: text("variant_id").references(() => productVariants.id),
  url: text("url").notNull(),
  alt: text("alt").notNull().default(""),
  position: integer("position").notNull().default(0),
  isCover: boolean("is_cover").notNull().default(false),
});

export const accessories = pgTable("accessories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  /** bau, cesta, cadeirinha, retrovisor, capacete, capa, suporte, gaiola, ou o grupo já cadastrado. */
  kind: text("kind").notNull(),
  priceCents: integer("price_cents").notNull(),
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url"),
});

export const productAccessories = pgTable(
  "product_accessories",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id),
    accessoryId: text("accessory_id")
      .notNull()
      .references(() => accessories.id),
    recommended: boolean("recommended").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.productId, table.accessoryId] })],
);

export const damages = pgTable("damages", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  variantId: text("variant_id").references(() => productVariants.id),
  description: text("description").notNull(),
  /** leve, moderada ou grave. */
  severity: text("severity").notNull(),
  discountCents: integer("discount_cents").notNull().default(0),
  isPublic: boolean("public").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const damageImages = pgTable("damage_images", {
  id: text("id").primaryKey(),
  damageId: text("damage_id")
    .notNull()
    .references(() => damages.id),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
});

export const dealers = pgTable("dealers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  uf: text("uf").notNull(),
  cep: text("cep").notNull(),
});

export const testRideBookings = pgTable("test_ride_bookings", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  dealerId: text("dealer_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  preferredDate: text("preferred_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  code: text("code").primaryKey(),
  status: text("status").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  method: text("method").notNull(),
  provider: text("provider").notNull(),
  installments: integer("installments").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  shippingCents: integer("shipping_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  cep: text("cep").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  productSlug: text("product_slug").notNull(),
  city: text("city").notNull(),
  rating: integer("rating").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const banners = pgTable("banners", {
  id: text("id").primaryKey(),
  slot: text("slot").notNull(),
  eyebrow: text("eyebrow").notNull(),
  title: text("title").notNull(),
  href: text("href").notNull(),
  active: boolean("active").notNull().default(true),
});

/** Reservado para a NF-e. O MVP não emite documento fiscal. */
export const fiscalDocuments = pgTable("fiscal_documents", {
  id: text("id").primaryKey(),
  orderCode: text("order_code").references(() => orders.code),
  status: text("status").notNull().default("nao_emitida"),
  accessKey: text("access_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
