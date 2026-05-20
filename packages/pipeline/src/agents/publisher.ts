import { db, credentials } from '@videogenai/db';
import { publishResultSchema, type PublishResult, type QaReport } from '@videogenai/types';
import { eq } from 'drizzle-orm';
import { readFile, access } from 'fs/promises';
import path from 'path';
import { upsertStage, markStageRunning, markStageFailed } from '../db-ops.js';
import { createLogger } from '../logger.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASSET_ROOT = path.resolve('public/assets/runs');

function validateRunId(runId: string): string {
  if (!UUID_RE.test(runId)) throw new Error(`Invalid runId: ${runId}`);
  const dir = path.join(ASSET_ROOT, runId);
  if (!dir.startsWith(ASSET_ROOT + path.sep)) throw new Error('runId path traversal detected');
  return dir;
}

interface YouTubeToken {
  access_token: string;
  refresh_token: string;
  expires_at: Date | null;
}

async function getYouTubeToken(): Promise<YouTubeToken> {
  const cred = await db.query.credentials.findFirst({
    where: eq(credentials.provider, 'youtube'),
  });

  if (!cred?.accessToken || !cred.refreshToken) {
    throw new Error('YouTube not connected. Authenticate at /api/auth/youtube before publishing.');
  }

  const now = new Date();
  const expired = cred.expiresAt ? cred.expiresAt <= now : false;

  if (!expired) {
    return {
      access_token: cred.accessToken,
      refresh_token: cred.refreshToken,
      expires_at: cred.expiresAt,
    };
  }

  return refreshYouTubeToken(cred.refreshToken);
}

async function refreshYouTubeToken(refreshToken: string): Promise<YouTubeToken> {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET must be set');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh YouTube token: ${res.status} ${await res.text()}`);
  }

  interface TokenResponse {
    access_token: string;
    expires_in: number;
  }
  const data = (await res.json()) as TokenResponse;
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await db
    .update(credentials)
    .set({ accessToken: data.access_token, expiresAt, updatedAt: new Date() })
    .where(eq(credentials.provider, 'youtube'));

  return { access_token: data.access_token, refresh_token: refreshToken, expires_at: expiresAt };
}

async function uploadToYouTube(
  token: YouTubeToken,
  mp4Path: string,
  qaReport: QaReport,
): Promise<{ videoId: string }> {
  const fileBuffer = await readFile(mp4Path);

  const metadata = {
    snippet: {
      title: qaReport.publish_title,
      description: qaReport.publish_description,
      tags: qaReport.tags,
      categoryId: '25',
    },
    status: {
      privacyStatus: 'private',
      selfDeclaredMadeForKids: false,
    },
  };

  const boundary = '-------VideoGenAIBoundary';
  const metadataStr = JSON.stringify(metadata);

  const bodyParts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n`,
    ),
    Buffer.from(`--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ];
  const body = Buffer.concat(bodyParts);

  const res = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': `multipart/related; boundary="${boundary}"`,
        'Content-Length': String(body.length),
      },
      body,
    },
  );

  if (!res.ok) {
    throw new Error(`YouTube upload failed: ${res.status} ${await res.text()}`);
  }

  interface YouTubeVideoResponse {
    id: string;
  }
  const data = (await res.json()) as YouTubeVideoResponse;
  return { videoId: data.id };
}

export async function runPublisher(runId: string, qaReport: QaReport): Promise<PublishResult> {
  const logger = createLogger(runId, 'publish');
  await markStageRunning(runId, 'publish');
  logger.info('starting publisher');

  try {
    const runDir = validateRunId(runId);
    const mp4Path = path.join(runDir, 'output.mp4');

    try {
      await access(mp4Path);
    } catch {
      throw new Error(
        `MP4 not found at ${mp4Path}. Run "npx remotion render" with the render manifest first.`,
      );
    }

    const token = await getYouTubeToken();
    logger.info('YouTube token retrieved, uploading');

    const { videoId } = await uploadToYouTube(token, mp4Path, qaReport);
    const result = publishResultSchema.parse({
      youtube_video_id: videoId,
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      title: qaReport.publish_title,
      description: qaReport.publish_description,
      published_at: new Date().toISOString(),
    });

    await upsertStage(runId, 'publish', 'approved', result);
    logger.info('published to YouTube', { videoId, url: result.youtube_url });
    return result;
  } catch (err) {
    await markStageFailed(runId, 'publish', String(err));
    throw err;
  }
}
