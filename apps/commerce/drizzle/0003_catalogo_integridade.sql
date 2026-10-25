ALTER TABLE "damage_images" DROP CONSTRAINT "damage_images_damage_id_damages_id_fk";
--> statement-breakpoint
ALTER TABLE "damages" DROP CONSTRAINT "damages_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "damages" DROP CONSTRAINT "damages_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "product_accessories" DROP CONSTRAINT "product_accessories_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "product_accessories" DROP CONSTRAINT "product_accessories_accessory_id_accessories_id_fk";
--> statement-breakpoint
ALTER TABLE "product_colors" DROP CONSTRAINT "product_colors_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_variant_id_product_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT "product_specs_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "product_variants" DROP CONSTRAINT "product_variants_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "damage_images" ADD CONSTRAINT "damage_images_damage_id_damages_id_fk" FOREIGN KEY ("damage_id") REFERENCES "public"."damages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damages" ADD CONSTRAINT "damages_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "damages" ADD CONSTRAINT "damages_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_accessories" ADD CONSTRAINT "product_accessories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_accessories" ADD CONSTRAINT "product_accessories_accessory_id_accessories_id_fk" FOREIGN KEY ("accessory_id") REFERENCES "public"."accessories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accessories_kind_idx" ON "accessories" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "banners_position_idx" ON "banners" USING btree ("position");--> statement-breakpoint
CREATE INDEX "banners_slot_active_idx" ON "banners" USING btree ("slot","active");--> statement-breakpoint
CREATE INDEX "damage_images_damage_position_idx" ON "damage_images" USING btree ("damage_id","position");--> statement-breakpoint
CREATE INDEX "damages_product_id_idx" ON "damages" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "damages_variant_id_idx" ON "damages" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "damages_created_at_idx" ON "damages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "damages_public_open_idx" ON "damages" USING btree ("product_id") WHERE "damages"."public" = true and "damages"."resolved_at" is null;--> statement-breakpoint
CREATE INDEX "product_accessories_accessory_id_idx" ON "product_accessories" USING btree ("accessory_id");--> statement-breakpoint
CREATE INDEX "product_images_product_position_idx" ON "product_images" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "product_images_variant_id_idx" ON "product_images" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_one_cover" ON "product_images" USING btree ("product_id") WHERE "product_images"."is_cover" = true;--> statement-breakpoint
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variants_active_idx" ON "product_variants" USING btree ("active");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_brand_idx" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "products_style_idx" ON "products" USING btree ("style");--> statement-breakpoint
CREATE INDEX "products_is_sample_idx" ON "products" USING btree ("is_sample");--> statement-breakpoint
CREATE INDEX "products_base_price_cents_idx" ON "products" USING btree ("base_price_cents");--> statement-breakpoint
CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_sku_unique" UNIQUE("sku");--> statement-breakpoint
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_price_cents_non_negative" CHECK ("accessories"."price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "accessories" ADD CONSTRAINT "accessories_stock_non_negative" CHECK ("accessories"."stock" >= 0);--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_position_non_negative" CHECK ("banners"."position" >= 0);--> statement-breakpoint
ALTER TABLE "damage_images" ADD CONSTRAINT "damage_images_position_non_negative" CHECK ("damage_images"."position" >= 0);--> statement-breakpoint
ALTER TABLE "damages" ADD CONSTRAINT "damages_discount_cents_non_negative" CHECK ("damages"."discount_cents" >= 0);--> statement-breakpoint
ALTER TABLE "damages" ADD CONSTRAINT "damages_severity_known" CHECK ("damages"."severity" in ('leve', 'moderada', 'grave'));--> statement-breakpoint
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_price_delta_non_negative" CHECK ("product_colors"."price_delta_cents" >= 0);--> statement-breakpoint
ALTER TABLE "product_colors" ADD CONSTRAINT "product_colors_stock_non_negative" CHECK ("product_colors"."stock" >= 0);--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_position_non_negative" CHECK ("product_images"."position" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_measures_non_negative" CHECK ("product_specs"."power_nominal_w" is null or "product_specs"."power_nominal_w" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_peak_non_negative" CHECK ("product_specs"."power_peak_w" is null or "product_specs"."power_peak_w" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_speed_non_negative" CHECK ("product_specs"."top_speed_kmh" is null or "product_specs"."top_speed_kmh" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_width_non_negative" CHECK ("product_specs"."width_cm" is null or "product_specs"."width_cm" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_wheelbase_non_negative" CHECK ("product_specs"."wheelbase_cm" is null or "product_specs"."wheelbase_cm" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_weight_non_negative" CHECK ("product_specs"."weight_kg" is null or "product_specs"."weight_kg" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_seat_non_negative" CHECK ("product_specs"."seat_height_mm" is null or "product_specs"."seat_height_mm" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_battery_v_non_negative" CHECK ("product_specs"."battery_v" is null or "product_specs"."battery_v" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_battery_ah_non_negative" CHECK ("product_specs"."battery_ah" is null or "product_specs"."battery_ah" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_charge_non_negative" CHECK ("product_specs"."charge_hours" is null or "product_specs"."charge_hours" >= 0);--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_range_non_negative" CHECK ("product_specs"."range_km_declared" is null or "product_specs"."range_km_declared" >= 0);--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_price_delta_non_negative" CHECK ("product_variants"."price_delta_cents" >= 0);--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_stock_non_negative" CHECK ("product_variants"."stock" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_base_price_cents_non_negative" CHECK ("products"."base_price_cents" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_status_known" CHECK ("products"."status" in ('rascunho', 'ativo', 'arquivado'));--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_known" CHECK ("products"."category" in ('scooter', 'mobilete', 'citycoco'));