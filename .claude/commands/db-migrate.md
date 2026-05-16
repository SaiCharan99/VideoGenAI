Apply pending Drizzle migrations to the Neon database.

Run:

```
pnpm --filter @videogenai/db db:migrate
```

If it fails with "DATABASE_URL is required", the drizzle config will auto-load `.env` from the repo root — check that `.env` exists and has `DATABASE_URL` set.

After the migration completes, report how many migrations were applied and confirm the schema is up to date. If there were no pending migrations, say so.
