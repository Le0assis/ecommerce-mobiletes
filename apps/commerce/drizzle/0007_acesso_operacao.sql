-- Acesso e operação. Pode rodar de novo. Não apaga linha, não mexe no estoque de
-- product_variants/product_colors e não altera test_ride_bookings.
-- O selo de public_id usa o texto de payload->>'publicId'. A tabela orders não tem
-- coluna id: o desempate do backfill é code, depois de created_at.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "public_id" text;--> statement-breakpoint
DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT payload->>'publicId' AS public_id, count(*) AS n
    FROM "orders"
    WHERE nullif(btrim(payload->>'publicId'), '') IS NOT NULL
    GROUP BY payload->>'publicId'
    HAVING count(*) > 1
  LOOP
    RAISE WARNING USING MESSAGE = format(
      'orders.public_id: publicId repetido (%s) em %s pedidos; preenchido só o de menor created_at/code, os outros ficam NULL',
      rec.public_id,
      rec.n
    );
  END LOOP;

  UPDATE "orders" AS o
  SET "public_id" = chosen.public_id
  FROM (
    SELECT DISTINCT ON (payload->>'publicId')
      "code",
      payload->>'publicId' AS public_id
    FROM "orders"
    WHERE nullif(btrim(payload->>'publicId'), '') IS NOT NULL
    ORDER BY payload->>'publicId', "created_at" ASC, "code" ASC
  ) AS chosen
  WHERE o."code" = chosen."code"
    AND o."public_id" IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM "orders" AS other
      WHERE other."public_id" = chosen.public_id
        AND other."code" <> chosen."code"
    );
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_public_id_idx" ON "orders" USING btree ("public_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
  "token" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "email" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone,
  CONSTRAINT "sessions_kind_check" CHECK ("kind" in ('customer', 'admin')),
  CONSTRAINT "sessions_email_by_kind" CHECK (("kind" = 'customer' AND "email" IS NOT NULL) OR ("kind" = 'admin' AND "email" IS NULL))
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_kind_check' AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_kind_check" CHECK ("kind" in ('customer', 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sessions_email_by_kind' AND conrelid = 'public.sessions'::regclass
  ) THEN
    ALTER TABLE "sessions" ADD CONSTRAINT "sessions_email_by_kind" CHECK (("kind" = 'customer' AND "email" IS NOT NULL) OR ("kind" = 'admin' AND "email" IS NULL));
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_email_idx" ON "sessions" USING btree ("email");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login_codes" (
  "email" text PRIMARY KEY NOT NULL,
  "hash" text NOT NULL,
  "salt" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "sent_at" timestamp with time zone NOT NULL,
  CONSTRAINT "login_codes_attempts_range" CHECK ("attempts" between 0 and 5)
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'login_codes_attempts_range' AND conrelid = 'public.login_codes'::regclass
  ) THEN
    ALTER TABLE "login_codes" ADD CONSTRAINT "login_codes_attempts_range" CHECK ("attempts" between 0 and 5);
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchanges" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "brand" text NOT NULL,
  "model" text NOT NULL,
  "city" text NOT NULL,
  "year" integer NOT NULL,
  "km" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "exchanges_year_range" CHECK ("year" between 1990 and 2030),
  CONSTRAINT "exchanges_km_range" CHECK ("km" between 0 and 500000)
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exchanges_year_range' AND conrelid = 'public.exchanges'::regclass
  ) THEN
    ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_year_range" CHECK ("year" between 1990 and 2030);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exchanges_km_range' AND conrelid = 'public.exchanges'::regclass
  ) THEN
    ALTER TABLE "exchanges" ADD CONSTRAINT "exchanges_km_range" CHECK ("km" between 0 and 500000);
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exchanges_created_at_idx" ON "exchanges" USING btree ("created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "service_bookings" (
  "id" text PRIMARY KEY NOT NULL,
  "dealer_id" text NOT NULL,
  "product_id" text NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "preferred_date" text NOT NULL,
  "note" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "service_bookings_preferred_date_format" CHECK ("preferred_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'service_bookings_preferred_date_format' AND conrelid = 'public.service_bookings'::regclass
  ) THEN
    ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_preferred_date_format" CHECK ("preferred_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_bookings_dealer_id_idx" ON "service_bookings" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_bookings_product_id_idx" ON "service_bookings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_bookings_created_at_idx" ON "service_bookings" USING btree ("created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "color_stock" (
  "product_id" text NOT NULL,
  "color_id" text NOT NULL,
  "stock" integer NOT NULL,
  CONSTRAINT "color_stock_pkey" PRIMARY KEY ("product_id", "color_id"),
  CONSTRAINT "color_stock_stock_non_negative" CHECK ("stock" >= 0)
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'color_stock_pkey' AND conrelid = 'public.color_stock'::regclass
  ) THEN
    ALTER TABLE "color_stock" ADD CONSTRAINT "color_stock_pkey" PRIMARY KEY ("product_id", "color_id");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'color_stock_stock_non_negative' AND conrelid = 'public.color_stock'::regclass
  ) THEN
    ALTER TABLE "color_stock" ADD CONSTRAINT "color_stock_stock_non_negative" CHECK ("stock" >= 0);
  END IF;
END $$;
