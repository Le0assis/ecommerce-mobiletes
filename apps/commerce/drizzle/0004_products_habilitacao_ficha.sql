ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_measures_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_peak_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_speed_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_width_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_wheelbase_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_weight_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_seat_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_battery_v_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_battery_ah_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_charge_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_range_non_negative";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_power_nominal_w_bounds";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_power_peak_w_bounds";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_top_speed_kmh_bounds";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_width_cm_bounds";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_wheelbase_cm_bounds";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_weight_kg_bounds";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_seat_height_mm_bounds";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_battery_v_bounds";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_battery_ah_bounds";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_charge_hours_bounds";--> statement-breakpoint
ALTER TABLE "product_specs" DROP CONSTRAINT IF EXISTS "product_specs_range_km_declared_bounds";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_enabled_idx" ON "products" USING btree ("is_enabled");--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_power_nominal_w_bounds" CHECK ("product_specs"."power_nominal_w" is null or ("product_specs"."power_nominal_w" >= 0 and "product_specs"."power_nominal_w" <= 20000));--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_power_peak_w_bounds" CHECK ("product_specs"."power_peak_w" is null or ("product_specs"."power_peak_w" >= 0 and "product_specs"."power_peak_w" <= 20000));--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_top_speed_kmh_bounds" CHECK ("product_specs"."top_speed_kmh" is null or ("product_specs"."top_speed_kmh" >= 0 and "product_specs"."top_speed_kmh" <= 150));--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_width_cm_bounds" CHECK ("product_specs"."width_cm" is null or ("product_specs"."width_cm" >= 0 and "product_specs"."width_cm" <= 300));--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_wheelbase_cm_bounds" CHECK ("product_specs"."wheelbase_cm" is null or ("product_specs"."wheelbase_cm" >= 0 and "product_specs"."wheelbase_cm" <= 400));--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_weight_kg_bounds" CHECK ("product_specs"."weight_kg" is null or ("product_specs"."weight_kg" >= 0 and "product_specs"."weight_kg" <= 1000));--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_seat_height_mm_bounds" CHECK ("product_specs"."seat_height_mm" is null or ("product_specs"."seat_height_mm" >= 0 and "product_specs"."seat_height_mm" <= 1500));--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_battery_v_bounds" CHECK ("product_specs"."battery_v" is null or ("product_specs"."battery_v" >= 0 and "product_specs"."battery_v" <= 200));--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_battery_ah_bounds" CHECK ("product_specs"."battery_ah" is null or ("product_specs"."battery_ah" >= 0 and "product_specs"."battery_ah" <= 500));--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_charge_hours_bounds" CHECK ("product_specs"."charge_hours" is null or ("product_specs"."charge_hours" >= 0 and "product_specs"."charge_hours" <= 48));--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_range_km_declared_bounds" CHECK ("product_specs"."range_km_declared" is null or ("product_specs"."range_km_declared" >= 0 and "product_specs"."range_km_declared" <= 1000));
