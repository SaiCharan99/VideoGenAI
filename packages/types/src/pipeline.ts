import { z } from 'zod';

export const stageIdSchema = z.enum([
  'brief',
  'research',
  'jargon',
  'script',
  'fact-check',
  'storyboard',
  'assets',
  'render',
  'qa',
  'publish',
]);
export type StageId = z.infer<typeof stageIdSchema>;

export const stageStatusSchema = z.enum([
  'pending',
  'running',
  'awaiting_approval',
  'approved',
  'failed',
  'skipped',
]);
export type StageStatus = z.infer<typeof stageStatusSchema>;

export const runStatusSchema = z.enum(['pending', 'running', 'complete', 'failed']);
export type RunStatus = z.infer<typeof runStatusSchema>;

export interface StageCtx {
  runId: string;
  channelId: string;
  logger: Logger;
}

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export interface Stage<TInput, TOutput> {
  id: StageId;
  run(input: TInput, ctx: StageCtx): Promise<TOutput>;
}
