import { db, runs } from '@videogenai/db';
import { desc } from 'drizzle-orm';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-[var(--muted)]',
  running: 'text-[var(--accent)]',
  complete: 'text-[var(--green)]',
  failed: 'text-[var(--red)]',
};

export const dynamic = 'force-dynamic';

export default async function RunsPage() {
  const allRuns = await db.query.runs.findMany({
    orderBy: [desc(runs.createdAt)],
    limit: 50,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold">Runs</h1>
        <Link
          href="/runs/new"
          className="bg-[var(--accent)] text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 transition-opacity"
        >
          + New run
        </Link>
      </div>

      {allRuns.length === 0 ? (
        <p className="text-[var(--muted)] text-sm">No runs yet. Create one to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {allRuns.map((run) => (
            <Link
              key={run.id}
              href={`/runs/${run.id}`}
              className="block border border-[var(--border)] rounded p-4 bg-[var(--surface)] hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs font-mono text-[var(--muted)]">{run.channelId}</span>
                  <span className="text-sm truncate">{run.inputText}</span>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`text-xs font-mono uppercase ${STATUS_COLORS[run.status] ?? 'text-[var(--muted)]'}`}
                  >
                    {run.status}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
