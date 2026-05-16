Scaffold a new pipeline agent stage for VideoGenAI.

The user will provide the stage name (e.g. "assets", "render", "qa", "publish") and optionally a stage number.

Steps:

1. Read an existing stage for reference — use `packages/pipeline/src/agents/storyboarder.ts` as the template (it's the most complete example).
2. Read `packages/pipeline/src/db-ops.ts` to understand the available helpers.
3. Read `packages/pipeline/src/inngest/pipeline.ts` to understand where to wire the new stage.
4. Create `packages/pipeline/src/agents/<name>.ts` following the exact same pattern:
   - Define input/output Zod schemas at the top
   - Export a `run<Name>Stage(ctx)` function
   - Call `markStageRunning`, `generateStructuredOutput`, `markStageAwaitingApproval` or `markStageComplete` from db-ops
   - Use the `logger` from `../logger.ts`
5. Wire it into `packages/pipeline/src/inngest/pipeline.ts` at the correct sequence position.
6. Run `pnpm --filter @videogenai/pipeline exec tsc --noEmit` to verify types.
7. Report what was created and what still needs to be implemented (any TODOs left in the file).
