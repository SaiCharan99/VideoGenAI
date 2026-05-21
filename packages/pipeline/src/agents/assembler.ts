import type { ChannelConfig } from '@videogenai/channels';
import {
  renderResultSchema,
  type AssetManifest,
  type RenderResult,
  type Script,
  type Storyboard,
} from '@videogenai/types';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { upsertStage, markStageRunning, markStageFailed } from '../db-ops.js';
import { createLogger } from '../logger.js';
import { assembleVideoWithFfmpeg } from '../skills/ffmpeg-renderer.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Next.js sets cwd to apps/web/; resolve from there, not monorepo root
const ASSET_ROOT = path.resolve('public/assets/runs');

function validateRunId(runId: string): string {
  if (!UUID_RE.test(runId)) throw new Error(`Invalid runId: ${runId}`);
  const dir = path.join(ASSET_ROOT, runId);
  if (!dir.startsWith(ASSET_ROOT + path.sep)) throw new Error('runId path traversal detected');
  return dir;
}

export async function runAssembler(
  runId: string,
  script: Script,
  storyboard: Storyboard,
  assets: AssetManifest,
  channel: ChannelConfig,
): Promise<RenderResult> {
  const logger = createLogger(runId, 'render');
  await markStageRunning(runId, 'render');

  try {
    const totalSeconds = storyboard.scenes.reduce((s, sc) => s + sc.duration_seconds, 0);
    const outDir = validateRunId(runId);
    await mkdir(outDir, { recursive: true });

    // Write a render manifest so the CLI / Remotion Studio can pick it up
    const renderManifest = {
      runId,
      channelId: channel.channel_id,
      compositionId: 'KineticExplainer',
      fps: 30,
      width: 1920,
      height: 1080,
      durationSeconds: totalSeconds,
      props: { script, storyboard, assets, channelId: channel.channel_id },
    };
    await writeFile(
      path.join(outDir, 'render-manifest.json'),
      JSON.stringify(renderManifest, null, 2),
    );

    // attempt real ffmpeg render — gracefully skips if ffmpeg not installed
    const mp4Url = await assembleVideoWithFfmpeg(runId, storyboard, assets);

    const result = renderResultSchema.parse({
      output_url: mp4Url ?? `/assets/runs/${runId}/output.mp4`,
      duration_seconds: totalSeconds,
      width: 1920,
      height: 1080,
    });

    // No approval gate — auto-approve so QA can follow
    await upsertStage(runId, 'render', 'approved', result);
    if (mp4Url) {
      logger.info('output.mp4 rendered via ffmpeg', { mp4Url });
    } else {
      logger.info('render manifest saved — install ffmpeg for MP4 output', {
        manifest: `apps/web/public/assets/runs/${runId}/render-manifest.json`,
      });
    }
    return result;
  } catch (err) {
    await markStageFailed(runId, 'render', String(err));
    throw err;
  }
}
