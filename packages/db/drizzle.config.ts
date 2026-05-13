import { defineConfig } from 'drizzle-kit';

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
