'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CHANNEL_MAP } from '@/lib/channels';
import { ALL_STAGES, relTime } from '@/lib/stages';
import { IcPlus, IcRefresh, IcSearch, IcFilter, IcChev } from '@/components/ui/Icons';

interface StageSummary {
  stageId: string;
  status: string;
}

interface Run {
  id: string;
  channelId: string;
  inputText: string;
  status: string;
  createdAt: string;
  stages: StageSummary[];
}

interface RunsResponse {
  runs: Run[];
  awaitingApproval: number;
}

type StatusFilter = 'all' | 'running' | 'awaiting' | 'complete' | 'failed' | 'pending';

function cls(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

function segCls(stageId: string, byId: Record<string, string>): string {
  const s = byId[stageId];
  if (!s) return 'pipe-seg pipe-seg--dim';
  if (s === 'approved' || s === 'complete') return 'pipe-seg pipe-seg--done';
  if (s === 'awaiting_approval') return 'pipe-seg pipe-seg--await';
  if (s === 'running') return 'pipe-seg pipe-seg--run';
  if (s === 'failed') return 'pipe-seg pipe-seg--failed';
  return 'pipe-seg pipe-seg--dim';
}

function PipelineBar({ stages }: { stages: StageSummary[] }) {
  const byId = Object.fromEntries(stages.map((s) => [s.stageId, s.status]));
  return (
    <div className="pipe-bar">
      {ALL_STAGES.map((meta) => (
        <div
          key={meta.id}
          className={segCls(meta.id, byId)}
          title={`${meta.label}: ${byId[meta.id] ?? 'pending'}`}
          style={meta.comingSoon ? { opacity: 0.3 } : undefined}
        />
      ))}
    </div>
  );
}

function currentStage(stages: StageSummary[]): { idx: number; name: string } | null {
  const active = stages.find(
    (s) => s.status === 'running' || s.status === 'awaiting_approval' || s.status === 'failed',
  );
  const ref = active ?? [...stages].reverse().find((s) => s.status === 'approved' || s.status === 'complete');
  if (!ref) return null;
  const idx = ALL_STAGES.findIndex((m) => m.id === ref.stageId);
  return { idx: idx + 1, name: ref.stageId };
}

function displayStatus(run: Run): string {
  if (run.stages.some((s) => s.status === 'awaiting_approval')) return 'awaiting_approval';
  return run.status;
}

function pillClass(status: string): string {
  if (status === 'running') return 'pill pill--running';
  if (status === 'awaiting_approval') return 'pill pill--approval';
  if (status === 'complete') return 'pill pill--ok';
  if (status === 'failed') return 'pill pill--bad';
  return 'pill pill--pending';
}

function pillLabel(status: string): string {
  if (status === 'awaiting_approval') return 'awaiting';
  return status;
}

function oldestAwaitingAge(runs: Run[]): string | null {
  const awaitingRuns = runs.filter((r) => r.stages.some((s) => s.status === 'awaiting_approval'));
  if (awaitingRuns.length === 0) return null;
  const oldest = awaitingRuns.reduce((min, r) => (r.createdAt < min.createdAt ? r : min));
  return oldest.createdAt ? relTime(oldest.createdAt) : null;
}

const CHANNELS_LIST = ['all', 'aussie-politics-explained', 'latest-tech-explained'] as const;
const STATUS_FILTERS: [StatusFilter, string][] = [
  ['all', 'All'],
  ['running', 'Running'],
  ['awaiting', 'Approval'],
  ['complete', 'Complete'],
  ['failed', 'Failed'],
];

export default function RunsPage() {
  const [data, setData] = useState<RunsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [q, setQ] = useState('');
  const [fetchError, setFetchError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/runs');
      if (!res.ok) { setFetchError('Failed to load runs'); return; }
      setFetchError('');
      setData((await res.json()) as RunsResponse);
    } catch {
      setFetchError('Failed to load runs');
    }
  }, []);

  useEffect(() => {
    void fetchData();
    const t = setInterval(() => void fetchData(), 4000);
    return () => clearInterval(t);
  }, [fetchData]);

  const runs = data?.runs ?? [];

  const counts = {
    all: runs.length,
    running: runs.filter((r) => r.status === 'running' && !r.stages.some(s => s.status === 'awaiting_approval')).length,
    awaiting: runs.filter((r) => r.stages.some((s) => s.status === 'awaiting_approval')).length,
    complete: runs.filter((r) => r.status === 'complete').length,
    failed: runs.filter((r) => r.status === 'failed').length,
    pending: runs.filter((r) => r.status === 'pending').length,
  };

  const activeChannels = new Set(runs.filter((r) => r.status === 'running').map((r) => r.channelId)).size;
  const oldestAwaiting = oldestAwaitingAge(runs);

  const filtered = runs.filter((r) => {
    if (channelFilter !== 'all' && r.channelId !== channelFilter) return false;
    if (statusFilter === 'running' && (r.status !== 'running' || r.stages.some(s => s.status === 'awaiting_approval'))) return false;
    if (statusFilter === 'awaiting' && !r.stages.some(s => s.status === 'awaiting_approval')) return false;
    if (statusFilter === 'complete' && r.status !== 'complete') return false;
    if (statusFilter === 'failed' && r.status !== 'failed') return false;
    if (statusFilter === 'pending' && r.status !== 'pending') return false;
    if (q && !r.inputText.toLowerCase().includes(q.toLowerCase()) && !r.id.includes(q)) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="ph">
        <div>
          <div className="ph__title">Runs</div>
          <div className="ph__sub">Pipeline runs across all channels · auto-refresh every 4s</div>
        </div>
        <div className="ph__actions">
          <button className="btn btn--ghost" onClick={() => void fetchData()}>
            <IcRefresh size={13} /> Refresh
          </button>
          <Link href="/runs/new" className="btn btn--primary">
            <IcPlus size={13} /> New run
          </Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat stat--total">
          <div className="stat__label"><span className="dot" />Total runs</div>
          <div className="stat__val">{counts.all}</div>
          <div className="stat__delta">across all channels</div>
        </div>
        <div className="stat stat--running">
          <div className="stat__label"><span className="dot" />Running</div>
          <div className="stat__val">{counts.running}</div>
          <div className="stat__delta">across <b>{activeChannels}</b> channel{activeChannels !== 1 ? 's' : ''}</div>
        </div>
        <div className="stat stat--approval">
          <div className="stat__label"><span className="dot" />Awaiting approval</div>
          <div className="stat__val">{counts.awaiting}</div>
          <div className="stat__delta">{oldestAwaiting ? <>oldest <b>{oldestAwaiting}</b></> : 'none pending'}</div>
        </div>
        <div className="stat stat--failed">
          <div className="stat__label"><span className="dot" />Failed</div>
          <div className="stat__val">{counts.failed}</div>
          <div className="stat__delta">{counts.failed > 0 ? <><b>{counts.failed}</b> need{counts.failed === 1 ? 's' : ''} review</> : 'all clear'}</div>
        </div>
      </div>

      <div className="tools">
        <div className="search">
          <span className="ic"><IcSearch size={13} /></span>
          <input
            placeholder="Search topic, run id, or source…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <span className="kbd-badge">/</span>
        </div>

        <div className="seg">
          {STATUS_FILTERS.map(([k, label]) => (
            <button
              key={k}
              className={cls('seg__opt', statusFilter === k && 'active')}
              onClick={() => setStatusFilter(k)}
            >
              {label}
              <span className="num">{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="select-wrap">
          <IcFilter size={11} />
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} style={{ color: 'var(--tx-1)' }}>
            {CHANNELS_LIST.map((id) => (
              <option key={id} value={id}>
                {id === 'all' ? 'All' : (CHANNEL_MAP[id]?.short ?? id)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--tx-3)' }}>
          {filtered.length}/{runs.length}
        </div>
      </div>

      {fetchError && (
        <div style={{
          padding: '10px 14px', marginBottom: 12,
          border: '1px solid var(--ac-bad-br)', borderRadius: 'var(--r-2)',
          background: 'var(--ac-bad-bg)', color: 'var(--ac-bad)',
          fontFamily: 'var(--f-mono)', fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {fetchError}
          <button className="btn btn--ghost btn--sm" onClick={() => void fetchData()}>Retry</button>
        </div>
      )}

      {!data ? (
        <div className="runs">
          {Array.from({ length: 4 }, (_, i) => (
            <div className="run__row run__row--wide" key={i} style={{ cursor: 'default' }}>
              <div><div className="skel" style={{ height: 13, width: '70%', marginBottom: 5 }} /><div className="skel" style={{ height: 10, width: '25%' }} /></div>
              <div><div className="skel" style={{ height: 10, width: 80 }} /></div>
              <div><div className="skel" style={{ height: 20, width: 76, borderRadius: 20 }} /></div>
              <div><div className="skel" style={{ height: 5, width: '100%', borderRadius: 2 }} /></div>
              <div><div className="skel" style={{ height: 10, width: 70 }} /></div>
              <div><div className="skel" style={{ height: 10, width: 44 }} /></div>
              <div />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <h3>No runs match those filters.</h3>
          <p>Try clearing the search or status filter, or start a new run.</p>
          <Link href="/runs/new" className="btn btn--primary"><IcPlus size={13} /> New run</Link>
        </div>
      ) : (
        <div className="runs">
          <div className="runs__head runs__head--wide">
            <div>Topic</div>
            <div>Channel</div>
            <div>Status</div>
            <div>Pipeline</div>
            <div>Current</div>
            <div>Created</div>
            <div />
          </div>
          {filtered.map((run) => {
            const ch = CHANNEL_MAP[run.channelId];
            const cur = currentStage(run.stages);
            const ds = displayStatus(run);
            return (
              <Link key={run.id} href={`/runs/${run.id}`} className="run__row run__row--wide" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="run__topic">
                  <b>{run.inputText}</b>
                  <small>{run.id.slice(0, 8)}</small>
                </div>
                <div className="run__channel">
                  {ch && <div className="ch-dot" style={{ background: `linear-gradient(135deg, ${ch.palette[0]} 0% 50%, ${ch.palette[1]} 50% 100%)` }} />}
                  {ch?.short ?? run.channelId}
                </div>
                <div>
                  <span className={pillClass(ds)}>
                    <span className="dot" />
                    {pillLabel(ds)}
                  </span>
                </div>
                <div>
                  <PipelineBar stages={run.stages} />
                </div>
                <div className="run__cur">
                  {cur ? (
                    <>
                      <span className="run__cur-idx">{String(cur.idx).padStart(2, '0')}/{ALL_STAGES.length}</span>
                      <span className="run__cur-name">{cur.name}</span>
                    </>
                  ) : run.status === 'complete' ? (
                    <span className="run__cur-idx">{ALL_STAGES.length}/{ALL_STAGES.length} —</span>
                  ) : (
                    <span className="run__cur-idx">00/{ALL_STAGES.length} —</span>
                  )}
                </div>
                <div className="run__time">{relTime(run.createdAt)}</div>
                <div className="run__chev"><IcChev size={14} /></div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
