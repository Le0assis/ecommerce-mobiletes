CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "addresses_customer_id_idx" ON "addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_status_enabled_idx" ON "products" USING btree ("status","is_enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_public_listing_idx" ON "products" USING btree ("category","brand","base_price_cents") WHERE "status" = 'ativo' AND "is_enabled" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_customer_email_idx" ON "orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_product_slug_created_at_idx" ON "reviews" USING btree ("product_slug","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ride_bookings_dealer_id_idx" ON "test_ride_bookings" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_ride_bookings_product_id_idx" ON "test_ride_bookings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fiscal_documents_order_code_idx" ON "fiscal_documents" USING btree ("order_code");--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_money_non_negative') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_money_non_negative" CHECK ("subtotal_cents" >= 0 AND "shipping_cents" >= 0 AND "total_cents" >= 0) NOT VALID;
  END IF;
END $$;
