import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const credentials = pgTable('credentials', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull().unique(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  scope: text('scope'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const runStatusEnum = pgEnum('run_status', ['pending', 'running', 'complete', 'failed']);

export const stageIdEnum = pgEnum('stage_id', [
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

export const stageStatusEnum = pgEnum('stage_status', [
  'pending',
  'running',
  'awaiting_approval',
  'approved',
  'failed',
  'skipped',
]);

export const assetKindEnum = pgEnum('asset_kind', [
  'tts',
  'image',
  'video_clip',
  'caption',
  'thumbnail',
]);

export const runs = pgTable(
  'runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: text('channel_id').notNull(),
    inputText: text('input_text').notNull(),
    status: runStatusEnum('status').notNull().default('pending'),
    paused: boolean('paused').notNull().default(false),
    autoApprove: boolean('auto_approve').notNull().default(false),
    inngestRunId: text('inngest_run_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('runs_channel_idx').on(t.channelId), index('runs_status_idx').on(t.status)],
);

export const stages = pgTable(
  'stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    stageId: stageIdEnum('stage_id').notNull(),
    status: stageStatusEnum('status').notNull().default('pending'),
    input: jsonb('input'),
    output: jsonb('output'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: text('approved_by'),
  },
  (t) => [
    index('stages_run_idx').on(t.runId),
    uniqueIndex('stages_run_stage_idx').on(t.runId, t.stageId),
  ],
);

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => runs.id, { onDelete: 'cascade' }),
    stageId: stageIdEnum('stage_id').notNull(),
    kind: assetKindEnum('kind').notNull(),
    url: text('url').notNull(),
    localPath: text('local_path'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('assets_run_idx').on(t.runId)],
);

export const runsRelations = relations(runs, ({ many }) => ({
  stages: many(stages),
  assets: many(assets),
}));

export const stagesRelations = relations(stages, ({ one }) => ({
  run: one(runs, { fields: [stages.runId], references: [runs.id] }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  run: one(runs, { fields: [assets.runId], references: [runs.id] }),
}));
