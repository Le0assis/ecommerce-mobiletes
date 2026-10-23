import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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

export const products = pgTable(
  "products",
  {
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
    /** Independente do status editorial. A listagem pública só mostra o que está habilitado. */
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_category_idx").on(table.category),
    index("products_status_idx").on(table.status),
    index("products_brand_idx").on(table.brand),
    index("products_style_idx").on(table.style),
    index("products_is_sample_idx").on(table.isSample),
    index("products_is_enabled_idx").on(table.isEnabled),
    index("products_base_price_cents_idx").on(table.basePriceCents),
    index("products_created_at_idx").on(table.createdAt),
    check("products_base_price_cents_non_negative", sql`${table.basePriceCents} >= 0`),
    check("products_status_known", sql`${table.status} in ('rascunho', 'ativo', 'arquivado')`),
    check("products_category_known", sql`${table.category} in ('scooter', 'mobilete', 'citycoco')`),
  ],
);

/**
 * Ficha do autopropelido. O selo não é coluna: só existe quando potência nominal,
 * velocidade, largura e entre-eixos estão preenchidos e cabem na CONTRAN 996/2023.
 */
export const productSpecs = pgTable(
  "product_specs",
  {
    productId: text("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
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
  },
  (table) => [
    check(
      "product_specs_power_nominal_w_bounds",
      sql`${table.powerNominalW} is null or (${table.powerNominalW} >= 0 and ${table.powerNominalW} <= 20000)`,
    ),
    check(
      "product_specs_power_peak_w_bounds",
      sql`${table.powerPeakW} is null or (${table.powerPeakW} >= 0 and ${table.powerPeakW} <= 20000)`,
    ),
    check(
      "product_specs_top_speed_kmh_bounds",
      sql`${table.topSpeedKmh} is null or (${table.topSpeedKmh} >= 0 and ${table.topSpeedKmh} <= 150)`,
    ),
    check("product_specs_width_cm_bounds", sql`${table.widthCm} is null or (${table.widthCm} >= 0 and ${table.widthCm} <= 300)`),
    check(
      "product_specs_wheelbase_cm_bounds",
      sql`${table.wheelbaseCm} is null or (${table.wheelbaseCm} >= 0 and ${table.wheelbaseCm} <= 400)`,
    ),
    check("product_specs_weight_kg_bounds", sql`${table.weightKg} is null or (${table.weightKg} >= 0 and ${table.weightKg} <= 1000)`),
    check(
      "product_specs_seat_height_mm_bounds",
      sql`${table.seatHeightMm} is null or (${table.seatHeightMm} >= 0 and ${table.seatHeightMm} <= 1500)`,
    ),
    check("product_specs_battery_v_bounds", sql`${table.batteryV} is null or (${table.batteryV} >= 0 and ${table.batteryV} <= 200)`),
    check("product_specs_battery_ah_bounds", sql`${table.batteryAh} is null or (${table.batteryAh} >= 0 and ${table.batteryAh} <= 500)`),
    check(
      "product_specs_charge_hours_bounds",
      sql`${table.chargeHours} is null or (${table.chargeHours} >= 0 and ${table.chargeHours} <= 48)`,
    ),
    check(
      "product_specs_range_km_declared_bounds",
      sql`${table.rangeKmDeclared} is null or (${table.rangeKmDeclared} >= 0 and ${table.rangeKmDeclared} <= 1000)`,
    ),
  ],
);

export const productColors = pgTable(
  "product_colors",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    colorId: text("color_id").notNull(),
    name: text("name").notNull(),
    hex: text("hex").notNull(),
    priceDeltaCents: integer("price_delta_cents").notNull(),
    stock: integer("stock").notNull(),
  },
  (table) => [
    uniqueIndex("product_colors_pk").on(table.productId, table.colorId),
    check("product_colors_price_delta_non_negative", sql`${table.priceDeltaCents} >= 0`),
    check("product_colors_stock_non_negative", sql`${table.stock} >= 0`),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    colorName: text("color_name").notNull(),
    colorHex: text("color_hex").notNull(),
    batteryLabel: text("battery_label"),
    priceDeltaCents: integer("price_delta_cents").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    index("product_variants_product_id_idx").on(table.productId),
    index("product_variants_active_idx").on(table.active),
    check("product_variants_price_delta_non_negative", sql`${table.priceDeltaCents} >= 0`),
    check("product_variants_stock_non_negative", sql`${table.stock} >= 0`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    position: integer("position").notNull().default(0),
    isCover: boolean("is_cover").notNull().default(false),
  },
  (table) => [
    index("product_images_product_position_idx").on(table.productId, table.position),
    index("product_images_variant_id_idx").on(table.variantId),
    uniqueIndex("product_images_one_cover").on(table.productId).where(sql`${table.isCover} = true`),
    check("product_images_position_non_negative", sql`${table.position} >= 0`),
  ],
);

export const accessories = pgTable(
  "accessories",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** bau, cesta, cadeirinha, retrovisor, capacete, capa, suporte, gaiola, ou o grupo já cadastrado. */
    kind: text("kind").notNull(),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    imageUrl: text("image_url"),
  },
  (table) => [
    index("accessories_kind_idx").on(table.kind),
    check("accessories_price_cents_non_negative", sql`${table.priceCents} >= 0`),
    check("accessories_stock_non_negative", sql`${table.stock} >= 0`),
  ],
);

export const productAccessories = pgTable(
  "product_accessories",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    accessoryId: text("accessory_id")
      .notNull()
      .references(() => accessories.id, { onDelete: "cascade" }),
    recommended: boolean("recommended").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.accessoryId] }),
    index("product_accessories_accessory_id_idx").on(table.accessoryId),
  ],
);

export const damages = pgTable(
  "damages",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    description: text("description").notNull(),
    /** leve, moderada ou grave. Uma linha é uma unidade avariada. */
    severity: text("severity").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    isPublic: boolean("public").notNull().default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("damages_product_id_idx").on(table.productId),
    index("damages_variant_id_idx").on(table.variantId),
    index("damages_created_at_idx").on(table.createdAt),
    index("damages_public_open_idx")
      .on(table.productId)
      .where(sql`${table.isPublic} = true and ${table.resolvedAt} is null`),
    check("damages_discount_cents_non_negative", sql`${table.discountCents} >= 0`),
    check("damages_severity_known", sql`${table.severity} in ('leve', 'moderada', 'grave')`),
  ],
);

export const damageImages = pgTable(
  "damage_images",
  {
    id: text("id").primaryKey(),
    damageId: text("damage_id")
      .notNull()
      .references(() => damages.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    index("damage_images_damage_position_idx").on(table.damageId, table.position),
    check("damage_images_position_non_negative", sql`${table.position} >= 0`),
  ],
);

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

export const banners = pgTable(
  "banners",
  {
    id: text("id").primaryKey(),
    slot: text("slot").notNull(),
    eyebrow: text("eyebrow").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    href: text("href").notNull(),
    imageUrl: text("image_url"),
    position: integer("position").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    index("banners_position_idx").on(table.position),
    index("banners_slot_active_idx").on(table.slot, table.active),
    check("banners_position_non_negative", sql`${table.position} >= 0`),
  ],
);

/** Reservado para a NF-e. O MVP não emite documento fiscal. */
export const fiscalDocuments = pgTable("fiscal_documents", {
  id: text("id").primaryKey(),
  orderCode: text("order_code").references(() => orders.code),
  status: text("status").notNull().default("nao_emitida"),
  accessKey: text("access_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
