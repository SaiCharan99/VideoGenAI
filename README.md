# VideoGenAI

An end-to-end pipeline that turns a one-line description into a researched, scripted, animated, voiced YouTube video — with a human-approval cockpit between every stage.

Multi-channel by design. Channel-specific behavior (tone, source-balancing rules, jargon depth, visual style) is config-driven, not hardcoded. Adding a new channel is a YAML file, not a code change.

## Status

🚧 Early development. Building text-stages first (brief → research → script), then storyboard + render, then publish.

See [docs/PLAN.md](docs/PLAN.md) for the full phased plan.

## Stack

- **Orchestration:** Claude Agent SDK (TypeScript) + [Inngest](https://www.inngest.com/) for durable steps with human-approval gates
- **Video composition:** [Remotion](https://www.remotion.dev/) (programmatic React-based video) with their official Claude Agent Skills integration
- **Cockpit:** Next.js 15 (App Router) — single repo, shared types with the pipeline
- **DB:** Neon Postgres + Drizzle ORM
- **Voice:** ElevenLabs
- **Visuals:** Pexels (stock) + Flux (stills via Replicate) + Veo 3.1 (short b-roll via Replicate)
- **Captions:** Whisper (word-level) → Remotion overlay
- **Publish:** YouTube Data API v3

## Quickstart

> Requires Node 20+ and [pnpm](https://pnpm.io/) 9+.

```bash
pnpm install
cp .env.example .env       # fill in keys as features come online
pnpm dev                   # starts the cockpit + Inngest dev server
```

## Docs

- [PLAN.md](docs/PLAN.md) — full phased build plan with commit roadmap
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — pipeline stages, agents, skills, data flow
- [CHANNELS.md](docs/CHANNELS.md) — channel-config schema and how to add a new channel
- [AGENTS.md](AGENTS.md) — guide for AI coding assistants working on this repo

## Channels (planned)

1. **Aussie politics explained for dummies** — explainer style, jargon-defined, historically contextualized, source-balanced (no left/right skew).
2. **Latest tech explainers** — fresh news ingested, technical terms unpacked.

More channels will be added as YAML configs once the pipeline stabilizes.

## License

MIT — see [LICENSE](LICENSE).
