# Build Plan

The phased plan. Each phase ends at a meaningful checkpoint where the system is usable in some form, even if incomplete. Text pipeline first — script quality is the foundation everything else rests on.

## Guiding principles

1. **Generalize across channels.** Every pipeline stage reads from a channel-config object. No hardcoded channel-specific logic.
2. **Human-in-the-loop early.** Every stage has an approval gate until the system earns trust. Auto-approval comes later, stage by stage.
3. **Citations are structural, not vibes.** Every script claim references a `source_id`. The fact-checker enforces this — we don't trust the model to self-police.
4. **Bias control through audit, not prompting.** A dedicated balance-checker pass is more reliable than asking one agent to "be unbiased."
5. **Spend tokens where judgment is needed, code where it isn't.** TTS calls and FFmpeg invocations don't need an LLM.
6. **Iterate on text before pixels.** Bad script + great visuals = bad video. Great script + okay visuals = watchable video.

---

## ✅ Phase 0 — Foundations

pnpm workspace, strict TS, ESLint, Prettier, husky + commitlint, GitHub Actions CI, `.env.example`. Proprietary license (MIT removed).

**Done.**

---

## ✅ Phase 1 — Data and config

Drizzle schema (runs, stages, assets) + Neon Postgres. Channel configs (aussie-politics, latest-tech) as static TypeScript registry (YAML kept as docs). Zod types package.

**Done.** Migration applied. `uniqueIndex` on `(run_id, stage_id)` required for upsert — fixed.

---

## ✅ Phase 2 — Pipeline core, text stages

Inngest setup. Agents: brief-builder (1), researcher (2), scriptwriter (4). LLM abstraction layer with OpenAI / Anthropic provider toggle. Input normalisation (trim/whitespace collapse). Silent typo correction in brief prompt.

**Done.** Env loading via `next.config.ts` DefinePlugin forwarding fixed — pipeline now resolves `OPENAI_API_KEY` correctly at runtime.

---

## ✅ Phase 3 — The cockpit (shell)

Next.js 15 App Router. Runs list, new-run form, run detail page, stage cards with output viewers. Stage approval flow wired to Inngest `waitForEvent`. LLM provider toggle (OpenAI ↔ Anthropic) in header with confirmation modal. Claude Code slash commands (add-stage, add-channel, db-migrate, run-status). README with full Mermaid pipeline diagram.

**Done.** Several footer buttons (View raw JSON, Copy, Open sources) exist in the UI but are not wired — addressed in Phase 3.5.

---

## ✅ Phase 4 — Audit and storyboard

Agents: jargon-miner (3), fact-checker (5), storyboarder (6). All six text-stage agents exist and are registered in the Inngest pipeline function.

**Done.** End-to-end pipeline run (stages 1–6) pending first confirmation — env issues resolved as of this session.

---

## 🔄 Phase 3.5 — Cockpit completion + revision flow

_Inserted after Phase 4 because you can't iterate on script quality without the ability to edit stage outputs._

### 3.5-A: First verified e2e run

- [ ] Confirm stages 1–6 complete successfully without errors
- [ ] Verify all six stage outputs land in the DB and render correctly in the cockpit
- [ ] Fix any agent-level bugs surfaced by real runs

### ✅ 3.5-B: Wire dead UI buttons

- [x] **View raw JSON** — modal or slide-out showing raw `stage.output` as formatted JSON
- [x] **Copy output** — copy raw JSON to clipboard
- [x] **Open all sources** (research stage) — open each `source.url` in a new tab

### ✅ 3.5-C: Revision flow — Edit & Approve

The most impactful revision mode: user reads the AI output, makes corrections inline, approves the edited version.

- [x] `StageCard`: "Edit output" opens an inline JSON textarea editor. Cancel / Approve with edits buttons replace the banner.
- [x] Approve endpoint (`POST /api/runs/[id]/stages/[stageId]/approve`): accept optional `editedOutput` in body; save to `stages.output` before marking approved; pass `editedOutput` in the Inngest event data.
- [x] Pipeline (`pipeline.ts`): after each `waitForEvent`, use `event.data.editedOutput ?? stepResult` so downstream stages receive the corrected output.

### ✅ 3.5-D: Revision flow — Re-run with feedback

For larger changes where the model should regenerate, not the user type JSON.

- [x] `StageCard`: "Re-run" button opens a feedback textarea; submit sends feedback to backend; stage transitions back to running.
- [x] New endpoint `POST /api/runs/[id]/stages/[stageId]/revise` — marks stage running, sends `videogenai/stage.response` with `action: 'revise'`.
- [x] Pipeline: loop pattern using unique step IDs (`stage/brief/1`, `stage/brief/2`, etc.); each iteration injects feedback into agent prompt; loops until `action === 'approved'`.
- [x] All five gated agent functions accept `feedbackContext?: string` appended to their user prompt.

**Exit criteria:** From the browser: start a run, watch stages 1–6 complete, edit the brief output, approve with edits, watch research use the edited brief. Re-run the script with feedback. Everything reflected in the DB.

---

## 🛑 Quality checkpoint

**Stop here.** Generate 5–10 scripts across both channels. Read them critically. If they are not at "I would publish this on YouTube" quality, no amount of rendering will fix it. Iterate on prompts, channel configs, and source-balancing rules until the text output is genuinely good. Only then proceed to Phase 5.

Specifically verify:

- Brief angles are specific and non-generic
- Research sources are credible and balanced per channel bias rules
- Scripts have structural citations (every claim has a `source_id`)
- Fact-checker correctly rejects unsourced claims
- Storyboard scene plan is coherent and producible

---

## ⬜ Phase 5 — Render

Pixels.

| #   | Task                                                                                                | Purpose                      |
| --- | --------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | `packages/remotion` — kinetic-explainer composition template                                        | Base visual template         |
| 2   | Channel-specific theming (politics: news aesthetic; tech: clean minimal)                            | Per-channel visual style     |
| 3   | Stage 7: asset-generator agent (TTS via ElevenLabs, stock via Pexels, AI stills via Replicate/Flux) | All assets fetched/generated |
| 4   | Stage 8: assembler agent — Remotion render trigger                                                  | First video output           |
| 5   | Cockpit: asset preview (waveform, image thumbnails, clip thumbnails)                                | Review before render         |

**Exit criteria:** End-to-end run produces a watchable MP4. Quality is okay but not great.

---

## ⬜ Phase 6 — QA and publish

The last mile.

| #   | Task                                                                                       | Purpose                                                       |
| --- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| 1   | Stage 9: QA reviewer (vision model watches rendered output frame-by-frame)                 | Catches obvious issues: wrong names, bad cuts, caption errors |
| 2   | Stage 10: publisher (YouTube Data API v3 OAuth upload)                                     | Upload with AI-disclosure label                               |
| 3   | Cockpit: publish-approval UI — thumbnail editor, title/description editor, schedule picker | Human approves final publish                                  |

**Exit criteria:** Click "publish" in the cockpit, video lands on YouTube with AI-content disclosure, metadata correct.

---

## Beyond Phase 6

- **Auto-approval graduation** — per-channel, per-stage flags to skip human gate once trust is earned. Start with jargon (no editorial judgment needed), end with brief (always needs eyes).
- **Shorts variant** — 9:16 cutdown from the same source material, auto-generated in Phase 5 render step.
- **Thumbnail generation** — Flux prompt from storyboard first frame, A/B tested titles overlaid.
- **Analytics feedback loop** — feed retention/CTR back into the brief-builder as channel performance context.
- **Additional channels** — the whole point. New channel = new YAML. Should "just work" with zero pipeline code changes.
- **Cost tracking** — per-run token/API cost ledger surfaced in cockpit.

---

## Risks and mitigations

| Risk                                    | Mitigation                                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Hallucinated facts in news/politics     | Structural citations: every claim references a `source_id`. Fact-checker rejects unsourced claims.                            |
| Bias creep                              | Dedicated balance-check pass with config-driven source-balancing rules per channel.                                           |
| Visual uncanny valley                   | Avoid AI avatars. Lean on kinetic typography, stock, real news clips. AI b-roll only when storyboard explicitly calls for it. |
| Cost per video                          | Phases 2–4 nearly free (LLM calls only). Phase 5+ adds TTS ($) and optional AI video ($$). Budget tracking in Phase 5.        |
| YouTube ToS                             | AI-disclosure label baked into publisher. Human approval required before upload until trust is established.                   |
| Channel-specific code leaking into core | Code review: any `if (channel === ...)` triggers a refactor-to-config conversation.                                           |
| LLM provider lock-in                    | Provider abstraction layer in `llm.ts` — toggle between OpenAI and Anthropic without touching agents.                         |
