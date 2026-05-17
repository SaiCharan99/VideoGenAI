import { loadChannel } from '@videogenai/channels';
import { db, runs } from '@videogenai/db';
import { type Brief, type FactPack, type Script } from '@videogenai/types';
import { eq } from 'drizzle-orm';
import { runBriefBuilder } from '../agents/brief-builder.js';
import { runFactChecker } from '../agents/fact-checker.js';
import { runJargonMiner } from '../agents/jargon-miner.js';
import { runResearcher } from '../agents/researcher.js';
import { runScriptwriter } from '../agents/scriptwriter.js';
import { runStoryboarder } from '../agents/storyboarder.js';
import { markStageFailed } from '../db-ops.js';
import { inngest } from './client.js';

interface StageResponseData {
  runId: string;
  stageId: string;
  action: 'approved' | 'revise';
  editedOutput?: unknown;
  feedback?: string;
}

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
    let effectiveBrief!: Brief;
    {
      let feedback: string | undefined;
      for (let attempt = 1; ; attempt++) {
        const result = await step.run(`stage/brief/${attempt}`, async () => {
          try {
            return await runBriefBuilder(runId, inputText, channel, feedback);
          } catch (err) {
            await markStageFailed(runId, 'brief', String(err));
            throw err;
          }
        });

        const response = await step.waitForEvent(`brief/response/${attempt}`, {
          event: 'videogenai/stage.response',
          if: `event.data.runId == async.data.runId && async.data.stageId == 'brief'`,
          timeout: '7d',
        });
        if (!response) throw new Error('brief stage timed out after 7 days');

        const rd = response.data;
        if (rd.action === 'approved') {
          effectiveBrief = (rd.editedOutput ?? result) as Brief;
          break;
        }
        feedback = rd.feedback;
      }
    }

    // ── Stage 2: Research ───────────────────────────────────────────────────
    let effectiveFactPack!: FactPack;
    {
      let feedback: string | undefined;
      for (let attempt = 1; ; attempt++) {
        const result = await step.run(`stage/research/${attempt}`, async () => {
          try {
            return await runResearcher(runId, effectiveBrief, channel, feedback);
          } catch (err) {
            await markStageFailed(runId, 'research', String(err));
            throw err;
          }
        });

        const response = await step.waitForEvent(`research/response/${attempt}`, {
          event: 'videogenai/stage.response',
          if: `event.data.runId == async.data.runId && async.data.stageId == 'research'`,
          timeout: '7d',
        });
        if (!response) throw new Error('research stage timed out after 7 days');

        const rd = response.data;
        if (rd.action === 'approved') {
          effectiveFactPack = (rd.editedOutput ?? result) as FactPack;
          break;
        }
        feedback = rd.feedback;
      }
    }

    // ── Stage 3: Jargon (auto-approved, no gate) ────────────────────────────
    const jargon = await step.run('stage/jargon/1', async () => {
      try {
        return await runJargonMiner(runId, effectiveBrief, effectiveFactPack, channel);
      } catch (err) {
        await markStageFailed(runId, 'jargon', String(err));
        throw err;
      }
    });

    // ── Stage 4: Script ─────────────────────────────────────────────────────
    let effectiveScript!: Script;
    {
      let feedback: string | undefined;
      for (let attempt = 1; ; attempt++) {
        const result = await step.run(`stage/script/${attempt}`, async () => {
          try {
            return await runScriptwriter(
              runId,
              effectiveBrief,
              effectiveFactPack,
              jargon,
              channel,
              feedback,
            );
          } catch (err) {
            await markStageFailed(runId, 'script', String(err));
            throw err;
          }
        });

        const response = await step.waitForEvent(`script/response/${attempt}`, {
          event: 'videogenai/stage.response',
          if: `event.data.runId == async.data.runId && async.data.stageId == 'script'`,
          timeout: '7d',
        });
        if (!response) throw new Error('script stage timed out after 7 days');

        const rd = response.data;
        if (rd.action === 'approved') {
          effectiveScript = (rd.editedOutput ?? result) as Script;
          break;
        }
        feedback = rd.feedback;
      }
    }

    // ── Stage 5: Fact-check ─────────────────────────────────────────────────
    let factCheckReport!: Awaited<ReturnType<typeof runFactChecker>>;
    {
      let feedback: string | undefined;
      for (let attempt = 1; ; attempt++) {
        const result = await step.run(`stage/fact-check/${attempt}`, async () => {
          try {
            return await runFactChecker(
              runId,
              effectiveScript,
              effectiveFactPack,
              channel,
              feedback,
            );
          } catch (err) {
            await markStageFailed(runId, 'fact-check', String(err));
            throw err;
          }
        });

        const response = await step.waitForEvent(`fact-check/response/${attempt}`, {
          event: 'videogenai/stage.response',
          if: `event.data.runId == async.data.runId && async.data.stageId == 'fact-check'`,
          timeout: '7d',
        });
        if (!response) throw new Error('fact-check stage timed out after 7 days');

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const rd = response.data as StageResponseData;
        if (rd.action === 'approved') {
          factCheckReport = result;
          break;
        }
        feedback = rd.feedback;
      }
    }

    // ── Stage 6: Storyboard ─────────────────────────────────────────────────
    let storyboard!: Awaited<ReturnType<typeof runStoryboarder>>;
    {
      let feedback: string | undefined;
      for (let attempt = 1; ; attempt++) {
        const result = await step.run(`stage/storyboard/${attempt}`, async () => {
          try {
            return await runStoryboarder(
              runId,
              effectiveBrief,
              effectiveScript,
              jargon,
              channel,
              feedback,
            );
          } catch (err) {
            await markStageFailed(runId, 'storyboard', String(err));
            throw err;
          }
        });

        const response = await step.waitForEvent(`storyboard/response/${attempt}`, {
          event: 'videogenai/stage.response',
          if: `event.data.runId == async.data.runId && async.data.stageId == 'storyboard'`,
          timeout: '7d',
        });
        if (!response) throw new Error('storyboard stage timed out after 7 days');

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const rd = response.data as StageResponseData;
        if (rd.action === 'approved') {
          storyboard = result;
          break;
        }
        feedback = rd.feedback;
      }
    }

    await db
      .update(runs)
      .set({ status: 'complete', updatedAt: new Date() })
      .where(eq(runs.id, runId));

    return {
      runId,
      brief: effectiveBrief,
      factPack: effectiveFactPack,
      jargon,
      script: effectiveScript,
      factCheckReport,
      storyboard,
    };
  },
);
