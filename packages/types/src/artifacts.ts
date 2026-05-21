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
    'screenshot',
  ]),
  visual_description: z.string(),
  screenshot_path: z.string().optional(),
  text_overlay: z.string().optional(),
  audio_note: z.string().optional(),
});
export const storyboardSchema = z.object({
  scenes: z.array(storyboardSceneSchema),
});
export type Storyboard = z.infer<typeof storyboardSchema>;
export type StoryboardScene = z.infer<typeof storyboardSceneSchema>;

// ── Phase 5: Asset manifest ─────────────────────────────────────────────────

export const ttsAssetSchema = z.object({
  kind: z.literal('tts_audio'),
  scene: z.number().int(),
  url: z.string(),
  duration_seconds: z.number().optional(),
});

export const stockBrollAssetSchema = z.object({
  kind: z.literal('stock_broll'),
  scene: z.number().int(),
  url: z.string().url(),
  provider: z.string(),
  attribution: z.string().optional(),
});

export const generatedStillAssetSchema = z.object({
  kind: z.literal('generated_still'),
  scene: z.number().int(),
  url: z.string().url(),
  prompt: z.string(),
});

export const screenshotAssetSchema = z.object({
  kind: z.literal('screenshot'),
  scene: z.number().int(),
  url: z.string(),
  local_path: z.string().optional(),
});

export const assetSchema = z.discriminatedUnion('kind', [
  ttsAssetSchema,
  stockBrollAssetSchema,
  generatedStillAssetSchema,
  screenshotAssetSchema,
]);
export type Asset = z.infer<typeof assetSchema>;

export const assetManifestSchema = z.object({
  narration_url: z.string().optional(),
  assets: z.array(assetSchema),
});
export type AssetManifest = z.infer<typeof assetManifestSchema>;

export const renderResultSchema = z.object({
  output_url: z.string(),
  duration_seconds: z.number().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type RenderResult = z.infer<typeof renderResultSchema>;

// ── Phase 6: QA report ──────────────────────────────────────────────────────

export const qaIssueSchema = z.object({
  severity: z.enum(['critical', 'warning', 'info']),
  category: z.enum(['content', 'technical', 'compliance']),
  description: z.string(),
  suggested_fix: z.string().optional(),
});

export const qaReportSchema = z.object({
  verdict: z.enum(['approved', 'approved_with_notes', 'rejected']),
  quality_score: z.number().min(0).max(1),
  content_score: z.number().min(0).max(1),
  asset_score: z.number().min(0).max(1),
  issues: z.array(qaIssueSchema),
  summary: z.string(),
  publish_title: z.string().max(100),
  publish_description: z.string(),
  tags: z.array(z.string()),
});
export type QaReport = z.infer<typeof qaReportSchema>;

// ── Phase 6: Publish result ─────────────────────────────────────────────────

export const publishResultSchema = z.object({
  youtube_video_id: z.string(),
  youtube_url: z.string().url(),
  title: z.string(),
  description: z.string(),
  published_at: z.string(),
});
export type PublishResult = z.infer<typeof publishResultSchema>;
