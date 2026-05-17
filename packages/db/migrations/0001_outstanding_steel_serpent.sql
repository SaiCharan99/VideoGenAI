DROP INDEX "stages_run_stage_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "stages_run_stage_idx" ON "stages" USING btree ("run_id","stage_id");