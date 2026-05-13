# AGENTS.md

Guide for AI coding assistants (Claude Code, Cursor, Codex, Aider, etc.) working on this repository. Follows the [agents.md](https://agents.md) convention.

## Project in one paragraph

VideoGenAI is a TypeScript monorepo that turns a one-line description into a finished, researched, animated YouTube video. The pipeline runs as durable [Inngest](https://www.inngest.com/) functions, each stage gated by human approval through a [Next.js](https://nextjs.org/) cockpit. Video composition uses [Remotion](https://www.remotion.dev/). The system is multi-channel: behavior is parameterized by YAML channel configs, never hardcoded.

## Repo layout

```
VideoGenAI/
├── apps/
│   └── web/                  Next.js 15 cockpit (App Router)
├── packages/
│   ├── pipeline/             Inngest functions, Claude Agent SDK agents, skills
│   ├── channels/             YAML channel configs + zod schema
│   ├── db/                   Drizzle schema + migrations (Neon Postgres)
│   ├── types/                Shared TS types (pipeline ↔ web)
│   └── remotion/             Video compositions (added in Phase 5)
├── docs/                     PLAN.md, ARCHITECTURE.md, CHANNELS.md
├── .github/workflows/        CI (lint + typecheck on PRs)
└── .env.example              Required keys (fill into .env, never commit)
```

## Setup

```bash
pnpm install
cp .env.example .env
pnpm dev            # web + inngest dev server
pnpm build          # full build
pnpm typecheck      # tsc --noEmit across workspace
pnpm lint           # eslint across workspace
pnpm test           # vitest
pnpm db:generate    # drizzle generate
pnpm db:migrate     # drizzle migrate
```

## Conventions

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- **No `any`.** Use `unknown` and narrow, or define a type. If you genuinely need an escape hatch, use `// eslint-disable-next-line` with a comment explaining why.
- Prefer `type` over `interface` unless you need declaration merging.

### Validation

- **Zod at every external boundary**: channel configs, LLM structured outputs, API route inputs, env vars.
- Never trust LLM output shape — parse it through a zod schema before using it.

### Code style

- Default to **no comments**. Add one only when the *why* is non-obvious (a hidden constraint, a workaround, a surprising behavior). Never comment *what* — the code should already say that.
- Small, focused modules. A file over ~200 lines is a signal to split.
- No premature abstractions. Three similar lines beat a clever generic. Wait for the third real use case before extracting.

### Commits

- **Conventional Commits** enforced by commitlint:
  - `feat(scope): ...` `fix(scope): ...` `chore(scope): ...` `docs(scope): ...` `refactor(scope): ...` `test(scope): ...`
  - Scopes: `pipeline`, `web`, `db`, `channels`, `remotion`, `ci`, `deps`.
- One logical change per commit. The history should read like a tutorial.
- Subject line ≤ 70 chars. Body wraps at 100. Reference issues with `Closes #N` in the footer.

### Branches & PRs

- `main` is protected — all changes via PR.
- Feature branches: `feat/stage-2-researcher`, `fix/stage-4-citation-leak`, etc.
- PR descriptions follow the template (Summary / Why / Test plan).

## Architecture summary

The pipeline runs as a sequence of Inngest steps. Each step:

1. Reads its input from the previous step's output (typed).
2. Runs an agent or deterministic transform.
3. Writes a structured artifact to the `stages` table.
4. If the channel config marks this stage as `human_approval: true`, calls `step.waitForEvent("approve.stage")` and pauses until the cockpit emits the event.

Stages: `brief → research → jargon → script → fact-check → storyboard → assets → render → qa → publish`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full data flow and [docs/PLAN.md](docs/PLAN.md) for the build order.

## Channel configs

Channels live in `packages/channels/configs/*.yaml`. The schema is `packages/channels/src/schema.ts` (zod). When adding behavior, **prefer extending the schema** over hardcoding `if (channel === 'aussie-politics')`. If you find yourself reaching for a channel-name branch, stop and ask: should this be a config field instead? The answer is almost always yes. See [docs/CHANNELS.md](docs/CHANNELS.md).

## Working with the LLM stages

- Agents live in `packages/pipeline/src/agents/`. Each agent is a function `(input, ctx) => Promise<TypedOutput>`.
- Skills (reusable capabilities like `fact-check-claim`, `find-stock-footage`) live in `packages/pipeline/src/skills/`.
- **Always enforce structured output** with zod. The Claude Agent SDK supports `tool_use` for this — use it.
- Citations are non-negotiable for the researcher and scriptwriter. Every script claim must reference a `source_id` from the fact pack. The fact-checker enforces this structurally — not by trusting the model.

## Secrets

Listed in [.env.example](.env.example). Never commit real values. Never log them. The cockpit reads them server-side only.

## When in doubt

- **Generalize.** Will this work for channel #5? If not, refactor before merging.
- **Type it.** If a value crosses a function boundary without a type, it's a bug waiting to happen.
- **Verify, don't assume.** Read the file, run the typecheck, check the output. Don't claim something works because it "should."

## What not to do

- Don't add features beyond what the current commit's scope demands.
- Don't add error handling, validation, or fallbacks for scenarios that can't happen. Trust internal callers; validate at boundaries.
- Don't run destructive git commands without asking (force-push, hard reset, branch delete).
- Don't commit `.env`, `node_modules/`, `runs/`, or rendered video output.
- Don't skip hooks (`--no-verify`) to bypass a failing lint or typecheck — fix the underlying issue.
