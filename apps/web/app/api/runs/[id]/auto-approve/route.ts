import { db, runs } from '@videogenai/db';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await params;
  const { enabled } = (await req.json()) as { enabled: boolean };

  await db
    .update(runs)
    .set({ autoApprove: !!enabled, updatedAt: new Date() })
    .where(eq(runs.id, runId));

  return NextResponse.json({ ok: true, autoApprove: !!enabled });
}
