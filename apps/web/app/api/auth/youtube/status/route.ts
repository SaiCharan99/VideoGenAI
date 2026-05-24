import { db, credentials } from '@videogenai/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  const configured = !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
  if (!configured) {
    return NextResponse.json({ connected: false, reason: 'credentials_not_configured' });
  }

  const cred = await db.query.credentials.findFirst({
    where: eq(credentials.provider, 'youtube'),
    columns: { accessToken: true, expiresAt: true },
  });

  if (!cred?.accessToken) {
    return NextResponse.json({ connected: false, reason: 'not_authenticated' });
  }

  const expired = cred.expiresAt ? cred.expiresAt <= new Date() : false;
  return NextResponse.json({ connected: true, expired });
}
