CREATE TABLE "guard_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'approval_required' NOT NULL,
	"dedupe_key" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"evidence" jsonb NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"rejected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guard_action_type_check" CHECK ("guard_actions"."type" in ('notify','open_incident','attach_playbook','pause_provider_activations','manual_review_required')),
	CONSTRAINT "guard_action_status_check" CHECK ("guard_actions"."status" in ('recommended','approval_required','approved','executing','completed','rejected','failed'))
);
--> statement-breakpoint
CREATE TABLE "guard_alert_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"alert_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guard_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"signal_id" text,
	"cluster_id" text,
	"provider_id" text,
	"line_id" text,
	"status" text DEFAULT 'open' NOT NULL,
	"dedupe_key" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"cooldown_until" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guard_cluster_members" (
	"cluster_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"member_type" text NOT NULL,
	"member_id" text NOT NULL,
	"line_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guard_cluster_members_cluster_id_member_type_member_id_pk" PRIMARY KEY("cluster_id","member_type","member_id")
);
--> statement-breakpoint
CREATE TABLE "guard_event_checkpoints" (
	"organization_id" text NOT NULL,
	"processor" text NOT NULL,
	"last_created_at" timestamp with time zone,
	"last_event_id" text,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guard_event_checkpoints_organization_id_processor_pk" PRIMARY KEY("organization_id","processor")
);
--> statement-breakpoint
CREATE TABLE "guard_incident_clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider_id" text,
	"region" text,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"wave_key" text NOT NULL,
	"first_detected_at" timestamp with time zone NOT NULL,
	"last_detected_at" timestamp with time zone NOT NULL,
	"affected_lines_count" integer NOT NULL,
	"incident_count" integer NOT NULL,
	"evidence" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "guard_notification_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"encrypted_credentials" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"severity_threshold" text DEFAULT 'high' NOT NULL,
	"provider_filters" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guard_playbook_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"playbook_id" text NOT NULL,
	"cluster_id" text,
	"signal_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"step_state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guard_playbooks" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"system_owned" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"trigger_type" text NOT NULL,
	"description" text NOT NULL,
	"steps" jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guard_policy_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"is_global" boolean DEFAULT false NOT NULL,
	"provider_id" text,
	"source" text NOT NULL,
	"source_url" text,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"effective_at" timestamp with time zone,
	"impact" text NOT NULL,
	"category" text NOT NULL,
	"data" jsonb NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guard_policy_owner_check" CHECK (("guard_policy_changes"."is_global"=true and "guard_policy_changes"."organization_id" is null) or ("guard_policy_changes"."is_global"=false and "guard_policy_changes"."organization_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "guard_provider_states" (
	"organization_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"status" text NOT NULL,
	"block_new_activations" boolean DEFAULT false NOT NULL,
	"metrics" jsonb NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guard_provider_states_organization_id_provider_id_pk" PRIMARY KEY("organization_id","provider_id")
);
--> statement-breakpoint
CREATE TABLE "guard_risk_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"score" integer NOT NULL,
	"level" text NOT NULL,
	"factors" jsonb NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guard_risk_score_check" CHECK ("guard_risk_snapshots"."score" between 0 and 100),
	CONSTRAINT "guard_risk_level_check" CHECK ("guard_risk_snapshots"."level" in ('low','medium','high','critical'))
);
--> statement-breakpoint
CREATE TABLE "guard_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"conditions" jsonb NOT NULL,
	"severity" text NOT NULL,
	"action_policy" text DEFAULT 'approval_required' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guard_signals" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"provider_id" text,
	"line_id" text,
	"region" text,
	"observed_value" text,
	"baseline_value" text,
	"score" integer,
	"data" jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guard_signal_severity_check" CHECK ("guard_signals"."severity" in ('info','warning','high','critical')),
	CONSTRAINT "guard_signal_status_check" CHECK ("guard_signals"."status" in ('active','resolved'))
);
--> statement-breakpoint
ALTER TABLE "guard_actions" ADD CONSTRAINT "guard_actions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_alert_deliveries" ADD CONSTRAINT "guard_alert_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_alert_deliveries" ADD CONSTRAINT "guard_alert_deliveries_alert_id_guard_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."guard_alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_alert_deliveries" ADD CONSTRAINT "guard_alert_deliveries_channel_id_guard_notification_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."guard_notification_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_alerts" ADD CONSTRAINT "guard_alerts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_alerts" ADD CONSTRAINT "guard_alerts_signal_id_guard_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."guard_signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_alerts" ADD CONSTRAINT "guard_alerts_cluster_id_guard_incident_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."guard_incident_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_alerts" ADD CONSTRAINT "guard_alerts_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_alerts" ADD CONSTRAINT "guard_alerts_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_cluster_members" ADD CONSTRAINT "guard_cluster_members_cluster_id_guard_incident_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."guard_incident_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_cluster_members" ADD CONSTRAINT "guard_cluster_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_cluster_members" ADD CONSTRAINT "guard_cluster_members_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_event_checkpoints" ADD CONSTRAINT "guard_event_checkpoints_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_incident_clusters" ADD CONSTRAINT "guard_incident_clusters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_incident_clusters" ADD CONSTRAINT "guard_incident_clusters_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_notification_channels" ADD CONSTRAINT "guard_notification_channels_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_playbook_runs" ADD CONSTRAINT "guard_playbook_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_playbook_runs" ADD CONSTRAINT "guard_playbook_runs_playbook_id_guard_playbooks_id_fk" FOREIGN KEY ("playbook_id") REFERENCES "public"."guard_playbooks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_playbook_runs" ADD CONSTRAINT "guard_playbook_runs_cluster_id_guard_incident_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."guard_incident_clusters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_playbook_runs" ADD CONSTRAINT "guard_playbook_runs_signal_id_guard_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."guard_signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_playbooks" ADD CONSTRAINT "guard_playbooks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_policy_changes" ADD CONSTRAINT "guard_policy_changes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_policy_changes" ADD CONSTRAINT "guard_policy_changes_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_provider_states" ADD CONSTRAINT "guard_provider_states_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_provider_states" ADD CONSTRAINT "guard_provider_states_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_risk_snapshots" ADD CONSTRAINT "guard_risk_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_rules" ADD CONSTRAINT "guard_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_signals" ADD CONSTRAINT "guard_signals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_signals" ADD CONSTRAINT "guard_signals_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guard_signals" ADD CONSTRAINT "guard_signals_line_id_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guard_action_org_dedupe_unique" ON "guard_actions" USING btree ("organization_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "guard_action_org_status_idx" ON "guard_actions" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "guard_alert_delivery_unique" ON "guard_alert_deliveries" USING btree ("alert_id","channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guard_alert_org_dedupe_unique" ON "guard_alerts" USING btree ("organization_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "guard_alert_org_status_idx" ON "guard_alerts" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "guard_members_org_cluster_idx" ON "guard_cluster_members" USING btree ("organization_id","cluster_id");--> statement-breakpoint
CREATE INDEX "guard_checkpoint_lease_idx" ON "guard_event_checkpoints" USING btree ("locked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "guard_cluster_org_wave_unique" ON "guard_incident_clusters" USING btree ("organization_id","wave_key");--> statement-breakpoint
CREATE INDEX "guard_cluster_org_status_idx" ON "guard_incident_clusters" USING btree ("organization_id","status","last_detected_at");--> statement-breakpoint
CREATE INDEX "guard_channels_org_idx" ON "guard_notification_channels" USING btree ("organization_id","enabled");--> statement-breakpoint
CREATE INDEX "guard_playbook_runs_org_idx" ON "guard_playbook_runs" USING btree ("organization_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "guard_playbook_system_name_unique" ON "guard_playbooks" USING btree ("name") WHERE "guard_playbooks"."system_owned"=true;--> statement-breakpoint
CREATE INDEX "guard_policy_org_detected_idx" ON "guard_policy_changes" USING btree ("organization_id","detected_at");--> statement-breakpoint
CREATE INDEX "guard_provider_state_status_idx" ON "guard_provider_states" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "guard_risk_org_entity_idx" ON "guard_risk_snapshots" USING btree ("organization_id","entity_type","entity_id","calculated_at");--> statement-breakpoint
CREATE INDEX "guard_rules_org_enabled_idx" ON "guard_rules" USING btree ("organization_id","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "guard_signals_org_dedupe_unique" ON "guard_signals" USING btree ("organization_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "guard_signals_org_active_idx" ON "guard_signals" USING btree ("organization_id","status","detected_at");