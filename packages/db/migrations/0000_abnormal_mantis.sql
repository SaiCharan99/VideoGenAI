CREATE TYPE "public"."asset_kind" AS ENUM('tts', 'image', 'video_clip', 'caption', 'thumbnail');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('pending', 'running', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."stage_id" AS ENUM('brief', 'research', 'jargon', 'script', 'fact-check', 'storyboard', 'assets', 'render', 'qa', 'publish');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('pending', 'running', 'awaiting_approval', 'approved', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"stage_id" "stage_id" NOT NULL,
	"kind" "asset_kind" NOT NULL,
	"url" text NOT NULL,
	"local_path" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" text NOT NULL,
	"input_text" text NOT NULL,
	"status" "run_status" DEFAULT 'pending' NOT NULL,
	"inngest_run_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"stage_id" "stage_id" NOT NULL,
	"status" "stage_status" DEFAULT 'pending' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" text
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_run_idx" ON "assets" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "runs_channel_idx" ON "runs" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "runs_status_idx" ON "runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stages_run_idx" ON "stages" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "stages_run_stage_idx" ON "stages" USING btree ("run_id","stage_id");