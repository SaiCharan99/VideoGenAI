import { db, runs, stages } from '@videogenai/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const run = await db.query.runs.findFirst({ where: eq(runs.id, id) });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const stageRows = await db.query.stages.findMany({
    where: eq(stages.runId, id),
    orderBy: (s, { asc }) => [asc(s.createdAt)],
  });

  return NextResponse.json({ run, stages: stageRows });
}
