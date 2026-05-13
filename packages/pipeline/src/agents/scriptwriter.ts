import Anthropic from '@anthropic-ai/sdk';
import { type ChannelConfig } from '@videogenai/channels';
import { type Brief, type FactPack, scriptSchema, type Script } from '@videogenai/types';
import { markStageAwaitingApproval, markStageRunning } from '../db-ops.js';
import { createLogger } from '../logger.js';

const client = new Anthropic();

const TOOL_NAME = 'submit_script';

export async function runScriptwriter(
  runId: string,
  brief: Brief,
  factPack: FactPack,
  channel: ChannelConfig,
): Promise<Script> {
  const logger = createLogger(runId, 'script');
  await markStageRunning(runId, 'script');
  logger.info('starting', { facts: factPack.facts.length });

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(channel),
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [scriptTool()],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: buildUserPrompt(brief, factPack, channel),
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (toolUse?.type !== 'tool_use') {
    throw new Error('Scriptwriter: model did not call the expected tool');
  }

  const parsed = scriptSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`Scriptwriter: invalid output — ${parsed.error.toString()}`);
  }

  // Enforce: any cited source_id must exist in the fact pack (empty arrays allowed for transitions)
  const validSourceIds = new Set(factPack.sources.map((s) => s.id));
  const badLines = parsed.data.lines.filter((line) =>
    line.source_ids.some((id) => !validSourceIds.has(id)),
  );

  if (badLines.length > 0) {
    throw new Error(
      `Scriptwriter: ${badLines.length} lines cite source IDs not in the fact pack. ` +
        `First offender: scene ${badLines[0]?.scene}: "${badLines[0]?.text?.slice(0, 80)}..."`,
    );
  }

  await markStageAwaitingApproval(runId, 'script', parsed.data);
  logger.info('complete', {
    title: parsed.data.title,
    lines: parsed.data.lines.length,
    estimatedDuration: parsed.data.estimated_duration_seconds,
  });
  return parsed.data;
}

function buildSystemPrompt(channel: ChannelConfig): string {
  return `You are a YouTube scriptwriter for the channel "${channel.display_name}".

Audience: ${channel.audience.description} (knowledge level: ${channel.audience.assumed_knowledge_level})
Tone: ${channel.tone.voice}${channel.tone.notes ? `\n${channel.tone.notes}` : ''}
Target length: ${channel.length_target_seconds[0]}–${channel.length_target_seconds[1]} seconds

Script structure:
- Hook (0–15 sec): one question or surprising fact that makes the viewer stay.
- Context (15–45 sec): why this matters right now.
- Body (bulk): explain the topic, define jargon inline, cover must-cover points.
- Takeaway (final 20–30 sec): what the viewer now understands, brief CTA.

Rules (non-negotiable):
- Every factual claim must reference source_ids from the fact pack.
- Transitions, rhetorical questions, and scene directions may have empty source_ids.
- Use plain language — explain every jargon term the first time you use it.
- Never editorialize; present contested facts as such with attribution.
- Each line is a natural speech unit (one breath, 1–3 sentences).

${channel.bias_rules.map((r) => `- ${r}`).join('\n')}`;
}

function buildUserPrompt(brief: Brief, factPack: FactPack, channel: ChannelConfig): string {
  const factsText = factPack.facts.map((f) => `[${f.source_ids.join(',')}] ${f.claim}`).join('\n');
  const sourcesText = factPack.sources
    .map((s) => `${s.id}: ${s.publication} — "${s.title}" (${s.url})`)
    .join('\n');

  return `BRIEF:
Angle: ${brief.angle}
Audience note: ${brief.audience_note}
Must cover: ${brief.must_cover.join(' | ')}
Must avoid: ${brief.must_avoid.join(' | ')}
Tone: ${brief.tone_note}
Target: ${channel.length_target_seconds[0]}–${channel.length_target_seconds[1]} seconds

FACT PACK (${factPack.facts.length} facts, ${factPack.sources.length} sources):
${factsText}

SOURCES:
${sourcesText}

Write the complete video script. Every factual line must cite its source_ids.`;
}

function scriptTool(): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description: 'Submit the completed video script',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'YouTube video title (≤70 chars)' },
        description: { type: 'string', description: 'YouTube description (2–3 sentences)' },
        estimated_duration_seconds: { type: 'number' },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              scene: { type: 'number', description: 'Scene number (1-indexed)' },
              text: { type: 'string', description: 'Narration text for this line' },
              source_ids: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Source IDs that support this claim. Empty array for transitions/hooks.',
              },
              speaker_note: {
                type: 'string',
                description: 'Optional note to the voice actor (emphasis, pause, etc.)',
              },
            },
            required: ['scene', 'text', 'source_ids'],
          },
        },
      },
      required: ['title', 'description', 'estimated_duration_seconds', 'lines'],
    },
  };
}
