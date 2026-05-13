import { loadChannel } from '@videogenai/channels';
import { db, runs } from '@videogenai/db';
import { eq } from 'drizzle-orm';
import { runBriefBuilder } from '../agents/brief-builder.js';
import { runResearcher } from '../agents/researcher.js';
import { runScriptwriter } from '../agents/scriptwriter.js';
import { markStageFailed } from '../db-ops.js';
import { inngest } from './client.js';

export const pipelineRun = inngest.createFunction(
  {
    id: 'pipeline-run',
    retries: 0,
    onFailure: async ({ event }) => {
      const originalEvent = event.data.event as { data: { runId: string } };
      const runId = originalEvent.data.runId;
      await db
        .update(runs)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(runs.id, runId));
    },
  },
  { event: 'videogenai/run.start' },
  async ({ event, step }) => {
    const { runId, channelId, inputText } = event.data;
    const channel = loadChannel(channelId);

    await db
      .update(runs)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(runs.id, runId));

    // ── Stage 1: Brief ──────────────────────────────────────────────────────
    const brief = await step.run('stage/brief', async () => {
      try {
        return await runBriefBuilder(runId, inputText, channel);
      } catch (err) {
        await markStageFailed(runId, 'brief', String(err));
        throw err;
      }
    });

    const briefApproval = await step.waitForEvent('brief/approved', {
      event: 'videogenai/stage.approved',
      if: `event.data.runId == async.data.runId && async.data.stageId == 'brief'`,
      timeout: '7d',
    });
    if (!briefApproval) throw new Error('brief stage approval timed out after 7 days');

    // ── Stage 2: Research ───────────────────────────────────────────────────
    const factPack = await step.run('stage/research', async () => {
      try {
        return await runResearcher(runId, brief, channel);
      } catch (err) {
        await markStageFailed(runId, 'research', String(err));
        throw err;
      }
    });

    const researchApproval = await step.waitForEvent('research/approved', {
      event: 'videogenai/stage.approved',
      if: `event.data.runId == async.data.runId && async.data.stageId == 'research'`,
      timeout: '7d',
    });
    if (!researchApproval) throw new Error('research stage approval timed out after 7 days');

    // ── Stage 4: Script ─────────────────────────────────────────────────────
    const script = await step.run('stage/script', async () => {
      try {
        return await runScriptwriter(runId, brief, factPack, channel);
      } catch (err) {
        await markStageFailed(runId, 'script', String(err));
        throw err;
      }
    });

    const scriptApproval = await step.waitForEvent('script/approved', {
      event: 'videogenai/stage.approved',
      if: `event.data.runId == async.data.runId && async.data.stageId == 'script'`,
      timeout: '7d',
    });
    if (!scriptApproval) throw new Error('script stage approval timed out after 7 days');

    await db
      .update(runs)
      .set({ status: 'complete', updatedAt: new Date() })
      .where(eq(runs.id, runId));

    return { runId, brief, factPack, script };
  },
);
