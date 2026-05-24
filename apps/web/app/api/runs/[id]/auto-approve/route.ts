import { db, runs } from '@videogenai/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({ enabled: z.boolean() });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  await db
    .update(runs)
    .set({ autoApprove: parsed.data.enabled, updatedAt: new Date() })
    .where(eq(runs.id, runId));

  return NextResponse.json({ ok: true, autoApprove: parsed.data.enabled });
}
