ALTER TABLE "product_specs" ALTER COLUMN "power_nominal_w" TYPE numeric(12, 2) USING "power_nominal_w"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ALTER COLUMN "power_peak_w" TYPE numeric(12, 2) USING "power_peak_w"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ALTER COLUMN "top_speed_kmh" TYPE numeric(12, 2) USING "top_speed_kmh"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ALTER COLUMN "width_cm" TYPE numeric(12, 2) USING "width_cm"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ALTER COLUMN "wheelbase_cm" TYPE numeric(12, 2) USING "wheelbase_cm"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ALTER COLUMN "weight_kg" TYPE numeric(12, 2) USING "weight_kg"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ALTER COLUMN "seat_height_mm" TYPE numeric(12, 2) USING "seat_height_mm"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ALTER COLUMN "battery_v" TYPE numeric(12, 2) USING "battery_v"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ALTER COLUMN "battery_ah" TYPE numeric(12, 2) USING "battery_ah"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ALTER COLUMN "charge_hours" TYPE numeric(12, 2) USING "charge_hours"::numeric(12, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ALTER COLUMN "range_km_declared" TYPE numeric(12, 2) USING "range_km_declared"::numeric(12, 2);--> statement-breakpoint
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
