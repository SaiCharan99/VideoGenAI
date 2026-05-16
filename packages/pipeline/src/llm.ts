import Anthropic from '@anthropic-ai/sdk';
import { type ZodType } from 'zod';

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

const DEFAULT_CODEX_MODEL = 'gpt-5.2-codex';
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

/**
 * Kill switch: set LLM_PROVIDER=anthropic or LLM_PROVIDER=openai to force a provider.
 * When unset, falls back to whichever API key is present (OpenAI checked first).
 */
async function generateRaw<T>(options: GenerateStructuredOptions<T>): Promise<unknown> {
  const provider = process.env.LLM_PROVIDER;

  if (provider === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        `${options.stageName}: LLM_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set.`,
      );
    }
    return generateWithAnthropic(options);
  }

  if (provider === 'openai') {
    const apiKey = process.env.CODEX_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        `${options.stageName}: LLM_PROVIDER=openai but neither OPENAI_API_KEY nor CODEX_API_KEY is set.`,
      );
    }
    return generateWithOpenAi(apiKey, options);
  }

  // Key-presence fallback when LLM_PROVIDER is unset
  const openAiApiKey = process.env.CODEX_API_KEY ?? process.env.OPENAI_API_KEY;
  if (openAiApiKey) return generateWithOpenAi(openAiApiKey, options);
  if (process.env.ANTHROPIC_API_KEY) return generateWithAnthropic(options);

  throw new Error(
    `${options.stageName}: no LLM provider configured — set LLM_PROVIDER=anthropic or LLM_PROVIDER=openai and the corresponding API key.`,
  );
}

async function generateWithOpenAi<T>(
  apiKey: string,
  options: GenerateStructuredOptions<T>,
): Promise<unknown> {
  const reasoningEffort = process.env.CODEX_REASONING_EFFORT;
  const body: OpenAiRequestBody = {
    model: process.env.CODEX_MODEL ?? process.env.OPENAI_MODEL ?? DEFAULT_CODEX_MODEL,
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

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`OpenAI/Codex request failed: ${res.status} ${await res.text()}`);
  }

  const response = (await res.json()) as OpenAiResponse;
  const text = extractOpenAiOutputText(response);
  return parseJson(text, 'OpenAI/Codex');
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
