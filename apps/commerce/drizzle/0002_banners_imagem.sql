ALTER TABLE "banners" ADD COLUMN "subtitle" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;