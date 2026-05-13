import { z } from 'zod';

const audienceSchema = z.object({
  description: z.string(),
  assumed_knowledge_level: z.enum(['low', 'medium', 'high']),
});

const toneSchema = z.object({
  voice: z.enum(['casual', 'authoritative', 'playful', 'explainer']),
  notes: z.string().optional(),
});

const researchSchema = z.object({
  min_sources: z.number().int().min(1),
  recency_window_days: z.number().int().min(1),
  require_primary_sources: z.boolean(),
  source_balance: z.array(z.string()).optional(),
  blocked_sources: z.array(z.string()).default([]),
});

const biasRulesSchema = z.array(z.string()).min(1);

const jargonSchema = z.object({
  explain_threshold: z.string(),
  include_history: z.boolean(),
});

const visualStyleSchema = z.object({
  template: z.enum(['kinetic-explainer']),
  palette: z.array(z.string()),
  font: z.string(),
  motion_intensity: z.enum(['subtle', 'balanced', 'snappy']),
  broll_policy: z.enum(['stock_preferred', 'mixed', 'generated_allowed']),
});

const publishSchema = z.object({
  auto_upload: z.boolean(),
  shorts_variant: z.boolean(),
  description_template: z.string(),
});

export const channelConfigSchema = z.object({
  channel_id: z.string().regex(/^[a-z0-9-]+$/, 'Must be kebab-case'),
  display_name: z.string(),
  audience: audienceSchema,
  tone: toneSchema,
  length_target_seconds: z.tuple([z.number().int(), z.number().int()]),
  research: researchSchema,
  bias_rules: biasRulesSchema,
  jargon: jargonSchema,
  visual_style: visualStyleSchema,
  publish: publishSchema,
});

export type ChannelConfig = z.infer<typeof channelConfigSchema>;
