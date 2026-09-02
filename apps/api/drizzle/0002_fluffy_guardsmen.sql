CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'processing', 'delivered', 'failed');--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."webhook_delivery_status";--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ALTER COLUMN "status" SET DATA TYPE "public"."webhook_delivery_status" USING "status"::"public"."webhook_delivery_status";--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
UPDATE "webhook_deliveries" SET "status"='pending', "locked_at"=NULL, "locked_by"=NULL WHERE "status"='processing';--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "disabled_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "webhook_delivery_stale_lease_idx" ON "webhook_deliveries" USING btree ("status","locked_at");--> statement-breakpoint
CREATE INDEX "webhook_delivery_webhook_idx" ON "webhook_deliveries" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_event_idx" ON "webhook_deliveries" USING btree ("event_id");--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_delivery_lock_state_check" CHECK (("webhook_deliveries"."status"='processing' and "webhook_deliveries"."locked_at" is not null and "webhook_deliveries"."locked_by" is not null) or ("webhook_deliveries"."status"<>'processing' and "webhook_deliveries"."locked_at" is null and "webhook_deliveries"."locked_by" is null));
