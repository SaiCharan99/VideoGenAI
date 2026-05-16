import { readFileSync } from 'fs';
import { join } from 'path';

interface Settings {
  llm_provider?: string;
}

function readSettings(): Settings {
  try {
    return JSON.parse(
      readFileSync(join(process.cwd(), '.videogenai-settings.json'), 'utf8'),
    ) as Settings;
  } catch {
    return {};
  }
}

/**
 * Resolves the active LLM provider with this priority:
 * 1. .videogenai-settings.json (written by the cockpit toggle)
 * 2. LLM_PROVIDER env var (explicit kill switch)
 * 3. Key-presence detection (OPENAI/CODEX key → openai, else anthropic)
 */
export function resolveProvider(): 'anthropic' | 'openai' {
  const settings = readSettings();
  if (settings.llm_provider === 'openai') return 'openai';
  if (settings.llm_provider === 'anthropic') return 'anthropic';

  const explicit = process.env.LLM_PROVIDER;
  if (explicit === 'openai') return 'openai';
  if (explicit === 'anthropic') return 'anthropic';

  if (process.env.OPENAI_API_KEY ?? process.env.CODEX_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';

  throw new Error(
    'No LLM provider configured — set LLM_PROVIDER=anthropic or LLM_PROVIDER=openai in .env, or use the cockpit toggle.',
  );
}
