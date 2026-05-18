import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

// ── ElevenLabs TTS ──────────────────────────────────────────────────────────

export async function generateTTS(runId: string, text: string): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not set');

  const voiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? 'pNInz6obpgDQGcFmaJgB';

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
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
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${await res.text()}`);
  }

  const dir = path.resolve(`apps/web/public/assets/runs/${runId}`);
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

export async function fetchPexelsVideo(query: string): Promise<PexelsResult | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
    { headers: { Authorization: apiKey } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    videos?: {
      video_files: { link: string; quality: string; width: number }[];
      user: { name: string };
    }[];
  };

  const video = data.videos?.[0];
  if (!video) return null;

  // Prefer HD, fall back to first available
  const file =
    video.video_files.find((f) => f.quality === 'hd' && f.width >= 1280) ?? video.video_files[0];
  if (!file) return null;

  return { url: file.link, attribution: `Video by ${video.user.name} on Pexels` };
}

// ── Replicate Flux image generation ─────────────────────────────────────────

export async function generateFluxImage(prompt: string): Promise<string | null> {
  const apiKey = process.env.REPLICATE_API_TOKEN;
  if (!apiKey) return null;

  // Use flux-schnell with `Prefer: wait` for synchronous response
  const res = await fetch(
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
  );

  if (!res.ok) return null;

  const data = (await res.json()) as { output?: string[]; urls?: { get: string } };

  // Synchronous response (Prefer: wait) returns output directly
  if (Array.isArray(data.output) && data.output[0]) return data.output[0];

  // Async fallback: poll until done
  if (data.urls?.get) {
    return pollReplicatePrediction(data.urls.get, apiKey);
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
    const res = await fetch(getUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as { status: string; output?: string[] };
    if (data.status === 'succeeded') return data.output?.[0] ?? null;
    if (data.status === 'failed' || data.status === 'canceled') return null;
  }
  return null;
}
