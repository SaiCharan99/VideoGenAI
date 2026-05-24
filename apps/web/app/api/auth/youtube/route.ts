import { NextResponse } from 'next/server';

export function GET() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const redirectUri =
    process.env.YOUTUBE_REDIRECT_URI ?? 'http://localhost:3000/api/auth/youtube/callback';

  if (!clientId) {
    return NextResponse.json({ error: 'YOUTUBE_CLIENT_ID not configured' }, { status: 503 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube',
    access_type: 'offline',
    prompt: 'consent',
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
