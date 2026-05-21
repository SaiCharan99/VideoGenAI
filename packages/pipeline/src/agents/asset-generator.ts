import type { ChannelConfig } from '@videogenai/channels';
import {
  assetManifestSchema,
  type AssetManifest,
  type Script,
  type Storyboard,
  scriptSchema,
  storyboardSchema,
} from '@videogenai/types';
import { upsertStage, markStageRunning, markStageFailed } from '../db-ops.js';
import { createLogger } from '../logger.js';
import { generateTTS, fetchPexelsVideo, generateFluxImage } from '../skills/media.js';

export async function runAssetGenerator(
  runId: string,
  script: Script,
  storyboard: Storyboard,
  channel: ChannelConfig,
): Promise<AssetManifest> {
  const logger = createLogger(runId, 'assets');
  await markStageRunning(runId, 'assets');

  try {
    // Validate inputs before any side effects
    const validatedScript = scriptSchema.parse(script);
    const validatedStoryboard = storyboardSchema.parse(storyboard);

    const assets: AssetManifest['assets'] = [];

    // ── TTS narration ────────────────────────────────────────────────────────
    const narrationText = validatedScript.lines.map((l) => l.text).join(' ');
    let narration_url: string | undefined;
    try {
      narration_url = await generateTTS(runId, narrationText);
      logger.info('TTS complete', { narration_url });
    } catch (err) {
      logger.warn('TTS failed — proceeding without narration', { reason: String(err) });
    }

    // ── Per-scene media (parallel, best-effort) ──────────────────────────────
    const stockScenes = validatedStoryboard.scenes.filter((s) => s.visual_kind === 'stock_broll');
    const generatedScenes = validatedStoryboard.scenes.filter(
      (s) => s.visual_kind === 'generated_still',
    );
    const screenshotScenes = validatedStoryboard.scenes.filter(
      (s) => s.visual_kind === 'screenshot',
    );

    // ── Screenshot scenes — register synchronously ────────────────────────────
    for (const scene of screenshotScenes) {
      const localPath = scene.screenshot_path ?? null;
      assets.push({
        kind: 'screenshot',
        scene: scene.scene,
        url: localPath ? `/assets/${localPath}` : `/assets/sitespace/placeholder.png`,
        local_path: localPath ?? undefined,
      });
      logger.info('screenshot asset registered', { scene: scene.scene, localPath });
    }

    // ── Pexels stock scenes — sequential to avoid burst rate-limits ──────────
    for (const scene of stockScenes) {
      try {
        const result = await fetchPexelsVideo(scene.visual_description);
        if (result) {
          assets.push({
            kind: 'stock_broll',
            scene: scene.scene,
            url: result.url,
            provider: 'pexels',
            attribution: result.attribution,
          });
          logger.info('stock asset fetched', { scene: scene.scene });
        } else {
          logger.warn('no Pexels result for scene', { scene: scene.scene });
        }
      } catch (err) {
        logger.warn('stock asset fetch threw', { scene: scene.scene, reason: String(err) });
      }
      // small gap to stay well within Pexels burst limits
      await new Promise((r) => setTimeout(r, 500));
    }

    // ── AI-generated stills — parallel (Replicate handles concurrency) ────────
    const results = await Promise.allSettled([
      ...generatedScenes.map(async (scene) => {
        try {
          const url = await generateFluxImage(scene.visual_description);
          if (url) {
            assets.push({
              kind: 'generated_still',
              scene: scene.scene,
              url,
              prompt: scene.visual_description,
            });
            logger.info('AI image generated', { scene: scene.scene });
          } else {
            logger.warn('Flux generation returned null for scene', { scene: scene.scene });
          }
        } catch (err) {
          logger.warn('image generation threw', { scene: scene.scene, reason: String(err) });
        }
      }),
    ]);

    for (const r of results) {
      if (r.status === 'rejected') {
        logger.warn('unexpected allSettled rejection', { reason: String(r.reason) });
      }
    }

    assets.sort((a, b) => a.scene - b.scene);
    const manifest = assetManifestSchema.parse({ narration_url, assets });

    // No approval gate — mark approved immediately so assembler can proceed
    await upsertStage(runId, 'assets', 'approved', manifest);
    logger.info('complete', {
      assets: assets.length,
      hasNarration: !!narration_url,
      channel: channel.channel_id,
    });
    return manifest;
  } catch (err) {
    try {
      await markStageFailed(runId, 'assets', String(err));
    } catch (stageErr) {
      logger.error('markStageFailed threw', { reason: String(stageErr) });
    }
    throw err;
  }
}
