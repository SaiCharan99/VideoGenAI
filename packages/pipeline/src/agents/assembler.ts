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
    const outDir = path.resolve(`apps/web/public/assets/runs/${runId}`);
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

    const result = renderResultSchema.parse({
      output_url: `/assets/runs/${runId}/output.mp4`,
      duration_seconds: totalSeconds,
      width: 1920,
      height: 1080,
    });

    // No approval gate — auto-approve so QA can follow
    await upsertStage(runId, 'render', 'approved', result);
    logger.info('render manifest saved — invoke remotion render to produce MP4', {
      manifest: `apps/web/public/assets/runs/${runId}/render-manifest.json`,
    });
    return result;
  } catch (err) {
    await markStageFailed(runId, 'render', String(err));
    throw err;
  }
}
