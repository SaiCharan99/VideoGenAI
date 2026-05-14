import { z } from 'zod';

export const briefSchema = z.object({
  angle: z.string(),
  audience_note: z.string(),
  length_seconds: z.tuple([z.number(), z.number()]),
  must_cover: z.array(z.string()),
  must_avoid: z.array(z.string()),
  tone_note: z.string(),
});
export type Brief = z.infer<typeof briefSchema>;

export const sourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  publication: z.string(),
  published_at: z.string().optional(),
  excerpt: z.string(),
});
export type Source = z.infer<typeof sourceSchema>;

export const factPackSchema = z.object({
  sources: z.array(sourceSchema),
  facts: z.array(
    z.object({
      claim: z.string(),
      source_ids: z.array(z.string()).min(1),
    }),
  ),
  balance_check: z.object({
    passed: z.boolean(),
    note: z.string().optional(),
  }),
});
export type FactPack = z.infer<typeof factPackSchema>;

export const jargonListSchema = z.object({
  terms: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
      historical_context: z.string().optional(),
    }),
  ),
});
export type JargonList = z.infer<typeof jargonListSchema>;

export const scriptLineSchema = z.object({
  scene: z.number().int(),
  text: z.string(),
  source_ids: z.array(z.string()),
  speaker_note: z.string().optional(),
});
export const scriptSchema = z.object({
  title: z.string(),
  description: z.string(),
  lines: z.array(scriptLineSchema),
  estimated_duration_seconds: z.number(),
});
export type Script = z.infer<typeof scriptSchema>;

export const factCheckReportSchema = z.object({
  verdict: z.enum(['pass', 'pass_with_warnings', 'fail']),
  sourcing_score: z.number().min(0).max(1),
  balance_score: z.number().min(0).max(1),
  issues: z.array(
    z.object({
      severity: z.enum(['critical', 'warning', 'info']),
      scene: z.number().int().optional(),
      description: z.string(),
      suggested_fix: z.string().optional(),
    }),
  ),
  summary: z.string(),
});
export type FactCheckReport = z.infer<typeof factCheckReportSchema>;

export const storyboardSceneSchema = z.object({
  scene: z.number().int(),
  duration_seconds: z.number(),
  visual_kind: z.enum([
    'text_card',
    'kinetic_text',
    'chart',
    'stock_broll',
    'generated_still',
    'generated_clip',
    'map',
  ]),
  visual_description: z.string(),
  text_overlay: z.string().optional(),
  audio_note: z.string().optional(),
});
export const storyboardSchema = z.object({
  scenes: z.array(storyboardSceneSchema),
});
export type Storyboard = z.infer<typeof storyboardSchema>;
