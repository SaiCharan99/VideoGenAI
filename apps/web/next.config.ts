import type { NextConfig } from 'next';
import { loadEnvFile } from 'process';
import { resolve } from 'path';

// Load root .env so API keys defined there are available inside Next.js.
// apps/web/.env.local only carries DATABASE_URL; all LLM/search keys live at repo root.
try {
  loadEnvFile(resolve(import.meta.dirname, '../../.env'));
} catch {
  // .env absent in CI — rely on actual environment variables
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
