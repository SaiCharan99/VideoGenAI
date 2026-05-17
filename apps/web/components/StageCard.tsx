'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { OutputViewer } from './OutputViewer';
import { relTime, STAGE_META } from '@/lib/stages';
import { IcAlert, IcCheck, IcBrackets, IcCopy, IcExt, IcChev, IcX } from '@/components/ui/Icons';

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
  const [open, setOpen] = useState(
    defaultOpen ?? (stage.status === 'awaiting_approval' || stage.status === 'failed'),
  );
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [editJson, setEditJson] = useState('');
  const [editError, setEditError] = useState('');
  const [copied, setCopied] = useState(false);
  const [jsonModal, setJsonModal] = useState(false);

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

  async function handleApprove(editedOutput?: unknown) {
    setApproveError('');
    setApproving(true);
    try {
      const res = await fetch(`/api/runs/${runId}/stages/${stage.stageId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedOutput !== undefined ? { editedOutput } : {}),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: unknown };
        setApproveError(typeof body.error === 'string' ? body.error : 'Approval failed');
        return;
      }
      setMode('view');
      onApproved();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setApproving(false);
    }
  }

  function handleStartRevision() {
    setEditJson(JSON.stringify(stage.output, null, 2));
    setEditError('');
    setMode('edit');
    setOpen(true);
  }

  function handleCancelRevision() {
    setMode('view');
    setEditError('');
  }

  async function handleApproveWithEdits() {
    setEditError('');
    let parsed: unknown;
    try {
      parsed = JSON.parse(editJson);
    } catch {
      setEditError('Invalid JSON — fix the syntax before approving.');
      return;
    }
    await handleApprove(parsed);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(stage.output, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard not available
    }
  }

  function handleOpenSources() {
    const out = stage.output as { sources?: { url?: string }[] } | null;
    const sources = out?.sources ?? [];
    for (const s of sources) {
      if (s.url) window.open(s.url, '_blank', 'noopener,noreferrer');
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

      {/* Approval banner — hidden while in edit mode */}
      {isAwaiting && open && mode === 'view' && (
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
          <button className="btn btn--sm btn--ghost" onClick={handleStartRevision}>
            Edit output
          </button>
          <button
            className="btn btn--approve btn--sm"
            disabled={approving}
            onClick={() => void handleApprove()}
          >
            <IcCheck size={12} /> {approving ? 'Approving…' : 'Approve stage'}
          </button>
        </div>
      )}

      {/* Inline revision editor */}
      {isAwaiting && open && mode === 'edit' && (
        <div className="rev-editor">
          <div className="rev-editor__head">
            <span>Editing output JSON — approve when done</span>
            <button className="btn btn--ghost btn--sm" onClick={handleCancelRevision}>
              <IcX size={12} /> Cancel
            </button>
          </div>
          <textarea
            className="rev-textarea"
            value={editJson}
            onChange={(e) => setEditJson(e.target.value)}
            spellCheck={false}
          />
          {editError && <div className="rev-error">{editError}</div>}
          <div className="rev-editor__foot">
            <button
              className="btn btn--approve btn--sm"
              disabled={approving}
              onClick={() => void handleApproveWithEdits()}
            >
              <IcCheck size={12} /> {approving ? 'Saving…' : 'Approve with edits'}
            </button>
          </div>
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

      {/* Output viewer — hidden while editing so user focuses on the JSON */}
      {open && mode === 'view' && (
        <div className="scard__body">
          <OutputViewer output={stage.output} stageId={stage.stageId} />
        </div>
      )}

      {open && (
        <div className="scard__foot">
          <button className="btn btn--ghost btn--sm" onClick={() => setJsonModal(true)}>
            <IcBrackets size={12} /> View raw JSON
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => void handleCopy()}>
            <IcCopy size={12} /> {copied ? 'Copied!' : 'Copy output'}
          </button>
          {stage.stageId === 'research' && (
            <button className="btn btn--ghost btn--sm" onClick={handleOpenSources}>
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

      {/* Full-screen JSON modal */}
      {jsonModal &&
        createPortal(
          <div className="json-modal-overlay" onClick={() => setJsonModal(false)}>
            <div className="json-modal" onClick={(e) => e.stopPropagation()}>
              <div className="json-modal__head">
                <span>{label} · raw output</span>
                <button className="btn btn--ghost btn--sm" onClick={() => setJsonModal(false)}>
                  <IcX size={14} />
                </button>
              </div>
              <div className="json-modal__body">
                <pre>{JSON.stringify(stage.output, null, 2)}</pre>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
