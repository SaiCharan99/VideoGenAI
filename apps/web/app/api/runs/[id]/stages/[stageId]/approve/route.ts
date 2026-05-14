import { db, stages } from '@videogenai/db';
import { inngest } from '@videogenai/pipeline';
import { stageIdSchema } from '@videogenai/types';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; stageId: string }> },
) {
  const { id: runId, stageId: rawStageId } = await params;

  const parsed = stageIdSchema.safeParse(rawStageId);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid stageId' }, { status: 400 });
  }
  const stageId = parsed.data;

  await db
    .update(stages)
    .set({ status: 'approved', approvedAt: new Date(), approvedBy: 'human', updatedAt: new Date() })
    .where(and(eq(stages.runId, runId), eq(stages.stageId, stageId)));

  await inngest.send({ name: 'videogenai/stage.approved', data: { runId, stageId } });

  return NextResponse.json({ ok: true });
}
