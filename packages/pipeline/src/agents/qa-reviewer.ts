import { type ChannelConfig } from '@videogenai/channels';
import {
  qaReportSchema,
  type AssetManifest,
  type FactCheckReport,
  type QaReport,
  type RenderResult,
  type Script,
  type Storyboard,
} from '@videogenai/types';
import { markStageRunning, markStageAwaitingApproval, markStageFailed } from '../db-ops.js';
import { generateStructuredOutput } from '../llm.js';
import { createLogger } from '../logger.js';

const TOOL_NAME = 'submit_qa_report';

export async function runQaReviewer(
  runId: string,
  script: Script,
  factCheck: FactCheckReport,
  storyboard: Storyboard,
  assets: AssetManifest,
  renderResult: RenderResult,
  channel: ChannelConfig,
  feedbackContext?: string,
): Promise<QaReport> {
  const logger = createLogger(runId, 'qa');
  await markStageRunning(runId, 'qa');
  logger.info('starting QA review');

  try {
    const report = await generateStructuredOutput({
      stageName: 'QaReviewer',
      schemaName: TOOL_NAME,
      schemaDescription: 'Submit the completed QA report with publish metadata',
      jsonSchema: qaTool(),
      outputSchema: qaReportSchema,
      systemPrompt: buildSystemPrompt(channel),
      userPrompt: buildUserPrompt(
        script,
        factCheck,
        storyboard,
        assets,
        renderResult,
        channel,
        feedbackContext,
      ),
      maxTokens: 4096,
    });

    await markStageAwaitingApproval(runId, 'qa', report);
    logger.info('QA complete', { verdict: report.verdict, quality: report.quality_score });
    return report;
  } catch (err) {
    await markStageFailed(runId, 'qa', String(err));
    throw err;
  }
}

function buildSystemPrompt(channel: ChannelConfig): string {
  return `You are a senior QA reviewer and YouTube channel manager for "${channel.display_name}".

Your job is to review the complete pipeline output and determine if the video is ready to publish.

Review criteria:
- Content quality: is the script engaging, well-structured, and appropriate for the audience?
- Factual grounding: does the fact-check report show the content is accurate and balanced?
- Asset completeness: is narration present? Are key scenes covered with visual assets?
- Technical readiness: is the render manifest valid and complete?
- YouTube optimisation: is the proposed title/description/tags optimised for discoverability?

Verdict guidelines:
- "approved" — everything is solid, ready to publish as-is
- "approved_with_notes" — minor issues that don't block publishing; document them
- "rejected" — critical issues that must be fixed before publishing

For publish_title: write a YouTube-optimised title ≤ 100 characters, compelling, no clickbait.
For publish_description: write a full YouTube description (200-400 words) with: 1-sentence hook, 3-5 key points the video covers, a timestamps section (placeholder lines like "0:00 Intro"), and a disclaimer line noting AI-assisted production.
For tags: 8-12 relevant tags covering the topic, channel niche, and format.`;
}

function buildUserPrompt(
  script: Script,
  factCheck: FactCheckReport,
  storyboard: Storyboard,
  assets: AssetManifest,
  renderResult: RenderResult,
  channel: ChannelConfig,
  feedbackContext?: string,
): string {
  const sceneAssets = (assets.assets ?? []).filter((a) => a.kind !== 'tts_audio');
  const coveredScenes = new Set(sceneAssets.map((a) => a.scene));
  const totalScenes = storyboard.scenes.length;
  const visualKinds = [...new Set(storyboard.scenes.map((s) => s.visual_kind))];

  const factIssuesSummary =
    factCheck.issues.length > 0
      ? factCheck.issues.map((i) => `[${i.severity.toUpperCase()}] ${i.description}`).join('\n')
      : 'No issues found.';

  return `CHANNEL: ${channel.display_name}

--- SCRIPT ---
Title: ${script.title}
Description: ${script.description}
Estimated duration: ${script.estimated_duration_seconds}s
Scenes: ${new Set(script.lines.map((l) => l.scene)).size}
Total lines: ${script.lines.length}

Script excerpt (first 3 lines):
${script.lines
  .slice(0, 3)
  .map((l) => `  Scene ${l.scene}: ${l.text}`)
  .join('\n')}

--- FACT-CHECK ---
Verdict: ${factCheck.verdict}
Sourcing score: ${Math.round(factCheck.sourcing_score * 100)}%
Balance score: ${Math.round(factCheck.balance_score * 100)}%
Issues:
${factIssuesSummary}

--- STORYBOARD ---
Total scenes: ${totalScenes}
Visual kinds used: ${visualKinds.join(', ')}
Total storyboard duration: ${storyboard.scenes.reduce((a, s) => a + s.duration_seconds, 0)}s

--- ASSETS ---
Narration: ${assets.narration_url ? 'PRESENT' : 'MISSING'}
Scene assets: ${sceneAssets.length} (covering ${coveredScenes.size}/${totalScenes} scenes)
Asset types: ${[...new Set(sceneAssets.map((a) => a.kind))].join(', ') || 'none'}

--- RENDER MANIFEST ---
Resolution: ${renderResult.width}×${renderResult.height}
Duration: ${renderResult.duration_seconds}s
Output path: ${renderResult.output_url}

Now write a thorough QA report and produce publish-ready YouTube metadata.${feedbackContext ? `\n\n---\nHUMAN REVIEWER FEEDBACK — address this in your response:\n${feedbackContext}` : ''}`;
}

function qaTool() {
  return {
    type: 'object' as const,
    properties: {
      verdict: {
        type: 'string',
        enum: ['approved', 'approved_with_notes', 'rejected'],
        description: 'Overall publish verdict',
      },
      quality_score: {
        type: 'number',
        description: 'Overall quality score 0-1',
      },
      content_score: {
        type: 'number',
        description: 'Content quality score 0-1 (script + factual grounding)',
      },
      asset_score: {
        type: 'number',
        description: 'Asset completeness score 0-1',
      },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
            category: { type: 'string', enum: ['content', 'technical', 'compliance'] },
            description: { type: 'string' },
            suggested_fix: { type: 'string' },
          },
          required: ['severity', 'category', 'description'],
        },
      },
      summary: {
        type: 'string',
        description: 'One-paragraph QA summary for the operator',
      },
      publish_title: {
        type: 'string',
        description: 'YouTube-optimised video title, max 100 characters',
      },
      publish_description: {
        type: 'string',
        description: 'Full YouTube video description with hook, key points, timestamps, disclaimer',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: '8-12 relevant YouTube tags',
      },
    },
    required: [
      'verdict',
      'quality_score',
      'content_score',
      'asset_score',
      'issues',
      'summary',
      'publish_title',
      'publish_description',
      'tags',
    ],
  };
}
