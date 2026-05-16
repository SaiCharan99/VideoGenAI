import { type ChannelConfig } from '@videogenai/channels';
import { type Brief, type FactPack, jargonListSchema, type JargonList } from '@videogenai/types';
import { markStageRunning, upsertStage, markStageFailed } from '../db-ops.js';
import { generateStructuredOutput } from '../llm.js';
import { createLogger } from '../logger.js';

const TOOL_NAME = 'submit_jargon';

export async function runJargonMiner(
  runId: string,
  brief: Brief,
  factPack: FactPack,
  channel: ChannelConfig,
): Promise<JargonList> {
  const logger = createLogger(runId, 'jargon');
  await markStageRunning(runId, 'jargon');
  logger.info('starting', { facts: factPack.facts.length, sources: factPack.sources.length });

  try {
    const jargon = await generateStructuredOutput({
      stageName: 'JargonMiner',
      schemaName: TOOL_NAME,
      schemaDescription: 'Submit the complete jargon guide for the scriptwriter',
      jsonSchema: jargonTool(),
      outputSchema: jargonListSchema,
      systemPrompt: buildSystemPrompt(channel),
      userPrompt: buildUserPrompt(brief, factPack, channel),
      maxTokens: 4096,
    });

    // No approval gate — mark approved immediately so the scriptwriter can use the guide
    await upsertStage(runId, 'jargon', 'approved', jargon);
    logger.info('complete', { terms: jargon.terms.length });
    return jargon;
  } catch (err) {
    await markStageFailed(runId, 'jargon', String(err));
    throw err;
  }
}

function buildSystemPrompt(channel: ChannelConfig): string {
  return `You are a jargon analyst for the YouTube channel "${channel.display_name}".

Audience: ${channel.audience.description} (knowledge level: ${channel.audience.assumed_knowledge_level})
Jargon threshold: ${channel.jargon.explain_threshold}
Include history: ${channel.jargon.include_history ? 'yes — provide historical context for relevant terms' : 'no — definitions only'}

Your task: Read a research brief and fact pack for an upcoming video. Identify every term a scriptwriter should define for the target audience. For each term, write a plain-language definition the audience would understand. Definitions must be concise (1–2 sentences).

The output is a guide for the scriptwriter — it tells them which terms must be explained and how to explain them. The scriptwriter will define each term inline on first use.

Rules:
- Only include terms that actually appear in or are implied by the fact pack.
- Historical context is optional; include it only when it meaningfully helps understanding.
- The threshold is: "${channel.jargon.explain_threshold}".`;
}

function buildUserPrompt(brief: Brief, factPack: FactPack, channel: ChannelConfig): string {
  const factsText = factPack.facts.map((f) => `[${f.source_ids.join(',')}] ${f.claim}`).join('\n');
  const sourceTitles = factPack.sources
    .map((s) => `${s.id}: ${s.title} (${s.publication})`)
    .join('\n');

  return `AUDIENCE: ${channel.audience.description}
ANGLE: ${brief.angle}
AUDIENCE NOTE: ${brief.audience_note}
MUST COVER: ${brief.must_cover.join(' | ')}

FACT PACK (${factPack.facts.length} facts):
${factsText}

SOURCES:
${sourceTitles}

Identify all jargon terms in this material that the target audience needs defined. Return the complete jargon guide for the scriptwriter.`;
}

function jargonTool() {
  return {
    type: 'object' as const,
    properties: {
      terms: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'The jargon term' },
            definition: {
              type: 'string',
              description: 'Plain-language definition (1–2 sentences)',
            },
            historical_context: {
              type: 'string',
              description: 'Optional: brief historical background that helps understanding',
            },
          },
          required: ['term', 'definition'],
        },
      },
    },
    required: ['terms'],
  };
}
