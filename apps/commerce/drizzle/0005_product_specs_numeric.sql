ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_is_enabled_idx" ON "products" USING btree ("is_enabled");--> statement-breakpoint
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
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_power_nominal_w_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_power_nominal_w_bounds" CHECK ("power_nominal_w" is null or ("power_nominal_w" >= 0 and "power_nominal_w" <= 20000));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_power_peak_w_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_power_peak_w_bounds" CHECK ("power_peak_w" is null or ("power_peak_w" >= 0 and "power_peak_w" <= 20000));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_top_speed_kmh_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_top_speed_kmh_bounds" CHECK ("top_speed_kmh" is null or ("top_speed_kmh" >= 0 and "top_speed_kmh" <= 150));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_width_cm_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_width_cm_bounds" CHECK ("width_cm" is null or ("width_cm" >= 0 and "width_cm" <= 300));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_wheelbase_cm_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_wheelbase_cm_bounds" CHECK ("wheelbase_cm" is null or ("wheelbase_cm" >= 0 and "wheelbase_cm" <= 400));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_weight_kg_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_weight_kg_bounds" CHECK ("weight_kg" is null or ("weight_kg" >= 0 and "weight_kg" <= 1000));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_seat_height_mm_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_seat_height_mm_bounds" CHECK ("seat_height_mm" is null or ("seat_height_mm" >= 0 and "seat_height_mm" <= 1500));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_battery_v_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_battery_v_bounds" CHECK ("battery_v" is null or ("battery_v" >= 0 and "battery_v" <= 200));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_battery_ah_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_battery_ah_bounds" CHECK ("battery_ah" is null or ("battery_ah" >= 0 and "battery_ah" <= 500));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_charge_hours_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_charge_hours_bounds" CHECK ("charge_hours" is null or ("charge_hours" >= 0 and "charge_hours" <= 48));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_specs_range_km_declared_bounds') THEN
    ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_range_km_declared_bounds" CHECK ("range_km_declared" is null or ("range_km_declared" >= 0 and "range_km_declared" <= 1000));
  END IF;
END $$;
