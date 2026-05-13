# Build Plan

The elaborate phased plan. Each phase ends at a meaningful checkpoint where the system is usable in some form, even if incomplete. We do not build all stages in parallel — we build the text pipeline first because script quality is the foundation everything else rests on.

## Guiding principles

1. **Generalize across channels.** Every pipeline stage reads from a channel-config object. No hardcoded channel-specific logic.
2. **Human-in-the-loop early.** Every stage has an approval gate until the system earns trust. Auto-approval comes later, stage by stage.
3. **Citations are structural, not vibes.** Every script claim references a `source_id`. The fact-checker enforces this — we don't trust the model to self-police.
4. **Bias control through audit, not prompting.** A dedicated balance-checker pass is more reliable than asking one agent to "be unbiased."
5. **Spend tokens where judgment is needed, code where it isn't.** TTS calls and FFmpeg invocations don't need an LLM.
6. **Iterate on text before pixels.** Bad script + great visuals = bad video. Great script + okay visuals = watchable video.

## Phases

### Phase 0 — Foundations

Establish the workspace, tooling, and conventions before any product code exists.

| # | Commit | Purpose |
|---|---|---|
| 1 | `chore: initialize pnpm workspace with strict TS, ESLint, Prettier` | Monorepo skeleton |
| 2 | `chore: add husky + lint-staged + commitlint` | Enforce conventions automatically |
| 3 | `chore: add .editorconfig, .gitignore, MIT license` | Hygiene |
| 4 | `chore(ci): GitHub Actions for lint + typecheck on PRs` | CI from day one |
| 5 | `chore: add .env.example documenting required keys` | Document secrets |

**Exit criteria:** `pnpm install && pnpm typecheck && pnpm lint` all pass on an empty workspace.

### Phase 1 — Data and config

The shape of state and channel behavior.

| # | Commit | Purpose |
|---|---|---|
| 6 | `feat(db): drizzle schema for runs, stages, assets + Neon http driver` | Persistence layer |
| 7 | `feat(channels): zod schema for channel config + aussie-politics + tech` | Multi-channel parameterization |
| 8 | `feat(types): shared types package for pipeline ↔ web` | One source of truth for cross-package types |

**Exit criteria:** A new YAML in `packages/channels/configs/` is parseable and typed end-to-end. `pnpm db:generate` produces a clean migration.

### Phase 2 — Pipeline core, text stages

The brain of the system. No pixels yet.

| # | Commit | Purpose |
|---|---|---|
| 9 | `feat(pipeline): Inngest setup, Stage interface, run orchestrator` | Pipeline runtime |
| 10 | `feat(pipeline): stage 1 brief-builder agent` | One-liner → structured brief |
| 11 | `feat(pipeline): stage 2 researcher with citation enforcement` | Brief → fact pack with sources |
| 12 | `feat(pipeline): stage 4 scriptwriter with claim/source pairs` | Fact pack → script with structural citations |

**Exit criteria:** Run the pipeline against `aussie-politics` and one test brief; get a complete, sourced script back as JSON. No UI yet — invoke through the Inngest dev server.

### Phase 3 — The cockpit

Human-in-the-loop UI. No new pipeline capability — just exposure of what already exists.

| # | Commit | Purpose |
|---|---|---|
| 13 | `feat(web): Next.js shell, runs list, new-run form` | App skeleton |
| 14 | `feat(web): run detail page with stage cards` | View / edit / approve per stage |
| 15 | `feat(web): wire stage approvals to Inngest waitForEvent` | The approval gate |
| 16 | `feat(web): stage output viewers (markdown, JSON, sources)` | Polish |

**Exit criteria:** From the browser, kick off a new run, watch stages progress, edit stage outputs if needed, approve each one. Final output: a finished script.

### Phase 4 — Audit and storyboard

The remaining text stages.

| # | Commit | Purpose |
|---|---|---|
| 17 | `feat(pipeline): stage 3 jargon miner` | Identify and define terms |
| 18 | `feat(pipeline): stage 5 fact-checker + stage 6 storyboarder` | Bias/citation audit + per-scene visual plan |

**Exit criteria:** Run produces a fully specced video as text: script + jargon definitions + per-scene visual plan + verified citations. Internally publishable.

### 🛑 Quality checkpoint

Stop here. Generate 5–10 scripts across both channels. Read them critically. If they are not at "I would publish this on YouTube" quality, no amount of rendering will fix it. Iterate on prompts, channel configs, source-balancing rules until the text output is genuinely good. Only then proceed.

### Phase 5 — Render

Pixels.

| # | Commit | Purpose |
|---|---|---|
| 19 | `feat(remotion): kinetic-explainer composition template` | Base visual template |
| 20 | `feat(remotion): channel-specific theming (politics, tech)` | Per-channel visual style |
| 21 | `feat(pipeline): stage 7 asset generator (TTS, stock, generated)` | All assets fetched/generated |
| 22 | `feat(pipeline): stage 8 assembler — Remotion render` | First video output |

**Exit criteria:** End-to-end run produces a watchable MP4. Quality is okay but not great.

### Phase 6 — QA and publish

The last mile.

| # | Commit | Purpose |
|---|---|---|
| 23 | `feat(pipeline): stage 9 QA reviewer (vision model watches output)` | Catches obvious issues |
| 24 | `feat(pipeline): stage 10 publisher (YouTube Data API)` | Upload with disclosure label |
| 25 | `feat(web): publish-approval UI with thumbnail/title/description editor` | Human approves final publish |

**Exit criteria:** Click "publish" in the cockpit, video lands on YouTube with AI-content disclosure, metadata correct.

## Beyond Phase 6

- Auto-approval graduation: per-channel, per-stage flags to skip the human gate once trust is earned.
- Shorts variant: 9:16 cutdown from the same source.
- Thumbnail generation.
- A/B title testing.
- Analytics feedback loop: feed retention/CTR back into the brief-builder for future runs.
- Additional channels (the whole point — these should "just work").

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Hallucinated facts in news/politics | Structural citations: every claim references a `source_id`. Fact-checker rejects unsourced claims. |
| Bias creep | Dedicated balance-check pass with config-driven source-balancing rules per channel. |
| Visual uncanny valley | Avoid AI avatars entirely. Lean on kinetic typography, stock, real news clips. Use generated b-roll only when storyboard explicitly calls for it. |
| Cost per video | Phase 2–4 are nearly free (just LLM calls). Phase 5+ adds TTS ($) and optional Veo b-roll ($$). Budget tracking added in Phase 5. |
| YouTube ToS | AI-disclosure label baked into publisher. Human approval required before upload until trust is established. |
| Channel-specific code leaking into core | Code review checklist: any `if (channel === ...)` triggers a refactor-to-config conversation. |
