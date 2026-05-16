import { type ChannelConfig } from '@videogenai/channels';
import { type Brief, factPackSchema, type FactPack } from '@videogenai/types';
import { markStageAwaitingApproval, markStageRunning } from '../db-ops.js';
import { generateStructuredOutput } from '../llm.js';
import { createLogger } from '../logger.js';
import { braveSearch, fetchPageText } from '../skills/search.js';

const TOOL_NAME = 'submit_fact_pack';

export async function runResearcher(
  runId: string,
  brief: Brief,
  channel: ChannelConfig,
): Promise<FactPack> {
  const logger = createLogger(runId, 'research');
  await markStageRunning(runId, 'research');
  logger.info('starting research', { angle: brief.angle });

  // Search and fetch sources in parallel
  const queries = buildQueries(brief, channel);
  logger.info('searching', { queries });

  const searchResults = await Promise.allSettled(queries.map((q) => braveSearch(q, 5)));
  const allResults = searchResults.flatMap((r) => {
    if (r.status === 'fulfilled') return r.value;
    logger.warn('search query failed', { reason: String(r.reason) });
    return [];
  });
  if (allResults.length === 0) {
    throw new Error('Researcher: all search queries failed — cannot proceed without sources');
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Fetch page text for top results (cap at 8 to control cost)
  const top = unique.slice(0, 8);
  logger.info('fetching page content', { count: top.length });
  const withText = await Promise.all(
    top.map(async (r) => ({ ...r, pageText: await fetchPageText(r.url) })),
  );

  const sourceContext = withText
    .map(
      (r) =>
        `SOURCE ${r.id}\nTitle: ${r.title}\nURL: ${r.url}\nExcerpt: ${r.description}\n${r.pageText ? `Content: ${r.pageText}` : ''}`,
    )
    .join('\n\n---\n\n');

  const factPack = await generateStructuredOutput({
    stageName: 'Researcher',
    schemaName: TOOL_NAME,
    schemaDescription: 'Submit the structured fact pack extracted from the sources',
    jsonSchema: factPackTool(),
    outputSchema: factPackSchema,
    systemPrompt: buildSystemPrompt(channel),
    userPrompt: `VIDEO BRIEF:\nAngle: ${brief.angle}\nMust cover: ${brief.must_cover.join(', ')}\nMust avoid: ${brief.must_avoid.join(', ')}\n\nSOURCES:\n${sourceContext}`,
    maxTokens: 4096,
  });

  if (factPack.sources.length < channel.research.min_sources) {
    throw new Error(
      `Researcher: only ${factPack.sources.length} sources found, need at least ${channel.research.min_sources}`,
    );
  }

  // Verify source provenance: every source ID cited in facts must exist in the returned sources
  const returnedSourceIds = new Set(factPack.sources.map((s) => s.id));
  const phantomIds = factPack.facts
    .flatMap((f) => f.source_ids)
    .filter((id) => !returnedSourceIds.has(id));
  if (phantomIds.length > 0) {
    throw new Error(
      `Researcher: facts reference source IDs not in the returned source list: ${[...new Set(phantomIds)].join(', ')}`,
    );
  }

  await markStageAwaitingApproval(runId, 'research', factPack);
  logger.info('complete', {
    sources: factPack.sources.length,
    facts: factPack.facts.length,
    balancePassed: factPack.balance_check.passed,
  });
  return factPack;
}

function buildQueries(brief: Brief, channel: ChannelConfig): string[] {
  const year = new Date().getFullYear();
  const recencyNote =
    channel.research.recency_window_days <= 7
      ? ` ${year}`
      : ` last ${channel.research.recency_window_days} days`;
  const base = brief.must_cover.slice(0, 3).map((point) => `${point}${recencyNote}`);
  // One broad query for the angle itself
  return [brief.angle, ...base];
}

function buildSystemPrompt(channel: ChannelConfig): string {
  const balanceNote =
    channel.research.source_balance && channel.research.source_balance.length > 0
      ? `\nSource balance required — include perspectives from: ${channel.research.source_balance.join(', ')}.`
      : '';

  return `You are a research analyst for the YouTube channel "${channel.display_name}".

Your job: synthesise the provided sources into a structured fact pack for a video script writer.
${balanceNote}

Rules:
- Only include facts you can directly attribute to a source in the provided list.
- Every fact must reference at least one source_id from the sources you select.
- If a claim is contested across sources, list it as a fact with ALL relevant source_ids and note the disagreement in the claim text.
- Do not invent, infer, or extrapolate beyond what the sources say.
- Balance check: assess whether the selected sources represent the required perspectives.
  Set passed=true only if the source list genuinely spans the required outlets or viewpoints.

Bias rules to enforce:\n${channel.bias_rules.map((r) => `- ${r}`).join('\n')}`;
}

function factPackTool() {
  return {
    type: 'object' as const,
    properties: {
      sources: {
        type: 'array',
        description: 'The sources you are selecting and citing',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            url: { type: 'string' },
            publication: { type: 'string' },
            published_at: { type: 'string' },
            excerpt: {
              type: 'string',
              description: 'The most relevant quote or summary from this source',
            },
          },
          required: ['id', 'title', 'url', 'publication', 'excerpt'],
        },
      },
      facts: {
        type: 'array',
        description: 'Discrete, attributable facts for the script writer to draw on',
        items: {
          type: 'object',
          properties: {
            claim: { type: 'string' },
            source_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs from the sources array above',
            },
          },
          required: ['claim', 'source_ids'],
        },
      },
      balance_check: {
        type: 'object',
        properties: {
          passed: { type: 'boolean' },
          note: { type: 'string' },
        },
        required: ['passed'],
      },
    },
    required: ['sources', 'facts', 'balance_check'],
  };
}
