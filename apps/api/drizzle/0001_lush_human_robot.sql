CREATE TYPE "public"."provider_order_status" AS ENUM('pending', 'processing', 'waiting_provider', 'unknown', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."replacement_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "provider_orders" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "provider_orders" ALTER COLUMN "status" SET DATA TYPE "public"."provider_order_status" USING "status"::"public"."provider_order_status";--> statement-breakpoint
ALTER TABLE "provider_orders" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "replacements" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "replacements" ALTER COLUMN "status" SET DATA TYPE "public"."replacement_status" USING "status"::text::"public"."replacement_status";--> statement-breakpoint
ALTER TABLE "replacements" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "aggregate_id" text;--> statement-breakpoint
UPDATE "events" SET "aggregate_id" = "id" WHERE "aggregate_id" IS NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "aggregate_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "lines" ADD COLUMN "reserved_by_replacement_id" text;--> statement-breakpoint
ALTER TABLE "provider_orders" ADD COLUMN "operation_key" text;--> statement-breakpoint
UPDATE "provider_orders" SET "operation_key" = "provider_id" || ':' || "operation" || ':' || "replacement_id" WHERE "operation_key" IS NULL;--> statement-breakpoint
ALTER TABLE "provider_orders" ALTER COLUMN "operation_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "encrypted_secret" text;--> statement-breakpoint
UPDATE "webhooks" SET "encrypted_secret" = 'legacy-secret-unavailable', "enabled" = false WHERE "encrypted_secret" IS NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "encrypted_secret" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "secret_key_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_one_active_per_line_idx" ON "assignments" USING btree ("line_id") WHERE "assignments"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "assignments_org_line_idx" ON "assignments" USING btree ("organization_id","line_id");--> statement-breakpoint
CREATE UNIQUE INDEX "events_type_aggregate_unique" ON "events" USING btree ("type","aggregate_id");--> statement-breakpoint
CREATE INDEX "incidents_org_id_idx" ON "incidents" USING btree ("organization_id","id");--> statement-breakpoint
CREATE INDEX "jobs_claim_idx" ON "jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "jobs_stale_lease_idx" ON "jobs" USING btree ("status","locked_at");--> statement-breakpoint
CREATE INDEX "lines_pool_eligibility_idx" ON "lines" USING btree ("organization_id","status","region","sim_type");--> statement-breakpoint
CREATE UNIQUE INDEX "lines_one_reservation_per_replacement_idx" ON "lines" USING btree ("reserved_by_replacement_id") WHERE "lines"."reserved_by_replacement_id" is not null;--> statement-breakpoint
CREATE INDEX "people_org_idx" ON "people" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_orders_operation_key_unique" ON "provider_orders" USING btree ("operation_key");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_orders_one_activation_per_replacement" ON "provider_orders" USING btree ("replacement_id","operation");--> statement-breakpoint
CREATE INDEX "replacements_org_id_idx" ON "replacements" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_delivery_event_hook_unique" ON "webhook_deliveries" USING btree ("event_id","webhook_id");--> statement-breakpoint
CREATE INDEX "webhook_delivery_dispatch_idx" ON "webhook_deliveries" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "webhooks_org_enabled_idx" ON "webhooks" USING btree ("organization_id","enabled");--> statement-breakpoint
ALTER TABLE "webhooks" DROP COLUMN "secret_hash";--> statement-breakpoint
UPDATE "jobs" SET "status"='pending', "locked_at"=NULL, "locked_by"=NULL, "available_at"=now() WHERE "status"='processing';--> statement-breakpoint
UPDATE "lines" SET "status"='available', "reserved_by_replacement_id"=NULL WHERE "status"='provisioning';--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_lock_state_check" CHECK (("jobs"."status"='processing' and "jobs"."locked_at" is not null and "jobs"."locked_by" is not null) or ("jobs"."status"<>'processing' and "jobs"."locked_at" is null and "jobs"."locked_by" is null));--> statement-breakpoint
ALTER TABLE "lines" ADD CONSTRAINT "lines_reservation_state_check" CHECK (("lines"."status"='provisioning' and "lines"."reserved_by_replacement_id" is not null) or ("lines"."status"<>'provisioning' and "lines"."reserved_by_replacement_id" is null));
