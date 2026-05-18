import { db, runs } from '@videogenai/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const run = await db.query.runs.findFirst({ where: eq(runs.id, id), columns: { status: true } });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (run.status !== 'running') {
    return NextResponse.json({ error: 'run is not active' }, { status: 409 });
  }

  await db.update(runs).set({ paused: true, updatedAt: new Date() }).where(eq(runs.id, id));

  return NextResponse.json({ ok: true });
}
