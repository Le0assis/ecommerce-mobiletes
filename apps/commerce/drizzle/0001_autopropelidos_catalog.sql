CREATE TABLE "damage_images" (
	"id" text PRIMARY KEY NOT NULL,
	"damage_id" text NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "damages" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"description" text NOT NULL,
	"severity" text NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_accessories" (
	"product_id" text NOT NULL,
	"accessory_id" text NOT NULL,
	"recommended" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_accessories_product_id_accessory_id_pk" PRIMARY KEY("product_id","accessory_id")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"variant_id" text,
	"url" text NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_specs" (
	"product_id" text PRIMARY KEY NOT NULL,
	"power_nominal_w" integer,
	"power_peak_w" integer,
	"top_speed_kmh" integer,
	"width_cm" integer,
	"wheelbase_cm" integer,
	"weight_kg" integer,
	"seat_height_mm" integer,
	"battery_v" integer,
	"battery_ah" integer,
	"battery_chem" text,
	"battery_removable" boolean,
	"charge_hours" integer,
	"range_km_declared" integer,
	"has_speed_limiter" boolean,
	"has_bell" boolean,
	"has_lights" boolean
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"sku" text NOT NULL,
	"color_name" text NOT NULL,
	"color_hex" text NOT NULL,
	"battery_label" text,
	"price_delta_cents" integer DEFAULT 0 NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accessories" ADD COLUMN "slug" text;--> statement-breakpoint
UPDATE "accessories" SET "slug" = "id" WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "accessories" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accessories" ADD COLUMN "kind" text;--> statement-breakpoint
UPDATE "accessories" SET "kind" = '' WHERE "kind" IS NULL;--> statement-breakpoint
ALTER TABLE "accessories" ALTER COLUMN "kind" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accessories" ADD COLUMN "stock" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "accessories" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand" text;--> statement-breakpoint
UPDATE "products" SET "brand" = '' WHERE "brand" IS NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "brand" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "style" text;--> statement-breakpoint
UPDATE "products" SET "style" = '' WHERE "style" IS NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "style" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "tagline" text;--> statement-breakpoint
UPDATE "products" SET "tagline" = '' WHERE "tagline" IS NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "tagline" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "description" text;--> statement-breakpoint
UPDATE "products" SET "description" = '' WHERE "description" IS NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "description" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "status" text DEFAULT 'rascunho' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_sample" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "damage_images" ADD CONSTRAINT "damage_images_damage_id_damages_id_fk" FOREIGN KEY ("damage_id") REFERENCES "public"."damages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damages" ADD CONSTRAINT "damages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damages" ADD CONSTRAINT "damages_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_accessories" ADD CONSTRAINT "product_accessories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_accessories" ADD CONSTRAINT "product_accessories_accessory_id_accessories_id_fk" FOREIGN KEY ("accessory_id") REFERENCES "public"."accessories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "weight_kg";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "active";