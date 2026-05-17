import type { NextConfig } from 'next';
import { loadEnvFile } from 'process';
import { join } from 'path';

// Load root .env so API keys defined there are available inside Next.js.
// apps/web/.env.local only carries DATABASE_URL; all LLM/search keys live at repo root.
// When pnpm runs workspace scripts with -r, CWD is the package dir (apps/web),
// so ../../.env reaches the monorepo root. The second try handles direct invocation.
for (const rel of ['../../.env', '.env']) {
  try {
    loadEnvFile(join(process.cwd(), rel));
    break;
  } catch {
    // try next path
  }
}

const nextConfig: NextConfig = {
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
