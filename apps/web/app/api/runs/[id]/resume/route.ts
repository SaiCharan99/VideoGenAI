import { db, runs } from '@videogenai/db';
import { inngest } from '@videogenai/pipeline';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const run = await db.query.runs.findFirst({
    where: eq(runs.id, id),
    columns: { status: true, paused: true },
  });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!run.paused) return NextResponse.json({ error: 'run is not paused' }, { status: 409 });

  await db.update(runs).set({ paused: false, updatedAt: new Date() }).where(eq(runs.id, id));

  await inngest.send({ name: 'videogenai/run.resumed', data: { runId: id } });

  return NextResponse.json({ ok: true });
}
