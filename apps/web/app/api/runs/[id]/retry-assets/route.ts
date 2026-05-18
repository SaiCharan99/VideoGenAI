import { db, runs, stages } from '@videogenai/db';
import { runAssetGenerator, runAssembler } from '@videogenai/pipeline';
import { loadChannel } from '@videogenai/channels';
import { scriptSchema, storyboardSchema } from '@videogenai/types';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: runId } = await params;

  const run = await db.query.runs.findFirst({ where: eq(runs.id, runId) });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const stageRows = await db.query.stages.findMany({ where: eq(stages.runId, runId) });
  const byStage = Object.fromEntries(stageRows.map((s) => [s.stageId, s]));

  const scriptRow = byStage.script;
  const storyboardRow = byStage.storyboard;

  if (!scriptRow?.output || !storyboardRow?.output) {
    return NextResponse.json(
      { error: 'script and storyboard stages must be approved first' },
      { status: 409 },
    );
  }

  const scriptParsed = scriptSchema.safeParse(scriptRow.output);
  const storyboardParsed = storyboardSchema.safeParse(storyboardRow.output);

  if (!scriptParsed.success || !storyboardParsed.success) {
    return NextResponse.json({ error: 'stage output failed schema validation' }, { status: 422 });
  }

  let channel: ReturnType<typeof loadChannel>;
  try {
    channel = loadChannel(run.channelId);
  } catch {
    return NextResponse.json({ error: `unknown channel: ${run.channelId}` }, { status: 422 });
  }

  // Mark the run as running again so the UI reflects activity
  await db.update(runs).set({ status: 'running', updatedAt: new Date() }).where(eq(runs.id, runId));

  // Reset asset and render stages so they re-run cleanly
  await db
    .update(stages)
    .set({ status: 'pending', output: null, error: null, updatedAt: new Date() })
    .where(and(eq(stages.runId, runId), eq(stages.stageId, 'assets')));
  await db
    .update(stages)
    .set({ status: 'pending', output: null, error: null, updatedAt: new Date() })
    .where(and(eq(stages.runId, runId), eq(stages.stageId, 'render')));

  // Run synchronously in background — response returns immediately
  void (async () => {
    try {
      const assets = await runAssetGenerator(runId, scriptParsed.data, storyboardParsed.data, channel);
      await runAssembler(runId, scriptParsed.data, storyboardParsed.data, assets, channel);
      await db
        .update(runs)
        .set({ status: 'complete', updatedAt: new Date() })
        .where(eq(runs.id, runId));
    } catch {
      await db
        .update(runs)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(runs.id, runId));
    }
  })();

  return NextResponse.json({ ok: true });
}
