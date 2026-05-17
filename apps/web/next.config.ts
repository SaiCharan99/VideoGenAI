import type { NextConfig } from 'next';
import { loadEnvFile } from 'process';
import { join } from 'path';

// Load root .env before NextConfig is evaluated so process.env has all pipeline keys.
// When pnpm -r sets CWD to apps/web, go up two levels to the monorepo root.
// The second try handles direct invocation from the monorepo root.
for (const rel of ['../../.env', '.env']) {
  try {
    loadEnvFile(join(process.cwd(), rel));
    break;
  } catch {
    // try next path
  }
}

// Pipeline packages are compiled by Next.js webpack (transpilePackages).
// Webpack's DefinePlugin captures process.env.* at compile time from only the
// .env files Next.js loaded itself (.env.local etc.) — it does NOT pick up vars
// set by loadEnvFile above unless they are explicitly forwarded here via the
// env key. Values are read from process.env right now (after loadEnvFile ran).
const pipelineEnv: Record<string, string> = {};
const PIPELINE_KEYS = [
  'OPENAI_API_KEY',
  'CODEX_API_KEY',
  'CODEX_MODEL',
  'CODEX_REASONING_EFFORT',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'LLM_PROVIDER',
  'BRAVE_SEARCH_API_KEY',
  'PERPLEXITY_API_KEY',
  'ELEVENLABS_API_KEY',
  'ELEVENLABS_DEFAULT_VOICE_ID',
  'PEXELS_API_KEY',
  'REPLICATE_API_TOKEN',
];
for (const key of PIPELINE_KEYS) {
  const val = process.env[key];
  if (val) pipelineEnv[key] = val; // only forward truthy values so ?? defaults in pipeline still apply
}

const nextConfig: NextConfig = {
  env: pipelineEnv,
  transpilePackages: [
    '@videogenai/channels',
    '@videogenai/db',
    '@videogenai/pipeline',
    '@videogenai/types',
  ],
  webpack(config) {
    // Workspace packages use .js extensions for ESM; map them to .ts sources
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },
};

export default nextConfig;
