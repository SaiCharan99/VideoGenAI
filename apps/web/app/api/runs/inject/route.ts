import { db, runs } from '@videogenai/db';
import { inngest } from '@videogenai/pipeline';
import { eq } from 'drizzle-orm';
import { scriptSchema, storyboardSchema } from '@videogenai/types';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const injectBodySchema = z.object({
  channelId: z.string().regex(/^[a-z0-9-]+$/),
  script: scriptSchema,
  storyboard: storyboardSchema,
});

export async function POST(req: Request) {
  const body: unknown = await req.json();
  const parsed = injectBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { channelId, script, storyboard } = parsed.data;
  const inputText = `[inject] ${script.title}`;

  const [run] = await db.insert(runs).values({ channelId, inputText }).returning();
  if (!run) return NextResponse.json({ error: 'insert failed' }, { status: 500 });

  try {
    await inngest.send({
      name: 'videogenai/run.inject',
      data: { runId: run.id, channelId, script, storyboard },
    });
  } catch (err) {
    await db
      .update(runs)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(runs.id, run.id));
    return NextResponse.json({ error: 'failed to enqueue pipeline', detail: String(err) }, { status: 500 });
  }

  return NextResponse.json({ runId: run.id }, { status: 201 });
}
