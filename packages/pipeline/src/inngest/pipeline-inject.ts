/**
 * Fast-track pipeline variant.
 *
 * Accepts a pre-built script + storyboard (stages 1-6 bypassed) and runs
 * stages 7-10: asset generation → ffmpeg render → QA → YouTube publish.
 *
 * Triggered by the `videogenai/run.inject` event, which is fired from
 * POST /api/runs/inject.
 */
import { loadChannel } from '@videogenai/channels';
import { db, runs } from '@videogenai/db';
import {
  type QaReport,
  type StageId,
  scriptSchema,
  storyboardSchema,
  qaReportSchema,
} from '@videogenai/types';
import { eq } from 'drizzle-orm';
import { runAssetGenerator } from '../agents/asset-generator.js';
import { runAssembler } from '../agents/assembler.js';
import { runPublisher } from '../agents/publisher.js';
import { runQaReviewer } from '../agents/qa-reviewer.js';
import { markStageFailed, upsertStage } from '../db-ops.js';
import { inngest } from './client.js';

export const pipelineInject = inngest.createFunction(
  {
    id: 'pipeline-inject',
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
  { event: 'videogenai/run.inject' },
  async ({ event, step }) => {
    const { runId, channelId } = event.data;
    const channel = loadChannel(channelId);

    await db
      .update(runs)
      .set({ status: 'running', updatedAt: new Date() })
      .where(eq(runs.id, runId));

    const autoApprove = await step.run('read/auto-approve', () =>
      db.query.runs
        .findFirst({ where: eq(runs.id, runId), columns: { autoApprove: true } })
        .then((r) => r?.autoApprove ?? false),
    );

    // Parse and validate the injected script + storyboard
    const script = scriptSchema.parse(event.data.script);
    const storyboard = storyboardSchema.parse(event.data.storyboard);

    // Mark stages 1-6 as pre-approved (bypassed)
    await step.run('inject/mark-stages-bypassed', async () => {
      const bypassedStages: StageId[] = [
        'brief',
        'research',
        'jargon',
        'script',
        'fact-check',
        'storyboard',
      ];
      for (const stageId of bypassedStages) {
        await upsertStage(runId, stageId, 'approved', { bypassed: true, reason: 'inject mode' });
      }
    });

    // ── Stage 7: Asset generation ─────────────────────────────────────────────
    const assets = await step.run('stage/assets/1', async () => {
      try {
        return await runAssetGenerator(runId, script, storyboard, channel);
      } catch (err) {
        await markStageFailed(runId, 'assets', String(err));
        throw err;
      }
    });

    // ── Stage 8: ffmpeg render ────────────────────────────────────────────────
    const renderResult = await step.run('stage/render/1', async () => {
      try {
        return await runAssembler(runId, script, storyboard, assets, channel);
      } catch (err) {
        await markStageFailed(runId, 'render', String(err));
        throw err;
      }
    });

    // ── Stage 9: QA review (human approval gate) ──────────────────────────────
    // Use a stub fact-check report — not applicable in inject mode
    const stubFactCheck = {
      verdict: 'pass' as const,
      sourcing_score: 1,
      balance_score: 1,
      issues: [],
      summary: 'Inject mode — fact-check bypassed',
    };

    let effectiveQaReport!: QaReport;
    {
      let feedback: string | undefined;
      for (let attempt = 1; ; attempt++) {
        const result = await step.run(`stage/qa/${attempt}`, async () => {
          try {
            return await runQaReviewer(
              runId,
              script,
              stubFactCheck,
              storyboard,
              assets,
              renderResult,
              channel,
              feedback,
            );
          } catch (err) {
            await markStageFailed(runId, 'qa', String(err));
            throw err;
          }
        });

        if (autoApprove) {
          await step.run(`auto-approve/qa/${attempt}`, () =>
            upsertStage(runId, 'qa', 'approved', result),
          );
          effectiveQaReport = result;
          break;
        }

        const response = await step.waitForEvent(`qa/response/${attempt}`, {
          event: 'videogenai/stage.qa.response',
          match: 'data.runId',
          timeout: '7d',
        });
        if (!response) throw new Error('qa stage timed out after 7 days');

        const rd = response.data;
        if (rd.action === 'approved') {
          effectiveQaReport = qaReportSchema.parse(rd.editedOutput ?? result);
          break;
        }
        feedback = rd.feedback;
      }
    }

    // ── Stage 10: Publish to YouTube ──────────────────────────────────────────
    const publishResult = await step.run('stage/publish/1', async () => {
      try {
        return await runPublisher(runId, effectiveQaReport);
      } catch (err) {
        await markStageFailed(runId, 'publish', String(err));
        throw err;
      }
    });

    await db
      .update(runs)
      .set({ status: 'complete', updatedAt: new Date() })
      .where(eq(runs.id, runId));

    return {
      runId,
      script,
      storyboard,
      assets,
      renderResult,
      qaReport: effectiveQaReport,
      publishResult,
    };
  },
);
