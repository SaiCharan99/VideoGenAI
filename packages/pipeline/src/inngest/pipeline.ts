import { loadChannel } from '@videogenai/channels';
import { db, runs } from '@videogenai/db';
import { type Brief, type FactPack, type QaReport, type Script } from '@videogenai/types';
import { eq } from 'drizzle-orm';
import { runAssetGenerator } from '../agents/asset-generator.js';
import { runAssembler } from '../agents/assembler.js';
import { runBriefBuilder } from '../agents/brief-builder.js';
import { runFactChecker } from '../agents/fact-checker.js';
import { runJargonMiner } from '../agents/jargon-miner.js';
import { runPublisher } from '../agents/publisher.js';
import { runQaReviewer } from '../agents/qa-reviewer.js';
import { runResearcher } from '../agents/researcher.js';
import { runScriptwriter } from '../agents/scriptwriter.js';
import { runStoryboarder } from '../agents/storyboarder.js';
import { markStageFailed, upsertStage } from '../db-ops.js';
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

    // Read once — stays constant for the lifetime of this run
    const autoApprove = await step.run('read/auto-approve', () =>
      db.query.runs
        .findFirst({ where: eq(runs.id, runId), columns: { autoApprove: true } })
        .then((r) => r?.autoApprove ?? false),
    );

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

        if (autoApprove) {
          await step.run(`auto-approve/brief/${attempt}`, () =>
            upsertStage(runId, 'brief', 'approved', result),
          );
          effectiveBrief = result;
          break;
        }

        const response = await step.waitForEvent(`brief/response/${attempt}`, {
          event: 'videogenai/stage.brief.response',
          match: 'data.runId',
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

    // ── Pause gate ─────────────────────────────────────────────────────────
    if (
      await step.run('pause/check/before-research', () =>
        db.query.runs
          .findFirst({ where: eq(runs.id, runId), columns: { paused: true } })
          .then((r) => r?.paused ?? false),
      )
    ) {
      await step.waitForEvent('pause/wait/before-research', {
        event: 'videogenai/run.resumed',
        match: 'data.runId',
        timeout: '14d',
      });
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

        if (autoApprove) {
          await step.run(`auto-approve/research/${attempt}`, () =>
            upsertStage(runId, 'research', 'approved', result),
          );
          effectiveFactPack = result;
          break;
        }

        const response = await step.waitForEvent(`research/response/${attempt}`, {
          event: 'videogenai/stage.research.response',
          match: 'data.runId',
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

    if (
      await step.run('pause/check/before-jargon', () =>
        db.query.runs
          .findFirst({ where: eq(runs.id, runId), columns: { paused: true } })
          .then((r) => r?.paused ?? false),
      )
    ) {
      await step.waitForEvent('pause/wait/before-jargon', {
        event: 'videogenai/run.resumed',
        match: 'data.runId',
        timeout: '14d',
      });
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

    if (
      await step.run('pause/check/before-script', () =>
        db.query.runs
          .findFirst({ where: eq(runs.id, runId), columns: { paused: true } })
          .then((r) => r?.paused ?? false),
      )
    ) {
      await step.waitForEvent('pause/wait/before-script', {
        event: 'videogenai/run.resumed',
        match: 'data.runId',
        timeout: '14d',
      });
    }

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

        if (autoApprove) {
          await step.run(`auto-approve/script/${attempt}`, () =>
            upsertStage(runId, 'script', 'approved', result),
          );
          effectiveScript = result;
          break;
        }

        const response = await step.waitForEvent(`script/response/${attempt}`, {
          event: 'videogenai/stage.script.response',
          match: 'data.runId',
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

    if (
      await step.run('pause/check/before-fact-check', () =>
        db.query.runs
          .findFirst({ where: eq(runs.id, runId), columns: { paused: true } })
          .then((r) => r?.paused ?? false),
      )
    ) {
      await step.waitForEvent('pause/wait/before-fact-check', {
        event: 'videogenai/run.resumed',
        match: 'data.runId',
        timeout: '14d',
      });
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

        if (autoApprove) {
          await step.run(`auto-approve/fact-check/${attempt}`, () =>
            upsertStage(runId, 'fact-check', 'approved', result),
          );
          factCheckReport = result;
          break;
        }

        const response = await step.waitForEvent(`fact-check/response/${attempt}`, {
          event: 'videogenai/stage.fact-check.response',
          match: 'data.runId',
          timeout: '7d',
        });
        if (!response) throw new Error('fact-check stage timed out after 7 days');

        const rd = response.data;
        if (rd.action === 'approved') {
          factCheckReport = result;
          break;
        }
        feedback = rd.feedback;
      }
    }

    if (
      await step.run('pause/check/before-storyboard', () =>
        db.query.runs
          .findFirst({ where: eq(runs.id, runId), columns: { paused: true } })
          .then((r) => r?.paused ?? false),
      )
    ) {
      await step.waitForEvent('pause/wait/before-storyboard', {
        event: 'videogenai/run.resumed',
        match: 'data.runId',
        timeout: '14d',
      });
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

        if (autoApprove) {
          await step.run(`auto-approve/storyboard/${attempt}`, () =>
            upsertStage(runId, 'storyboard', 'approved', result),
          );
          storyboard = result;
          break;
        }

        const response = await step.waitForEvent(`storyboard/response/${attempt}`, {
          event: 'videogenai/stage.storyboard.response',
          match: 'data.runId',
          timeout: '7d',
        });
        if (!response) throw new Error('storyboard stage timed out after 7 days');

        const rd = response.data;
        if (rd.action === 'approved') {
          storyboard = result;
          break;
        }
        feedback = rd.feedback;
      }
    }

    if (
      await step.run('pause/check/before-assets', () =>
        db.query.runs
          .findFirst({ where: eq(runs.id, runId), columns: { paused: true } })
          .then((r) => r?.paused ?? false),
      )
    ) {
      await step.waitForEvent('pause/wait/before-assets', {
        event: 'videogenai/run.resumed',
        match: 'data.runId',
        timeout: '14d',
      });
    }

    // ── Stage 7: Asset generation ───────────────────────────────────────────
    const assets = await step.run('stage/assets/1', async () => {
      try {
        return await runAssetGenerator(runId, effectiveScript, storyboard, channel);
      } catch (err) {
        await markStageFailed(runId, 'assets', String(err));
        throw err;
      }
    });

    if (
      await step.run('pause/check/before-render', () =>
        db.query.runs
          .findFirst({ where: eq(runs.id, runId), columns: { paused: true } })
          .then((r) => r?.paused ?? false),
      )
    ) {
      await step.waitForEvent('pause/wait/before-render', {
        event: 'videogenai/run.resumed',
        match: 'data.runId',
        timeout: '14d',
      });
    }

    // ── Stage 8: Assemble render manifest ───────────────────────────────────
    const renderResult = await step.run('stage/render/1', async () => {
      try {
        return await runAssembler(runId, effectiveScript, storyboard, assets, channel);
      } catch (err) {
        await markStageFailed(runId, 'render', String(err));
        throw err;
      }
    });

    if (
      await step.run('pause/check/before-qa', () =>
        db.query.runs
          .findFirst({ where: eq(runs.id, runId), columns: { paused: true } })
          .then((r) => r?.paused ?? false),
      )
    ) {
      await step.waitForEvent('pause/wait/before-qa', {
        event: 'videogenai/run.resumed',
        match: 'data.runId',
        timeout: '14d',
      });
    }

    // ── Stage 9: QA review ──────────────────────────────────────────────────
    let effectiveQaReport!: QaReport;
    {
      let feedback: string | undefined;
      for (let attempt = 1; ; attempt++) {
        const result = await step.run(`stage/qa/${attempt}`, async () => {
          try {
            return await runQaReviewer(
              runId,
              effectiveScript,
              factCheckReport,
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
          effectiveQaReport = (rd.editedOutput ?? result) as QaReport;
          break;
        }
        feedback = rd.feedback;
      }
    }

    if (
      await step.run('pause/check/before-publish', () =>
        db.query.runs
          .findFirst({ where: eq(runs.id, runId), columns: { paused: true } })
          .then((r) => r?.paused ?? false),
      )
    ) {
      await step.waitForEvent('pause/wait/before-publish', {
        event: 'videogenai/run.resumed',
        match: 'data.runId',
        timeout: '14d',
      });
    }

    // ── Stage 10: Publish to YouTube ────────────────────────────────────────
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
      brief: effectiveBrief,
      factPack: effectiveFactPack,
      jargon,
      script: effectiveScript,
      factCheckReport,
      storyboard,
      assets,
      renderResult,
      qaReport: effectiveQaReport,
      publishResult,
    };
  },
);
