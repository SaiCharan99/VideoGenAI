Add a new YouTube channel to VideoGenAI.

The user will provide the channel name and a brief description of its style/audience.

Steps:

1. Read `apps/web/lib/channels.ts` to understand the existing channel config schema.
2. Read the existing channel entries (aussie-politics, tech-explainers) as examples.
3. Add a new channel entry following the exact same structure:
   - id (kebab-case)
   - name (full display name)
   - short (short label for sidebar)
   - description
   - palette (two brand colors as hex)
   - rules (array of editorial rules: tone, sourcing, jargon, bias, etc.)
4. If a separate channel config file exists under `packages/pipeline/src/channels/`, create one there too.
5. Verify TypeScript compiles: `pnpm --filter web exec tsc --noEmit`
6. Report the new channel id and remind the user to add any channel-specific prompt instructions to the pipeline agents if needed.
