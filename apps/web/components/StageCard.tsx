'use client';

import { useState } from 'react';
import { OutputViewer } from './OutputViewer';

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

interface Props {
  runId: string;
  stage: Stage;
  onApproved: () => void;
}

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  pending: { dot: 'bg-[var(--muted)]', label: 'text-[var(--muted)]' },
  running: { dot: 'bg-[var(--accent)] animate-pulse', label: 'text-[var(--accent)]' },
  awaiting_approval: { dot: 'bg-[var(--yellow)]', label: 'text-[var(--yellow)]' },
  approved: { dot: 'bg-[var(--green)]', label: 'text-[var(--green)]' },
  failed: { dot: 'bg-[var(--red)]', label: 'text-[var(--red)]' },
  skipped: { dot: 'bg-[var(--muted)]', label: 'text-[var(--muted)]' },
};

export function StageCard({ runId, stage, onApproved }: Props) {
  const [expanded, setExpanded] = useState(stage.status === 'awaiting_approval');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');

  const FALLBACK_STYLE = { dot: 'bg-[var(--muted)]', label: 'text-[var(--muted)]' };
  const style = STATUS_STYLES[stage.status] ?? FALLBACK_STYLE;
  const canApprove = stage.status === 'awaiting_approval';

  async function handleApprove() {
    setApproveError('');
    setApproving(true);
    try {
      const res = await fetch(`/api/runs/${runId}/stages/${stage.stageId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: unknown };
        setApproveError(typeof body.error === 'string' ? body.error : 'Approval failed');
        return;
      }
      onApproved();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="border border-[var(--border)] rounded bg-[var(--surface)]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors rounded"
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
          <span className="font-mono text-sm font-medium">{stage.stageId}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs uppercase font-mono ${style.label}`}>{stage.status}</span>
          {canApprove && (
            <span className="text-xs text-[var(--yellow)] border border-[var(--yellow)] rounded px-2 py-0.5">
              needs approval
            </span>
          )}
          <span className="text-[var(--muted)] text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-[var(--border)] pt-3">
          {stage.status === 'failed' && stage.error && (
            <div className="text-sm text-[var(--red)] bg-[var(--red)]/10 border border-[var(--red)]/30 rounded px-3 py-2 font-mono">
              {stage.error}
            </div>
          )}

          {stage.output !== null && stage.output !== undefined && (
            <div>
              <span className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2 block">
                Output
              </span>
              <OutputViewer output={stage.output} stageId={stage.stageId} />
            </div>
          )}

          {canApprove && (
            <div className="flex flex-col gap-2">
              {approveError && <p className="text-xs text-[var(--red)]">{approveError}</p>}
              <button
                onClick={() => void handleApprove()}
                disabled={approving}
                className="self-start bg-[var(--green)] text-black text-sm font-semibold px-5 py-2 rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {approving ? 'Approving…' : 'Approve & continue'}
              </button>
            </div>
          )}

          {stage.approvedAt && (
            <p className="text-xs text-[var(--muted)]">
              Approved by {stage.approvedBy ?? 'unknown'} at{' '}
              {new Date(stage.approvedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
