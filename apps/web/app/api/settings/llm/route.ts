import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

type Provider = 'anthropic' | 'openai';

interface Settings {
  llm_provider?: Provider;
}

const SETTINGS_PATH = join(process.cwd(), '.videogenai-settings.json');

function readSettings(): Settings {
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8')) as Settings;
  } catch {
    return {};
  }
}

function writeSettings(settings: Settings): void {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function currentProvider(): Provider {
  const settings = readSettings();
  if (settings.llm_provider) return settings.llm_provider;

  const env = process.env.LLM_PROVIDER;
  if (env === 'openai') return 'openai';
  if (env === 'anthropic') return 'anthropic';

  if (process.env.OPENAI_API_KEY ?? process.env.CODEX_API_KEY) return 'openai';
  return 'anthropic';
}

export function GET() {
  return NextResponse.json({ provider: currentProvider() });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as { provider: unknown };
  if (body.provider !== 'anthropic' && body.provider !== 'openai') {
    return NextResponse.json(
      { error: 'Invalid provider — must be anthropic or openai' },
      { status: 400 },
    );
  }
  const settings = readSettings();
  settings.llm_provider = body.provider;
  writeSettings(settings);
  return NextResponse.json({ provider: body.provider });
}
