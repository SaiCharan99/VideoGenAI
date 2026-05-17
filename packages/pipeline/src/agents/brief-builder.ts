import { type ChannelConfig } from '@videogenai/channels';
import { briefSchema, type Brief } from '@videogenai/types';
import { markStageAwaitingApproval, markStageRunning } from '../db-ops.js';
import { generateStructuredOutput } from '../llm.js';
import { createLogger } from '../logger.js';

const TOOL_NAME = 'submit_brief';

export async function runBriefBuilder(
  runId: string,
  inputText: string,
  channel: ChannelConfig,
): Promise<Brief> {
  const logger = createLogger(runId, 'brief');
  await markStageRunning(runId, 'brief');
  logger.info('starting', { chars: inputText.length });

  const brief = await generateStructuredOutput({
    stageName: 'Brief builder',
    schemaName: TOOL_NAME,
    schemaDescription: 'Submit the completed video brief',
    jsonSchema: briefTool(),
    outputSchema: briefSchema,
    systemPrompt: buildSystemPrompt(channel),
    userPrompt: `Video brief request: "${inputText}"\n\nIf the topic contains obvious typos or casing errors, silently correct them before building the brief.`,
    maxTokens: 1024,
  });

  await markStageAwaitingApproval(runId, 'brief', brief);
  logger.info('complete', { angle: brief.angle });
  return brief;
}

function buildSystemPrompt(channel: ChannelConfig): string {
  return `You are a video brief writer for the YouTube channel "${channel.display_name}".

Audience: ${channel.audience.description} (knowledge level: ${channel.audience.assumed_knowledge_level})
Tone: ${channel.tone.voice}${channel.tone.notes ? `\n${channel.tone.notes}` : ''}
Target length: ${channel.length_target_seconds[0]}–${channel.length_target_seconds[1]} seconds

Your job: expand a one-line video description into a precise, actionable brief.
- angle: the specific angle this video takes (not just the topic)
- audience_note: one sentence on what this audience needs to understand first
- must_cover: 3–6 specific points the video must address
- must_avoid: 2–4 things to explicitly not include (jargon, tangents, bias)
- tone_note: one sentence of tone guidance specific to this video

${channel.bias_rules.length ? `Bias rules to reflect in must_avoid:\n${channel.bias_rules.map((r) => `- ${r}`).join('\n')}` : ''}`;
}

function briefTool() {
  return {
    type: 'object' as const,
    properties: {
      angle: { type: 'string', description: 'The specific angle or hook for this video' },
      audience_note: {
        type: 'string',
        description: 'What this specific audience needs to understand first',
      },
      length_seconds: {
        type: 'array',
        items: { type: 'number' },
        minItems: 2,
        maxItems: 2,
        description: '[min, max] duration in seconds',
      },
      must_cover: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific points the video must address',
      },
      must_avoid: {
        type: 'array',
        items: { type: 'string' },
        description: 'Things the video must not do or include',
      },
      tone_note: {
        type: 'string',
        description: 'Tone guidance specific to this video',
      },
    },
    required: ['angle', 'audience_note', 'length_seconds', 'must_cover', 'must_avoid', 'tone_note'],
  };
}
