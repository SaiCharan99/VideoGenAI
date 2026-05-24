import { type ChannelConfig } from '@videogenai/channels';
import {
  type Brief,
  type JargonList,
  type Script,
  storyboardSchema,
  type Storyboard,
} from '@videogenai/types';
import { markStageRunning, markStageAwaitingApproval, markStageFailed } from '../db-ops.js';
import { generateStructuredOutput } from '../llm.js';
import { createLogger } from '../logger.js';

const TOOL_NAME = 'submit_storyboard';

export async function runStoryboarder(
  runId: string,
  brief: Brief,
  script: Script,
  jargon: JargonList,
  channel: ChannelConfig,
  feedbackContext?: string,
): Promise<Storyboard> {
  const logger = createLogger(runId, 'storyboard');
  await markStageRunning(runId, 'storyboard');
  logger.info('starting', { scenes: new Set(script.lines.map((l) => l.scene)).size });

  try {
    const storyboard = await generateStructuredOutput({
      stageName: 'Storyboarder',
      schemaName: TOOL_NAME,
      schemaDescription: 'Submit the completed storyboard with one entry per scene',
      jsonSchema: storyboardTool(),
      outputSchema: storyboardSchema,
      systemPrompt: buildSystemPrompt(channel),
      userPrompt: buildUserPrompt(brief, script, jargon, channel, feedbackContext),
      maxTokens: 8192,
    });

    // Every scene in the script must have a corresponding storyboard entry
    const scriptScenes = new Set(script.lines.map((l) => l.scene));
    const boardScenes = new Set(storyboard.scenes.map((s) => s.scene));
    const missing = [...scriptScenes].filter((s) => !boardScenes.has(s));
    if (missing.length > 0) {
      throw new Error(`Storyboarder: missing storyboard entries for scenes: ${missing.join(', ')}`);
    }

    await markStageAwaitingApproval(runId, 'storyboard', storyboard);
    logger.info('complete', {
      scenes: storyboard.scenes.length,
      visualKinds: [...new Set(storyboard.scenes.map((s) => s.visual_kind))].join(', '),
    });
    return storyboard;
  } catch (err) {
    await markStageFailed(runId, 'storyboard', String(err));
    throw err;
  }
}

function buildSystemPrompt(channel: ChannelConfig): string {
  return `You are a storyboarder for the YouTube channel "${channel.display_name}".

Visual style:
- Template: ${channel.visual_style.template}
- Palette: ${channel.visual_style.palette.join(', ')}
- Font: ${channel.visual_style.font}
- Motion intensity: ${channel.visual_style.motion_intensity}
- B-roll policy: ${channel.visual_style.broll_policy}

For each scene in the script, specify exactly how it should look. One storyboard entry per scene number.

Visual kind options:
- text_card: full-screen text, good for titles, key facts, emphasis
- kinetic_text: animated text that builds on screen as narrator speaks
- chart: data visualisation (bar, line, pie) — use when numbers tell the story
- stock_broll: real-world footage from stock library — describe what to search for
- generated_still: AI-generated image — describe precisely; use when stock won't work
- generated_clip: AI-generated video clip — use sparingly, describe motion
- map: geographic map with highlights — use for location-based context

Rules:
- Prefer stock_broll for all explanatory, conceptual, and real-world scenes — it produces real footage the renderer can use.
- Use kinetic_text ONLY for short title cards, key term definitions, or single-word emphasis. Maximum 20% of total scenes.
- Prefer stock_broll for real-world events (parliament sessions, protests, product launches).
- Use chart for any scene presenting statistics or comparisons.
- Use generated_still when a very specific visual is needed that stock won't cover.
- Obey the b-roll policy: "${channel.visual_style.broll_policy}".
- Never use a talking-head avatar or AI face.
- Durations must sum to the script's estimated duration ± 10%.
- Jargon definitions should use stock_broll with a text_overlay field rather than kinetic_text.`;
}

function buildUserPrompt(
  brief: Brief,
  script: Script,
  jargon: JargonList,
  channel: ChannelConfig,
  feedbackContext?: string,
): string {
  const sceneGroups: Record<number, string[]> = {};
  for (const l of script.lines) {
    (sceneGroups[l.scene] = sceneGroups[l.scene] ?? []).push(l.text);
  }

  const scenesText = Object.entries(sceneGroups)
    .map(([scene, lines]) => `Scene ${scene}:\n${lines.map((t) => `  ${t}`).join('\n')}`)
    .join('\n\n');

  const jargonText =
    jargon.terms.length > 0
      ? jargon.terms.map((t) => `- ${t.term}: ${t.definition}`).join('\n')
      : '(none)';

  return `CHANNEL: ${channel.display_name}
PALETTE: ${channel.visual_style.palette.join(' / ')}
ESTIMATED DURATION: ${script.estimated_duration_seconds}s

ANGLE: ${brief.angle}
AUDIENCE NOTE: ${brief.audience_note}

SCRIPT BY SCENE:
${scenesText}

JARGON TERMS TO DEFINE ON-SCREEN:
${jargonText}

Create a complete storyboard — one entry per scene number. The total duration_seconds across all scenes should sum to approximately ${script.estimated_duration_seconds}s.${feedbackContext ? `\n\n---\nHUMAN REVIEWER FEEDBACK — address this in your response:\n${feedbackContext}` : ''}`;
}

function storyboardTool() {
  return {
    type: 'object' as const,
    properties: {
      scenes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            scene: { type: 'number', description: 'Scene number (matches script)' },
            duration_seconds: {
              type: 'number',
              description: 'Duration of this scene in seconds',
            },
            visual_kind: {
              type: 'string',
              enum: [
                'text_card',
                'kinetic_text',
                'chart',
                'stock_broll',
                'generated_still',
                'generated_clip',
                'map',
              ],
            },
            visual_description: {
              type: 'string',
              description: 'Precise visual brief for the asset generator or renderer',
            },
            text_overlay: {
              type: 'string',
              description: 'Text to show on screen (if any)',
            },
            audio_note: {
              type: 'string',
              description: 'Note for TTS or music (pacing, emphasis, silence, etc.)',
            },
          },
          required: ['scene', 'duration_seconds', 'visual_kind', 'visual_description'],
        },
      },
    },
    required: ['scenes'],
  };
}
