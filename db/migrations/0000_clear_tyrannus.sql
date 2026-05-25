CREATE TYPE "public"."actor_type" AS ENUM('human', 'agent', 'system');--> statement-breakpoint
CREATE TYPE "public"."context_status" AS ENUM('active', 'paused', 'waiting', 'blocked', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."context_type" AS ENUM('project', 'area', 'resource', 'archive_item');--> statement-breakpoint
CREATE TYPE "public"."page_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."page_type" AS ENUM('normal_page', 'project_state', 'blueprint', 'handoff', 'changelog', 'meeting_note', 'scratch_note', 'reference', 'archived_note');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."privacy_level" AS ENUM('normal', 'private', 'locked');--> statement-breakpoint
CREATE TYPE "public"."workspace_para_type" AS ENUM('projects', 'areas', 'resources', 'archive', 'custom');--> statement-breakpoint
CREATE TABLE "contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"context_type" "context_type" DEFAULT 'project' NOT NULL,
	"status" "context_status" DEFAULT 'active' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"current_objective" text,
	"current_phase" text,
	"next_action" text,
	"agent_access_enabled" boolean DEFAULT true NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"change_summary" text,
	"changed_by_type" "actor_type" DEFAULT 'human' NOT NULL,
	"changed_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"context_id" uuid,
	"parent_id" uuid,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"page_type" "page_type" DEFAULT 'normal_page' NOT NULL,
	"content_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_md" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "page_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"agent_access_enabled" boolean DEFAULT true NOT NULL,
	"created_by" "actor_type" DEFAULT 'human' NOT NULL,
	"updated_by" "actor_type" DEFAULT 'human' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"para_type" "workspace_para_type" DEFAULT 'custom' NOT NULL,
	"privacy_level" "privacy_level" DEFAULT 'normal' NOT NULL,
	"agent_access_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "contexts" ADD CONSTRAINT "contexts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contexts" ADD CONSTRAINT "contexts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_context_id_contexts_id_fk" FOREIGN KEY ("context_id") REFERENCES "public"."contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contexts_workspace_slug_unique" ON "contexts" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "contexts_workspace_idx" ON "contexts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "contexts_owner_idx" ON "contexts" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "page_versions_page_version_unique" ON "page_versions" USING btree ("page_id","version");--> statement-breakpoint
CREATE INDEX "page_versions_page_idx" ON "page_versions" USING btree ("page_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pages_parent_slug_unique" ON "pages" USING btree ("parent_id","slug");--> statement-breakpoint
CREATE INDEX "pages_workspace_idx" ON "pages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "pages_context_idx" ON "pages" USING btree ("context_id");--> statement-breakpoint
CREATE INDEX "pages_parent_idx" ON "pages" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "pages_owner_idx" ON "pages" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_owner_slug_unique" ON "workspaces" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE INDEX "workspaces_owner_idx" ON "workspaces" USING btree ("owner_id");