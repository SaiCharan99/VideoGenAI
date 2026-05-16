import { defineConfig } from 'drizzle-kit';
import { loadEnvFile } from 'process';
import { resolve } from 'path';

// Load root .env so drizzle-kit works without manually exporting DATABASE_URL
try {
  loadEnvFile(resolve(import.meta.dirname, '../../.env'));
} catch {
  // .env may not exist in CI — rely on actual environment variables
}

if (!process.env['DATABASE_URL']) {
  throw new Error('DATABASE_URL is required. Copy .env.example to .env and fill it in.');
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'],
  },
  verbose: true,
  strict: true,
});
