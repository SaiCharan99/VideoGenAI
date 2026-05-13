import Link from 'next/link';

interface Run {
  id: string;
  channelId: string;
  inputText: string;
  status: string;
  createdAt: string;
}

async function getRuns(): Promise<Run[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'}/api/runs`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return (await res.json()) as Run[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-[var(--muted)]',
  running: 'text-[var(--accent)]',
  complete: 'text-[var(--green)]',
  failed: 'text-[var(--red)]',
};

export default async function RunsPage() {
  const runs = await getRuns();

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

      {runs.length === 0 ? (
        <p className="text-[var(--muted)] text-sm">No runs yet. Create one to get started.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {runs.map((run) => (
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
