'use client';

import { StageCard } from '@/components/StageCard';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Stage {
  id: string;
  stageId: string;
  status: string;
  input: unknown;
  output: unknown;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
}

interface Run {
  id: string;
  channelId: string;
  inputText: string;
  status: string;
  createdAt: string;
}

interface RunDetail {
  run: Run;
  stages: Stage[];
}

const RUN_STATUS_COLORS: Record<string, string> = {
  pending: 'text-[var(--muted)]',
  running: 'text-[var(--accent)]',
  complete: 'text-[var(--green)]',
  failed: 'text-[var(--red)]',
};

const POLL_INTERVAL_MS = 4000;

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RunDetail | null>(null);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${id}`);
      if (!res.ok) {
        setError('Run not found');
        return;
      }
      setData((await res.json()) as RunDetail);
    } catch {
      setError('Failed to load run');
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
    const timer = setInterval(() => void fetchData(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  if (error) {
    return <p className="text-[var(--red)] text-sm">{error}</p>;
  }

  if (!data) {
    return <p className="text-[var(--muted)] text-sm">Loading…</p>;
  }

  const { run, stages } = data;
  const statusColor = RUN_STATUS_COLORS[run.status] ?? 'text-[var(--muted)]';
  const isActive = run.status === 'running' || run.status === 'pending';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold truncate">{run.inputText}</h1>
          {isActive && (
            <span className="text-xs text-[var(--muted)] animate-pulse shrink-0">auto-refresh</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className="font-mono">{run.channelId}</span>
          <span>·</span>
          <span className={`font-mono uppercase ${statusColor}`}>{run.status}</span>
          <span>·</span>
          <span>{new Date(run.createdAt).toLocaleString()}</span>
        </div>
      </div>

      {stages.length === 0 ? (
        <p className="text-[var(--muted)] text-sm">Pipeline initialising…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {stages.map((stage) => (
            <StageCard
              key={stage.id}
              runId={run.id}
              stage={stage}
              onApproved={() => void fetchData()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
