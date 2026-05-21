import { execFile } from 'child_process';
import { createWriteStream, existsSync } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { createLogger } from '../logger.js';
import type { AssetManifest, Storyboard } from '@videogenai/types';

const execFileAsync = promisify(execFile);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASSET_ROOT = path.resolve('public/assets/runs');

function validateRunId(runId: string): string {
  if (!UUID_RE.test(runId)) throw new Error(`Invalid runId: ${runId}`);
  const dir = path.join(ASSET_ROOT, runId);
  if (!dir.startsWith(ASSET_ROOT + path.sep)) throw new Error('runId path traversal detected');
  return dir;
}

async function ffmpegBin(): Promise<string | null> {
  for (const candidate of ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', 'ffmpeg']) {
    try {
      await execFileAsync(candidate, ['-version']);
      return candidate;
    } catch {
      // not found at this path
    }
  }
  return null;
}

async function fetchToFile(url: string, dest: string, timeoutMs = 60_000): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const writer = createWriteStream(dest);
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No body reader');
  const pump = async (): Promise<void> => {
    const { done, value } = await reader.read();
    if (done) {
      writer.end();
      return;
    }
    await new Promise<void>((res, rej) => writer.write(value, (e) => (e ? rej(e) : res())));
    return pump();
  };
  await pump();
}

// Ken Burns zoom-pan on a still image → silent MP4 clip
async function makeImageClip(
  ffmpeg: string,
  imagePath: string,
  durationSec: number,
  outPath: string,
): Promise<void> {
  const fps = 30;
  const totalFrames = Math.ceil(durationSec * fps);
  // slow zoom from 1.0 to 1.08 over the clip
  const zoomExpr = `min(zoom+0.0004,1.08)`;
  await execFileAsync(ffmpeg, [
    '-loop',
    '1',
    '-i',
    imagePath,
    '-vf',
    [
      `scale=1920:1080:force_original_aspect_ratio=increase`,
      `crop=1920:1080`,
      `zoompan=z='${zoomExpr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1920x1080:fps=${fps}`,
    ].join(','),
    '-t',
    String(durationSec),
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-pix_fmt',
    'yuv420p',
    '-y',
    outPath,
  ]);
}

// Trim a video file (first durationSec seconds) → silent MP4 clip
async function makeVideoClip(
  ffmpeg: string,
  inputPath: string,
  durationSec: number,
  outPath: string,
): Promise<void> {
  await execFileAsync(ffmpeg, [
    '-i',
    inputPath,
    '-t',
    String(durationSec),
    '-vf',
    'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-pix_fmt',
    'yuv420p',
    '-y',
    outPath,
  ]);
}

// Black frame fallback clip when no visual asset is available
async function makeBlackClip(ffmpeg: string, durationSec: number, outPath: string): Promise<void> {
  await execFileAsync(ffmpeg, [
    '-f',
    'lavfi',
    '-i',
    `color=black:s=1920x1080:r=30:d=${durationSec}`,
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-pix_fmt',
    'yuv420p',
    '-y',
    outPath,
  ]);
}

export async function assembleVideoWithFfmpeg(
  runId: string,
  storyboard: Storyboard,
  assets: AssetManifest,
): Promise<string | null> {
  const logger = createLogger(runId, 'ffmpeg');
  const ffmpeg = await ffmpegBin();
  if (!ffmpeg) {
    logger.warn('ffmpeg not found — skipping MP4 render. Install with: brew install ffmpeg');
    return null;
  }

  const outDir = validateRunId(runId);
  const tmpDir = path.join(outDir, 'tmp');
  await mkdir(tmpDir, { recursive: true });

  try {
    const sceneClips: string[] = [];

    // build an index of assets by scene number
    const assetByScene = new Map<number, (typeof assets.assets)[number]>();
    for (const a of assets.assets) {
      assetByScene.set(a.scene, a);
    }

    for (const scene of storyboard.scenes) {
      const clipPath = path.join(tmpDir, `scene-${scene.scene}.mp4`);
      const asset = assetByScene.get(scene.scene);

      try {
        if (asset?.kind === 'screenshot') {
          // asset.url is the web-root path e.g. /assets/sitespace/home.png
          // resolve it relative to the Next.js public/ directory
          const absPath = path.resolve('public', asset.url.replace(/^\//, ''));
          if (existsSync(absPath)) {
            await makeImageClip(ffmpeg, absPath, scene.duration_seconds, clipPath);
            logger.info(`scene ${scene.scene}: screenshot clip done`);
          } else {
            logger.warn(`scene ${scene.scene}: screenshot not found at ${absPath}, using black`);
            await makeBlackClip(ffmpeg, scene.duration_seconds, clipPath);
          }
        } else if (asset?.kind === 'stock_broll' || asset?.kind === 'generated_still') {
          const videoUrl = asset.url;
          const tmpVideo = path.join(tmpDir, `dl-${scene.scene}.mp4`);
          try {
            await fetchToFile(videoUrl, tmpVideo, 120_000);
            await makeVideoClip(ffmpeg, tmpVideo, scene.duration_seconds, clipPath);
            logger.info(`scene ${scene.scene}: stock clip done`);
          } catch (dlErr) {
            logger.warn(`scene ${scene.scene}: download/trim failed — using black`, {
              reason: String(dlErr),
            });
            await makeBlackClip(ffmpeg, scene.duration_seconds, clipPath);
          }
        } else {
          // no visual asset — black frame
          await makeBlackClip(ffmpeg, scene.duration_seconds, clipPath);
          logger.info(`scene ${scene.scene}: black frame (no asset)`);
        }
      } catch (err) {
        logger.warn(`scene ${scene.scene}: clip generation failed — using black`, {
          reason: String(err),
        });
        await makeBlackClip(ffmpeg, scene.duration_seconds, clipPath);
      }

      sceneClips.push(clipPath);
    }

    // write concat list
    const concatListPath = path.join(tmpDir, 'concat.txt');
    await writeFile(concatListPath, sceneClips.map((p) => `file '${p}'`).join('\n'));

    // concatenate all clips into silent video
    const silentVideoPath = path.join(tmpDir, 'silent.mp4');
    await execFileAsync(ffmpeg, [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListPath,
      '-c',
      'copy',
      '-y',
      silentVideoPath,
    ]);

    const outputPath = path.join(outDir, 'output.mp4');

    // mix narration if available
    const narrationPath = assets.narration_url ? path.join(outDir, 'narration.mp3') : null;

    if (narrationPath && existsSync(narrationPath)) {
      // mix audio: narration at full volume, shortest to match video length
      await execFileAsync(ffmpeg, [
        '-i',
        silentVideoPath,
        '-i',
        narrationPath,
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-shortest',
        '-y',
        outputPath,
      ]);
      logger.info('output.mp4 written with narration audio');
    } else {
      // no audio — just copy the silent video
      await execFileAsync(ffmpeg, ['-i', silentVideoPath, '-c', 'copy', '-y', outputPath]);
      logger.info('output.mp4 written (no narration)');
    }

    // clean up tmp directory
    await rm(tmpDir, { recursive: true, force: true });

    return `/assets/runs/${runId}/output.mp4`;
  } catch (err) {
    logger.error('ffmpeg assembly failed', { reason: String(err) });
    // clean up on failure too
    await rm(tmpDir, { recursive: true, force: true }).catch((_e: unknown) => undefined);
    return null;
  }
}
