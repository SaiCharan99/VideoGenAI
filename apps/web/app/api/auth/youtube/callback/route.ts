import { db, credentials } from '@videogenai/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/?youtube_auth=denied`,
    );
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri =
    process.env.YOUTUBE_REDIRECT_URI ?? 'http://localhost:3000/api/auth/youtube/callback';

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'YouTube credentials not configured' }, { status: 503 });
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.json(
      { error: `Token exchange failed: ${await tokenRes.text()}` },
      { status: 502 },
    );
  }

  interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  }
  const data = (await tokenRes.json()) as TokenResponse;
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  await db
    .insert(credentials)
    .values({
      provider: 'youtube',
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scope: data.scope,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [credentials.provider],
      set: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt,
        scope: data.scope,
        updatedAt: new Date(),
      },
    });

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/?youtube_auth=connected`,
  );
}
