'use client';

import { useEffect, useState } from 'react';
import { OutputViewer } from './OutputViewer';
import { relTime, STAGE_META } from '@/lib/stages';
import { IcAlert, IcCheck, IcBrackets, IcCopy, IcExt, IcChev } from '@/components/ui/Icons';

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
  index: number;
  defaultOpen?: boolean;
  onApproved: () => void;
}

function cls(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

function pillClass(status: string): string {
  if (status === 'running') return 'pill pill--running';
  if (status === 'awaiting_approval') return 'pill pill--approval';
  if (status === 'approved' || status === 'complete') return 'pill pill--ok';
  if (status === 'failed') return 'pill pill--bad';
  if (status === 'skipped') return 'pill pill--skipped';
  return 'pill pill--pending';
}

function pillLabel(status: string): string {
  if (status === 'awaiting_approval') return 'approval';
  if (status === 'approved') return 'approved';
  return status;
}

function computeMetrics(stageId: string, output: unknown): [string, string | number][] | null {
  if (!output || typeof output !== 'object') return null;
  const o = output as Record<string, unknown>;
  if (stageId === 'brief') {
    const coverArr = o.must_cover ?? o.key_points;
    const cover = Array.isArray(coverArr) ? (coverArr as unknown[]).length : 0;
    const avoid = Array.isArray(o.must_avoid) ? (o.must_avoid as unknown[]).length : 0;
    if (cover === 0 && avoid === 0) return null;
    return [
      ['covers', cover],
      ['avoids', avoid],
    ];
  }
  if (stageId === 'research') {
    const sources = Array.isArray(o.sources) ? (o.sources as unknown[]).length : 0;
    const facts = Array.isArray(o.facts) ? (o.facts as unknown[]).length : 0;
    const bal = o.balance_check as { passed?: boolean } | undefined;
    return [
      ['sources', sources],
      ['facts', facts],
      ['balance', bal?.passed ? 'ok' : bal ? 'fail' : '—'],
    ];
  }
  if (stageId === 'script') {
    const lines = Array.isArray(o.lines) ? (o.lines as { scene?: unknown }[]) : [];
    const scenes = new Set(lines.map((l) => l.scene)).size;
    const dur =
      typeof o.estimated_duration_seconds === 'number' ? o.estimated_duration_seconds : null;
    const durLabel =
      dur !== null ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : null;
    return [
      ['scenes', scenes],
      ['lines', lines.length],
      ...(durLabel ? [['≈', durLabel] as [string, string]] : []),
    ];
  }
  return null;
}

export function StageCard({ runId, stage, index, defaultOpen, onApproved }: Props) {
  const [open, setOpen] = useState(defaultOpen ?? stage.status === 'awaiting_approval');
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  const isAwaiting = stage.status === 'awaiting_approval';
  const metrics = computeMetrics(stage.stageId, stage.output);
  const meta = STAGE_META[stage.stageId];
  const label = meta?.label ?? stage.stageId;
  const finishedAt =
    stage.approvedAt ??
    (['approved', 'complete', 'skipped', 'failed'].includes(stage.status) ? stage.updatedAt : null);

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
    <div className={cls('scard', isAwaiting && 'approval', open && 'open')}>
      <div
        className="scard__head"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v);
        }}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        <span className="scard__idx">{String(index + 1).padStart(2, '0')}</span>
        <span className="scard__name">{label}</span>
        <span className={pillClass(stage.status)}>
          <span className="dot" />
          {pillLabel(stage.status)}
        </span>
        {metrics && (
          <div className="scard__metrics">
            {metrics.map(([k, v], i) => (
              <span key={i}>
                {k} <b>{v}</b>
              </span>
            ))}
          </div>
        )}
        <div className="scard__right">
          {finishedAt && <span className="scard__ts">{relTime(finishedAt)}</span>}
          <span className="scard__chev">
            <IcChev size={14} />
          </span>
        </div>
      </div>

      {isAwaiting && open && (
        <div className="approval-banner">
          <div className="ic">
            <IcAlert size={14} />
          </div>
          <div className="grow">
            <b>This stage is awaiting your approval.</b>
            <small>
              Approving emits{' '}
              <code style={{ fontFamily: 'var(--f-mono)', color: 'var(--tx-2)' }}>
                stage.approved
              </code>{' '}
              → the next stage starts automatically.
            </small>
          </div>
          <button className="btn btn--sm btn--ghost">Request revision</button>
          <button
            className="btn btn--approve btn--sm"
            disabled={approving}
            onClick={() => void handleApprove()}
          >
            <IcCheck size={12} /> {approving ? 'Approving…' : 'Approve stage'}
          </button>
        </div>
      )}

      {approveError && open && (
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--ac-bad-bg)',
            borderBottom: '1px solid var(--ac-bad-br)',
            color: 'var(--ac-bad)',
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
          }}
        >
          {approveError}
        </div>
      )}

      {stage.status === 'failed' && stage.error && open && (
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--ac-bad-bg)',
            borderBottom: '1px solid var(--ac-bad-br)',
            color: 'var(--ac-bad)',
            fontFamily: 'var(--f-mono)',
            fontSize: 12,
          }}
        >
          {stage.error}
        </div>
      )}

      {open && (
        <div className="scard__body">
          <OutputViewer output={stage.output} stageId={stage.stageId} />
        </div>
      )}

      {open && (
        <div className="scard__foot">
          <button className="btn btn--ghost btn--sm">
            <IcBrackets size={12} /> View raw JSON
          </button>
          <button className="btn btn--ghost btn--sm">
            <IcCopy size={12} /> Copy output
          </button>
          {stage.stageId === 'research' && (
            <button className="btn btn--ghost btn--sm">
              <IcExt size={12} /> Open all sources
            </button>
          )}
          <div className="scard__foot-spacer" />
          {stage.approvedAt && (
            <span className="scard__ts">
              Approved by {stage.approvedBy ?? 'you'} · {relTime(stage.approvedAt)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
