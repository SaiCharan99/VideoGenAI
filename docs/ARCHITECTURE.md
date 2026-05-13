# Architecture

## High-level data flow

```
       ┌────────────────────┐
input: │ one-liner + channel│
       └─────────┬──────────┘
                 ▼
         ┌─────────────────┐
         │ ① Brief builder │  expand to {angle, audience, length, must-cover, must-avoid}
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ ② Researcher    │  multi-source search → fact pack with citations
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ ③ Jargon miner  │  extract terms-to-explain with definitions
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ ④ Scriptwriter  │  structured: [{line, source_ids[]}]  for each scene
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ ⑤ Fact-checker  │  rejects unsourced claims, flags skew → may loop back to ④
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ ⑥ Storyboarder  │  per-scene: visual_kind (b-roll | generated_still | text_card | chart | clip)
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ ⑦ Asset gen     │  TTS, stills, b-roll clips, captions (Whisper word-timestamps)
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ ⑧ Assembler     │  Remotion render → MP4
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ ⑨ QA reviewer   │  vision model watches output, flags issues
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ ⑩ Publisher     │  YouTube upload with AI-disclosure
         └─────────────────┘
```

Between every stage is an Inngest `step.waitForEvent("approve.stage", {...})` that pauses until the cockpit emits an approval event (or auto-approves, if the channel config allows).

## Components

### Orchestrator

[Inngest](https://www.inngest.com/) hosts the durable functions. Each pipeline run is one Inngest function call. Each stage is one `step.run()` followed by one `step.waitForEvent()`. State survives process restarts, retries, and human pauses of arbitrary length.

### Agents

Each stage that requires LLM reasoning is implemented as a function in `packages/pipeline/src/agents/` that:

- Receives typed input (the prior stage's output).
- Calls the Claude Agent SDK with a stage-specific system prompt, tools, and tool-use-enforced structured output.
- Returns a typed artifact validated by zod.

Agents do not share context with each other. Each is invoked fresh per run, with only its declared input.

### Skills

Reusable capabilities invoked by agents or the orchestrator. Examples:

- `fact-check-claim` — verifies a single claim against a list of sources.
- `balance-sources` — given a list of sources, returns whether the spread satisfies the channel's `source_balance` rule.
- `find-stock-footage` — Pexels search.
- `render-remotion` — invokes the Remotion CLI with a composition + props.
- `youtube-upload` — wraps the YouTube Data API.

Skills are deterministic where possible. They live in `packages/pipeline/src/skills/`.

### Channel config

Single source of truth for per-channel behavior. Located in `packages/channels/configs/*.yaml`, validated by the zod schema in `packages/channels/src/schema.ts`. See [CHANNELS.md](CHANNELS.md).

### Persistence

[Neon Postgres](https://neon.tech/) accessed via [Drizzle ORM](https://orm.drizzle.team/). Schema in `packages/db/src/schema.ts`. Core tables:

- `runs` — one row per pipeline invocation. Tracks channel, input, status.
- `stages` — one row per (run × stage). Stores input/output JSON, status, timestamps, approver.
- `assets` — files (audio, images, video clips) referenced by stages. Stored locally during dev, R2 later.

### Cockpit

Next.js 15 (App Router) in `apps/web/`. Server components for data fetching, client components for interactivity. Approves stages by POSTing to a route that emits an Inngest event.

### Render

Remotion compositions in `packages/remotion/` (added Phase 5). Each channel maps to a composition template parameterized by the storyboard JSON. The Remotion + Claude Agent Skills integration handles agent-driven composition modifications.

## Stage contract

Every stage implements:

```ts
type Stage<Input, Output> = {
  id: StageId;
  inputSchema: ZodType<Input>;
  outputSchema: ZodType<Output>;
  run(input: Input, ctx: StageCtx): Promise<Output>;
};

type StageCtx = {
  runId: string;
  channel: ChannelConfig;
  logger: Logger;
};
```

This is the only contract. Stages do not know about Inngest, the cockpit, or each other. The orchestrator wires them together.

## Event flow (approval gate)

```
cockpit                  inngest                     pipeline
  │                        │                           │
  │  start run (POST)      │                           │
  │ ─────────────────────► │                           │
  │                        │  invoke pipeline fn       │
  │                        │ ─────────────────────────►│
  │                        │                           │  stage 1 runs
  │                        │                           │  writes output to DB
  │                        │  step.waitForEvent        │
  │                        │ ◄─────────────────────────│
  │  GET run detail        │                           │
  │ ─────────────────────► │                           │
  │  shows stage output    │                           │
  │ ◄───────────────────── │                           │
  │  user clicks approve   │                           │
  │ ─────────────────────► │  emit "approve.stage"     │
  │                        │ ─────────────────────────►│
  │                        │                           │  stage 2 runs ...
```

## Why Inngest

Our work is multi-step, stateful, and involves human gates that may stay open for hours or days. Inngest's `step.waitForEvent` is purpose-built for this. BullMQ would require building durable state machines on top of a queue; Inngest gives them natively. No Redis to operate; free tier is generous.

## Why Postgres (Neon) from day one

SQLite is tempting for "just dev," but Drizzle's dialect abstraction leaks (JSON columns, generated columns, array types). Migrating later means rewriting migrations. Neon offers free serverless Postgres with branchable databases; the dev experience is no worse than SQLite. Decision made: no migration risk, ship faster.

## Why Remotion (not Sora/Veo end-to-end)

- Code-driven → deterministic, cheap, fast renders.
- Kinetic typography and charts (huge for politics/tech explainers) are trivial in React.
- Remotion shipped official Claude Agent Skills in January 2026 — the AI-to-composition gap is solved.
- Full AI-generated video (Sora, Veo) caps at 8s clips, costs $0.15–$0.75/sec, and looks inconsistent shot-to-shot. Veo b-roll is used surgically, not as the primary format.
- AI avatars are excluded entirely: they kill credibility for news/politics content.
