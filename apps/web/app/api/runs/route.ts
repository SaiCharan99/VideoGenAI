import { db, runs, stages } from '@videogenai/db';
import { inngest } from '@videogenai/pipeline';
import { count, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const createRunSchema = z.object({
  channelId: z.string().regex(/^[a-z0-9-]+$/),
  inputText: z.string().min(10).max(500),
});

export async function GET() {
  const [allRuns, awaitingRows] = await Promise.all([
    db.query.runs.findMany({ orderBy: [desc(runs.createdAt)], limit: 50 }),
    db.select({ count: count() }).from(stages).where(eq(stages.status, 'awaiting_approval')),
  ]);

  return NextResponse.json({ runs: allRuns, awaitingApproval: awaitingRows[0]?.count ?? 0 });
}

export async function POST(req: Request) {
  const body: unknown = await req.json();
  const parsed = createRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [run] = await db
    .insert(runs)
    .values({ channelId: parsed.data.channelId, inputText: parsed.data.inputText })
    .returning();

  if (!run) return NextResponse.json({ error: 'insert failed' }, { status: 500 });

  await inngest.send({
    name: 'videogenai/run.start',
    data: { runId: run.id, channelId: run.channelId, inputText: run.inputText },
  });

  return NextResponse.json({ runId: run.id }, { status: 201 });
}
