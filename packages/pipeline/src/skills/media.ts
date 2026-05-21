import { z } from 'zod';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

// ── Shared helpers ───────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Next.js sets cwd to apps/web/; resolve from there, not monorepo root
const ASSET_ROOT = path.resolve('public/assets/runs');

function validateRunId(runId: string): string {
  if (!UUID_RE.test(runId)) throw new Error(`Invalid runId: ${runId}`);
  const dir = path.join(ASSET_ROOT, runId);
  if (!dir.startsWith(ASSET_ROOT + path.sep)) throw new Error('runId path traversal detected');
  return dir;
}

function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 30_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// ── ElevenLabs TTS ──────────────────────────────────────────────────────────

export async function generateTTS(runId: string, text: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const voiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB';

  const res = await fetchWithTimeout(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
    60_000,
  );

  if (!res.ok) {
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${await res.text()}`);
  }

  const dir = validateRunId(runId);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, 'narration.mp3');
  await writeFile(filePath, Buffer.from(await res.arrayBuffer()));

  return `/assets/runs/${runId}/narration.mp3`;
}

// ── Pexels stock video ───────────────────────────────────────────────────────

interface PexelsResult {
  url: string;
  attribution: string;
}

const pexelsResponseSchema = z.object({
  videos: z
    .array(
      z.object({
        video_files: z.array(
          z.object({ link: z.string(), quality: z.string(), width: z.number() }),
        ),
        user: z.object({ name: z.string() }),
      }),
    )
    .optional(),
});

export async function fetchPexelsVideo(query: string): Promise<PexelsResult | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const res = await fetchWithTimeout(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
    {
      headers: { Authorization: apiKey },
      // disable Next.js fetch cache — each call must hit the network
      cache: 'no-store',
    },
    20_000,
  );
  if (!res.ok) return null;

  const parsed = pexelsResponseSchema.safeParse(await res.json());
  if (!parsed.success) return null;

  const video = parsed.data.videos?.[0];
  if (!video) return null;

  const file =
    video.video_files.find((f) => f.quality === 'hd' && f.width >= 1280) ?? video.video_files[0];
  if (!file) return null;

  return { url: file.link, attribution: `Video by ${video.user.name} on Pexels` };
}

// ── Replicate Flux image generation ─────────────────────────────────────────

const replicateInitSchema = z.object({
  output: z.array(z.string()).optional(),
  urls: z.object({ get: z.string() }).optional(),
});

const replicatePollSchema = z.object({
  status: z.string(),
  output: z.array(z.string()).optional(),
});

export async function generateFluxImage(prompt: string): Promise<string | null> {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) return null;

  const res = await fetchWithTimeout(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        input: { prompt, width: 1920, height: 1080, num_outputs: 1, output_format: 'webp' },
      }),
    },
    30_000,
  );

  if (!res.ok) return null;

  const parsed = replicateInitSchema.safeParse(await res.json());
  if (!parsed.success) return null;

  if (Array.isArray(parsed.data.output) && parsed.data.output[0]) return parsed.data.output[0];

  if (parsed.data.urls?.get) {
    return pollReplicatePrediction(parsed.data.urls.get, apiKey);
  }

  return null;
}

async function pollReplicatePrediction(
  getUrl: string,
  apiKey: string,
  maxAttempts = 30,
): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetchWithTimeout(
      getUrl,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      10_000,
    );
    if (!res.ok) return null;
    const parsed = replicatePollSchema.safeParse(await res.json());
    if (!parsed.success) return null;
    if (parsed.data.status === 'succeeded') return parsed.data.output?.[0] ?? null;
    if (parsed.data.status === 'failed' || parsed.data.status === 'canceled') return null;
  }
  return null;
}
