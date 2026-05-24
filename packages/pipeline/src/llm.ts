import Anthropic from '@anthropic-ai/sdk';
import { type ZodType } from 'zod';
import { resolveProvider } from './settings.js';

/**
 * Shared LLM adapter for all pipeline agents.
 * It keeps provider selection in one place, prefers Codex/OpenAI credentials,
 * falls back to Anthropic when needed, and validates every model response
 * against the stage's zod schema before the rest of the pipeline sees it.
 */
interface GenerateStructuredOptions<T> {
  stageName: string;
  schemaName: string;
  schemaDescription: string;
  jsonSchema: Record<string, unknown>;
  outputSchema: ZodType<T>;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}

interface OpenAiResponse {
  output_text?: unknown;
  output?: unknown;
}

interface OpenAiRequestBody {
  model: string;
  instructions: string;
  input: string;
  max_output_tokens: number;
  text: {
    format: {
      type: 'json_schema';
      name: string;
      schema: Record<string, unknown>;
      strict: false;
    };
  };
  reasoning?: {
    effort: string;
  };
}

const DEFAULT_CODEX_MODEL = 'gpt-5.4';
const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-4-7';

export async function generateStructuredOutput<T>(
  options: GenerateStructuredOptions<T>,
): Promise<T> {
  const raw = await generateRaw(options);
  const parsed = options.outputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${options.stageName}: invalid output — ${parsed.error.toString()}`);
  }
  return parsed.data;
}

async function generateRaw<T>(options: GenerateStructuredOptions<T>): Promise<unknown> {
  const provider = resolveProvider();

  if (provider === 'openai') {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const apiKey = process.env.OPENAI_API_KEY || process.env.CODEX_API_KEY;
    if (!apiKey) {
      throw new Error(
        `${options.stageName}: provider resolved to openai but neither OPENAI_API_KEY nor CODEX_API_KEY is set.`,
      );
    }
    return generateWithOpenAi(apiKey, options);
  }

  return generateWithAnthropic(options);
}

async function generateWithOpenAi<T>(
  apiKey: string,
  options: GenerateStructuredOptions<T>,
): Promise<unknown> {
  const reasoningEffort = process.env.CODEX_REASONING_EFFORT;
  const body: OpenAiRequestBody = {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    model: process.env.CODEX_MODEL || process.env.OPENAI_MODEL || DEFAULT_CODEX_MODEL,
    instructions: options.systemPrompt,
    input: options.userPrompt,
    max_output_tokens: options.maxTokens,
    text: {
      format: {
        type: 'json_schema',
        name: options.schemaName,
        schema: options.jsonSchema,
        strict: false,
      },
    },
  };
  if (reasoningEffort) {
    body.reasoning = { effort: reasoningEffort };
  }

  const MAX_ATTEMPTS = 4;
  const BASE_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const response = (await res.json()) as OpenAiResponse;
      const text = extractOpenAiOutputText(response);
      return parseJson(text, 'OpenAI/Codex');
    }

    const isTransient = res.status >= 500 || res.status === 429;
    const responseText = await res.text();

    if (!isTransient || attempt === MAX_ATTEMPTS) {
      throw new Error(`OpenAI/Codex request failed: ${res.status} ${responseText}`);
    }

    const delayMs = BASE_DELAY_MS * 2 ** (attempt - 1);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error('OpenAI/Codex: unreachable');
}

async function generateWithAnthropic<T>(options: GenerateStructuredOptions<T>): Promise<unknown> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? DEFAULT_ANTHROPIC_MODEL,
    max_tokens: options.maxTokens,
    system: [
      {
        type: 'text',
        text: options.systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: options.schemaName,
        description: options.schemaDescription,
        input_schema: options.jsonSchema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: options.schemaName },
    messages: [
      {
        role: 'user',
        content: options.userPrompt,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === 'tool_use');
  if (toolUse?.type !== 'tool_use') {
    throw new Error(`${options.stageName}: Anthropic did not call the expected tool`);
  }

  return toolUse.input;
}

function extractOpenAiOutputText(response: OpenAiResponse): string {
  if (typeof response.output_text === 'string') return response.output_text;

  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!isRecord(item)) continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const contentItem of content) {
      if (!isRecord(contentItem)) continue;
      const text = contentItem.text;
      if (typeof text === 'string') return text;
    }
  }

  throw new Error('OpenAI/Codex response did not include output text');
}

function parseJson(text: string, provider: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${provider} returned non-JSON structured output: ${String(err)}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
