import { type ChannelConfig } from '@videogenai/channels';
import {
  type FactPack,
  type Script,
  factCheckReportSchema,
  type FactCheckReport,
} from '@videogenai/types';
import { markStageRunning, markStageAwaitingApproval, markStageFailed } from '../db-ops.js';
import { generateStructuredOutput } from '../llm.js';
import { createLogger } from '../logger.js';

const TOOL_NAME = 'submit_fact_check';

export async function runFactChecker(
  runId: string,
  script: Script,
  factPack: FactPack,
  channel: ChannelConfig,
  feedbackContext?: string,
): Promise<FactCheckReport> {
  const logger = createLogger(runId, 'fact-check');
  await markStageRunning(runId, 'fact-check');
  logger.info('starting', { lines: script.lines.length, sources: factPack.sources.length });

  try {
    const report = await generateStructuredOutput({
      stageName: 'FactChecker',
      schemaName: TOOL_NAME,
      schemaDescription: 'Submit the completed fact-check and editorial audit report',
      jsonSchema: factCheckTool(),
      outputSchema: factCheckReportSchema,
      systemPrompt: buildSystemPrompt(channel),
      userPrompt: buildUserPrompt(script, factPack, channel, feedbackContext),
      maxTokens: 4096,
    });

    await markStageAwaitingApproval(runId, 'fact-check', report);
    logger.info('complete', {
      verdict: report.verdict,
      issues: report.issues.length,
      sourcing: report.sourcing_score,
      balance: report.balance_score,
    });
    return report;
  } catch (err) {
    await markStageFailed(runId, 'fact-check', String(err));
    throw err;
  }
}

function buildSystemPrompt(channel: ChannelConfig): string {
  const biasRules = channel.bias_rules.map((r) => `- ${r}`).join('\n');
  return `You are a fact-checker and editorial auditor for the YouTube channel "${channel.display_name}".

Your job is to audit a completed video script against its source fact pack and the channel's editorial rules.

Audience: ${channel.audience.description}
Channel bias rules:
${biasRules}

What to check:
1. **Sourcing coverage** — every factual claim must reference a source_id from the fact pack. Flag any unsourced factual claim as critical.
2. **Source fidelity** — does the script faithfully represent what the cited source actually says? Flag misrepresentations as critical.
3. **Balance** — does the script follow the channel's bias rules? Flag rule violations.
4. **Tone** — does it avoid editorialising (loaded language, unattributed opinions)? Flag violations as warnings.
5. **Completeness** — are the brief's must_cover points addressed in the script?

Scoring:
- sourcing_score: fraction of factual lines that have valid source citations (0–1)
- balance_score: fraction of bias rules respected (0–1)
- verdict: 'pass' if no critical issues, 'pass_with_warnings' if only warnings/info, 'fail' if any critical issues`;
}

function buildUserPrompt(
  script: Script,
  factPack: FactPack,
  channel: ChannelConfig,
  feedbackContext?: string,
): string {
  const scriptLines = script.lines
    .map((l) => {
      const cites =
        l.source_ids.length > 0 ? ` [cites: ${l.source_ids.join(', ')}]` : ' [no citation]';
      return `Scene ${l.scene}: ${l.text}${cites}`;
    })
    .join('\n');

  const sourcesText = factPack.sources
    .map((s) => `${s.id}: "${s.title}" (${s.publication}) — ${s.url}\n  Excerpt: "${s.excerpt}"`)
    .join('\n\n');

  const factsText = factPack.facts.map((f) => `[${f.source_ids.join(',')}] ${f.claim}`).join('\n');

  const balanceNote = factPack.balance_check.passed
    ? `Source balance PASSED: ${factPack.balance_check.note ?? ''}`
    : `Source balance FAILED: ${factPack.balance_check.note ?? ''}`;

  return `CHANNEL: ${channel.display_name}

SCRIPT TITLE: "${script.title}"
ESTIMATED DURATION: ${script.estimated_duration_seconds}s

SCRIPT:
${scriptLines}

FACT PACK:
${balanceNote}

Facts (${factPack.facts.length}):
${factsText}

Sources (${factPack.sources.length}):
${sourcesText}

Audit this script against the fact pack and channel bias rules. Return a complete fact-check report.${feedbackContext ? `\n\n---\nHUMAN REVIEWER FEEDBACK — address this in your response:\n${feedbackContext}` : ''}`;
}

function factCheckTool() {
  return {
    type: 'object' as const,
    properties: {
      verdict: {
        type: 'string',
        enum: ['pass', 'pass_with_warnings', 'fail'],
        description: 'Overall verdict. fail = at least one critical issue.',
      },
      sourcing_score: {
        type: 'number',
        description: 'Fraction of factual lines with valid citations (0–1)',
      },
      balance_score: {
        type: 'number',
        description: 'Fraction of bias rules respected (0–1)',
      },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              enum: ['critical', 'warning', 'info'],
            },
            scene: {
              type: 'number',
              description: 'Scene number where the issue occurs (if applicable)',
            },
            description: { type: 'string', description: 'Clear description of the issue' },
            suggested_fix: {
              type: 'string',
              description: 'Optional: how to fix this issue',
            },
          },
          required: ['severity', 'description'],
        },
      },
      summary: {
        type: 'string',
        description: 'One-paragraph editorial summary for the human reviewer',
      },
    },
    required: ['verdict', 'sourcing_score', 'balance_score', 'issues', 'summary'],
  };
}
