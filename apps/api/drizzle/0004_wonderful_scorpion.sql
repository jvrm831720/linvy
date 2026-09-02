ALTER TYPE "public"."replacement_status" ADD VALUE 'reconciling' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."replacement_status" ADD VALUE 'reconciliation_required' BEFORE 'completed';--> statement-breakpoint
CREATE TABLE "provider_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"adapter_type" text NOT NULL,
	"encrypted_credentials" text NOT NULL,
	"credentials_key_version" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_success_at" timestamp with time zone,
	"last_failure_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_connections_failures_nonnegative" CHECK ("provider_connections"."consecutive_failures">=0)
);
--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "provider_connections_one_enabled_idx" ON "provider_connections" USING btree ("provider_id") WHERE "provider_connections"."enabled"=true;--> statement-breakpoint
CREATE INDEX "provider_connections_org_provider_idx" ON "provider_connections" USING btree ("organization_id","provider_id");