import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

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
  category: text("category").notNull(),
  basePriceCents: integer("base_price_cents").notNull(),
  weightKg: integer("weight_kg").notNull(),
  active: boolean("active").notNull().default(true),
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

export const accessories = pgTable("accessories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
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
