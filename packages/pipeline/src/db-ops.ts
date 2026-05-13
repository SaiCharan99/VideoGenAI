import { db, stages } from '@videogenai/db';
import { type StageId, type StageStatus } from '@videogenai/types';
import { eq, and } from 'drizzle-orm';

export async function upsertStage(
  runId: string,
  stageId: StageId,
  status: StageStatus,
  output?: unknown,
  error?: string,
): Promise<void> {
  await db
    .insert(stages)
    .values({
      runId,
      stageId,
      status,
      output: output,
      error,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [stages.runId, stages.stageId],
      set: {
        status,
        output: output,
        error,
        updatedAt: new Date(),
      },
    });
}

export async function markStageRunning(runId: string, stageId: StageId): Promise<void> {
  await upsertStage(runId, stageId, 'running');
}

export async function markStageAwaitingApproval(
  runId: string,
  stageId: StageId,
  output: unknown,
): Promise<void> {
  await upsertStage(runId, stageId, 'awaiting_approval', output);
}

export async function markStageFailed(
  runId: string,
  stageId: StageId,
  error: string,
): Promise<void> {
  await upsertStage(runId, stageId, 'failed', undefined, error);
}

export async function approveStage(
  runId: string,
  stageId: StageId,
  approvedBy = 'human',
): Promise<void> {
  await db
    .update(stages)
    .set({ status: 'approved', approvedAt: new Date(), approvedBy, updatedAt: new Date() })
    .where(and(eq(stages.runId, runId), eq(stages.stageId, stageId)));
}
