'use client';

import Link from 'next/link';
import { StageCard } from '@/components/StageCard';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CHANNEL_MAP, fmtRange } from '@/lib/channels';
import { ALL_STAGES, LIVE_STAGES, fmtDuration, relTime } from '@/lib/stages';
import {
  IcTerminal, IcBrackets, IcCopy, IcAlert, IcArrowR, IcClock, IcExt, IcCheck, IcX,
} from '@/components/ui/Icons';

function cls(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

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
  paused: boolean;
  autoApprove: boolean;
  createdAt: string;
}

interface RunDetail {
  run: Run;
  stages: Stage[];
}

function stageNodeCls(status: string): string {
  if (status === 'approved' || status === 'complete') return 'done';
  if (status === 'running') return 'running';
  if (status === 'awaiting_approval') return 'approval';
  if (status === 'failed') return 'failed';
  if (status === 'skipped') return 'skipped';
  return 'pending';
}

function stageNodeStatusLabel(status: string): string {
  if (status === 'awaiting_approval') return 'approval';
  if (status === 'approved') return 'approved';
  return status;
}

function pillClass(status: string): string {
  if (status === 'paused') return 'pill pill--pending';
  if (status === 'running') return 'pill pill--running';
  if (status === 'awaiting_approval') return 'pill pill--approval';
  if (status === 'approved' || status === 'complete') return 'pill pill--ok';
  if (status === 'failed') return 'pill pill--bad';
  return 'pill pill--pending';
}

function pillLabel(status: string): string {
  if (status === 'awaiting_approval') return 'approval';
  return status;
}

function ChDot({ channelId }: { channelId: string }) {
  const ch = CHANNEL_MAP[channelId];
  if (!ch) return null;
  return (
    <div
      style={{
        display: 'inline-block', width: 12, height: 12, borderRadius: 3, flexShrink: 0,
        background: `linear-gradient(135deg, ${ch.palette[0]} 0% 50%, ${ch.palette[1]} 50% 100%)`,
        boxShadow: '0 0 0 1px var(--br-2) inset',
      }}
    />
  );
}

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RunDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [autoApproveLoading, setAutoApproveLoading] = useState(false);
  const [ytStatus, setYtStatus] = useState<{ connected: boolean; expired?: boolean } | null>(null);
  const hasAutoSelected = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${id}`);
      if (!res.ok) {
        setLoadError('Run not found');
        return;
      }
      const next = (await res.json()) as RunDetail;
      setLoadError('');
      setData(next);
      if (!hasAutoSelected.current) {
        const failed = next.stages.find((s) => s.status === 'failed');
        const awaiting = next.stages.find((s) => s.status === 'awaiting_approval');
        const running = next.stages.find((s) => s.status === 'running');
        const lastApproved = [...next.stages].reverse().find((s) => s.status === 'approved');
        const auto = failed ?? awaiting ?? running ?? lastApproved ?? next.stages[0];
        if (auto) {
          setSelectedStageId(auto.stageId);
          hasAutoSelected.current = true;
        }
      }
    } catch {
      setLoadError('Failed to load run');
    }
  }, [id]);

  const handlePauseResume = useCallback(async (currentlyPaused: boolean) => {
    setPauseLoading(true);
    try {
      const action = currentlyPaused ? 'resume' : 'pause';
      await fetch(`/api/runs/${id}/${action}`, { method: 'POST' });
      await fetchData();
    } finally {
      setPauseLoading(false);
    }
  }, [id, fetchData]);

  const handleAutoApproveToggle = useCallback(async (current: boolean) => {
    setAutoApproveLoading(true);
    try {
      await fetch(`/api/runs/${id}/auto-approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !current }),
      });
      await fetchData();
    } finally {
      setAutoApproveLoading(false);
    }
  }, [id, fetchData]);

  useEffect(() => {
    hasAutoSelected.current = false;
  }, [id]);

  useEffect(() => {
    void fetchData();
    const t = setInterval(() => void fetchData(), 4000);
    return () => clearInterval(t);
  }, [fetchData]);

  useEffect(() => {
    void fetch('/api/auth/youtube/status')
      .then((r) => r.json())
      .then((d) => setYtStatus(d as { connected: boolean; expired?: boolean }))
      .catch(() => null);
  }, []);

  useEffect(() => {
    if (!selectedStageId) return;
    const el = document.getElementById(`scard-${selectedStageId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedStageId]);

  if (loadError) {
    return <p style={{ color: 'var(--ac-bad)', padding: 24, fontFamily: 'var(--f-mono)', fontSize: 12 }}>{loadError}</p>;
  }

  if (!data) {
    return (
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skel" style={{ height: 56, borderRadius: 6 }} />
          ))}
        </div>
      </div>
    );
  }

  const { run, stages } = data;
  const ch = CHANNEL_MAP[run.channelId];

  const dbByStageId = Object.fromEntries(stages.map((s) => [s.stageId, s]));

  const isAwaiting = stages.some((s) => s.status === 'awaiting_approval');
  const awaitingStage = stages.find((s) => s.status === 'awaiting_approval');
  const approvedCount = stages.filter((s) => s.status === 'approved' || s.status === 'complete').length;

  const runDisplayStatus = run.paused ? 'paused' : isAwaiting ? 'awaiting_approval' : run.status;
  const canPauseResume = run.status === 'running';

  const sourcesCount = (() => {
    const r = stages.find((s) => s.stageId === 'research');
    if (!r?.output || typeof r.output !== 'object') return 0;
    const o = r.output as Record<string, unknown>;
    return Array.isArray(o.sources) ? (o.sources as unknown[]).length : 0;
  })();

  const factsCount = (() => {
    const r = stages.find((s) => s.stageId === 'research');
    if (!r?.output || typeof r.output !== 'object') return 0;
    const o = r.output as Record<string, unknown>;
    return Array.isArray(o.facts) ? (o.facts as unknown[]).length : 0;
  })();

  const scriptDur = (() => {
    const s = stages.find((st) => st.stageId === 'script');
    if (!s?.output || typeof s.output !== 'object') return null;
    const o = s.output as Record<string, unknown>;
    return typeof o.estimated_duration_seconds === 'number' ? o.estimated_duration_seconds : null;
  })();

  const pendingCount = LIVE_STAGES.filter((m) => !dbByStageId[m.id]).length;

  return (
    <div className="page page--wide detail">
      {/* Head */}
      <div className="detail__head">
        <div className="detail__topbar">
          <Link href="/runs">← Runs</Link>
          <span style={{ color: 'var(--tx-4)' }}>/</span>
          <span style={{ fontFamily: 'var(--f-mono)' }}>{run.id}</span>
          <span className="refresh" style={{ marginLeft: 'auto' }}>
            <span className="dot" /> auto-refresh · 4s
          </span>
        </div>
        <div className="detail__title-row">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="detail__title">{run.inputText}</div>
            <div className="detail__meta" style={{ marginTop: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ChDot channelId={run.channelId} />
                <b>{ch?.name ?? run.channelId}</b>
              </span>
              <span className="sep">·</span>
              <span className={pillClass(runDisplayStatus)}>
                <span className="dot" />
                {pillLabel(runDisplayStatus)}
              </span>
              <span className="sep">·</span>
              <span>Created <b>{relTime(run.createdAt)}</b></span>
              <span className="sep">·</span>
              <span><b>{approvedCount}</b> of <b>{LIVE_STAGES.length}</b> stages approved</span>
            </div>
          </div>
          <div className="detail__actions">
            {canPauseResume && (
              <button
                className={run.paused ? 'btn btn--approve btn--sm' : 'btn btn--bad btn--sm'}
                disabled={pauseLoading}
                onClick={() => void handlePauseResume(run.paused)}
              >
                {run.paused ? '▶ Resume' : '⏸ Pause'}
              </button>
            )}
            <button className="btn btn--ghost btn--sm"><IcTerminal size={12} /> Open logs</button>
            <button className="btn btn--ghost btn--sm"><IcBrackets size={12} /> View JSON</button>
            <button className="btn btn--ghost btn--sm"><IcCopy size={12} /> Share</button>
          </div>
        </div>
      </div>

      {/* Pipeline timeline */}
      <div className="pipeline">
        {ALL_STAGES.map((meta, i) => {
          const db = dbByStageId[meta.id];
          const status = db?.status ?? 'pending';
          const nodeCls = meta.comingSoon ? 'pending' : stageNodeCls(status);
          const isClickable = !meta.comingSoon;
          return (
            <div
              key={meta.id}
              className={cls('stage-node', nodeCls, !meta.comingSoon && selectedStageId === meta.id && 'selected')}
              style={meta.comingSoon ? { opacity: 0.35, cursor: 'default' } : undefined}
              onClick={isClickable ? () => setSelectedStageId(meta.id) : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              title={meta.comingSoon ? 'Coming soon' : undefined}
              onKeyDown={isClickable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelectedStageId(meta.id);
              } : undefined}
            >
              <div className="stage-node__top">
                <span className="stage-node__idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="stage-node__name">{meta.label}</span>
              </div>
              <span className="stage-node__status">
                {meta.comingSoon ? 'phase 5' : stageNodeStatusLabel(status)}
              </span>
              <div className="stage-node__bar" />
            </div>
          );
        })}
      </div>

      {/* Detail grid */}
      <div className="detail__grid">
        {/* Main column */}
        <div className="detail__main">
          {stages.length === 0 && run.status === 'failed' && (
            <div
              style={{
                padding: '20px 24px',
                background: 'var(--ac-bad-bg)',
                border: '1px solid var(--ac-bad-br)',
                borderRadius: 'var(--r-3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ color: 'var(--ac-bad)', fontWeight: 600, fontSize: 13 }}>
                Pipeline failed before any stage started
              </div>
              <div style={{ color: 'var(--tx-2)', fontSize: 12, fontFamily: 'var(--f-mono)' }}>
                The function threw before recording a stage. Check the Inngest dashboard for the
                full error trace:{' '}
                <a
                  href="http://localhost:8288"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--ac-bad)', textDecoration: 'underline' }}
                >
                  localhost:8288
                </a>
              </div>
            </div>
          )}

          {stages.length === 0 && run.status !== 'failed' && (
            <div className="empty">
              <h3>Run is queued.</h3>
              <p>The brief stage will start in a moment.</p>
            </div>
          )}

          {stages.map((stage, i) => {
            const metaIdx = ALL_STAGES.findIndex((m) => m.id === stage.stageId);
            return (
              <div key={stage.id} id={`scard-${stage.stageId}`}>
                <StageCard
                  runId={run.id}
                  stage={stage}
                  index={metaIdx === -1 ? i : metaIdx}
                  defaultOpen={stage.stageId === selectedStageId}
                  onApproved={() => void fetchData()}
                />
              </div>
            );
          })}

          {pendingCount > 0 && (
            <div style={{
              padding: '14px 16px',
              border: '1px dashed var(--br-2)',
              borderRadius: 'var(--r-3)',
              color: 'var(--tx-3)',
              fontFamily: 'var(--f-mono)',
              fontSize: 11,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <IcClock size={12} />
              <span>{pendingCount} stage{pendingCount !== 1 ? 's' : ''} pending — will start automatically after each approval.</span>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="detail__side">
          <div className="swid">
            <div className="swid__head">Run metadata</div>
            <div className="swid__body">
              <div className="swid__row">
                <span className="k">Run ID</span>
                <span className="v" style={{ fontSize: 10 }}>{run.id}</span>
              </div>
              <div className="swid__row">
                <span className="k">Channel</span>
                <span className="v">{run.channelId}</span>
              </div>
              <div className="swid__row">
                <span className="k">Created</span>
                <span className="v">{relTime(run.createdAt)}</span>
              </div>
              <div className="swid__row">
                <span className="k">Approved</span>
                <span className="v">{approvedCount} / {LIVE_STAGES.length}</span>
              </div>
              {sourcesCount > 0 && (
                <div className="swid__row">
                  <span className="k">Sources</span>
                  <span className="v">{sourcesCount}</span>
                </div>
              )}
              {factsCount > 0 && (
                <div className="swid__row">
                  <span className="k">Facts</span>
                  <span className="v">{factsCount}</span>
                </div>
              )}
              {scriptDur !== null && (
                <div className="swid__row">
                  <span className="k">Script ≈</span>
                  <span className="v">{fmtDuration(scriptDur)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Auto-approve toggle */}
          <div className="swid" style={run.autoApprove ? { borderColor: 'var(--ac-ok-br)' } : undefined}>
            <div className="swid__head" style={run.autoApprove ? { color: 'var(--ac-ok)' } : undefined}>
              Auto-approve
            </div>
            <div className="swid__body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--tx-2)', lineHeight: 1.45 }}>
                  {run.autoApprove
                    ? 'Pipeline runs end-to-end without stopping for approvals.'
                    : 'Pipeline pauses at each stage for human review.'}
                </span>
                <button
                  onClick={() => void handleAutoApproveToggle(run.autoApprove)}
                  disabled={autoApproveLoading}
                  style={{
                    flexShrink: 0,
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    border: 'none',
                    cursor: autoApproveLoading ? 'wait' : 'pointer',
                    background: run.autoApprove ? 'var(--ac-ok)' : 'var(--bg-3)',
                    position: 'relative',
                    transition: 'background 0.18s',
                    outline: 'none',
                  }}
                  aria-label={run.autoApprove ? 'Disable auto-approve' : 'Enable auto-approve'}
                >
                  <span style={{
                    position: 'absolute',
                    top: 3,
                    left: run.autoApprove ? 21 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.18s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                  }} />
                </button>
              </div>
            </div>
          </div>

          {isAwaiting && awaitingStage && (
            <div className="swid" style={{ borderColor: 'var(--ac-approve)' }}>
              <div className="swid__head" style={{ color: 'var(--ac-approve)' }}>
                <IcAlert size={11} /> Approval queue
                <span className="num" style={{ color: 'var(--ac-approve)', borderColor: 'var(--ac-approve-br)', background: 'var(--ac-approve-bg)' }}>1</span>
              </div>
              <div className="swid__body">
                <div style={{ fontSize: 12.5, color: 'var(--tx-1)' }}>
                  <b style={{ textTransform: 'capitalize' }}>{awaitingStage.stageId}</b> stage is ready for review.
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--tx-3)', lineHeight: 1.5 }}>
                  Reviewing this stage unblocks downstream stages.
                </div>
                <button
                  className="btn btn--approve btn--sm"
                  style={{ marginTop: 4 }}
                  onClick={() => setSelectedStageId(awaitingStage.stageId)}
                >
                  <IcArrowR size={11} /> Jump to stage
                </button>
              </div>
            </div>
          )}

          {ytStatus !== null && (
            <div
              className="swid"
              style={
                ytStatus.connected && !ytStatus.expired
                  ? { borderColor: 'var(--ac-ok-br)' }
                  : undefined
              }
            >
              <div
                className="swid__head"
                style={
                  ytStatus.connected && !ytStatus.expired
                    ? { color: 'var(--ac-ok)' }
                    : undefined
                }
              >
                YouTube
              </div>
              <div className="swid__body">
                {ytStatus.connected && !ytStatus.expired ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      color: 'var(--ac-ok)',
                    }}
                  >
                    <IcCheck size={12} /> Connected
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: 'var(--ac-bad)',
                        marginBottom: 8,
                      }}
                    >
                      <IcX size={12} />{' '}
                      {ytStatus.expired ? 'Token expired' : 'Not connected'}
                    </div>
                    <a
                      href="/api/auth/youtube"
                      className="btn btn--ghost btn--sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <IcExt size={11} /> Connect YouTube
                    </a>
                  </>
                )}
              </div>
            </div>
          )}

          {ch && (
            <div className="swid">
              <div className="swid__head">Channel rules</div>
              <div className="swid__body">
                <dl className="rules" style={{ margin: 0 }}>
                  <dt>Tone</dt><dd>{ch.tone}</dd>
                  <dt>Duration</dt><dd>{fmtRange(ch.duration)}</dd>
                  <dt>Source balance</dt>
                  <dd>
                    <div className="chips" style={{ marginTop: 4 }}>
                      {ch.sources.map((s) => (
                        <span key={s} className="tag">{s}</span>
                      ))}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
