'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CHANNEL_MAP } from '@/lib/channels';
import { relTime } from '@/lib/stages';
import { IcPlus, IcRefresh, IcSearch, IcFilter, IcChev } from '@/components/ui/Icons';

interface Run {
  id: string;
  channelId: string;
  inputText: string;
  status: string;
  createdAt: string;
}

interface RunsResponse {
  runs: Run[];
  awaitingApproval: number;
}

type StatusFilter = 'all' | 'running' | 'complete' | 'failed' | 'pending';

function cls(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

function pillClass(status: string): string {
  if (status === 'running') return 'pill pill--running';
  if (status === 'complete') return 'pill pill--ok';
  if (status === 'failed') return 'pill pill--bad';
  if (status === 'pending') return 'pill pill--pending';
  return 'pill pill--pending';
}

const CHANNELS_LIST = ['all', 'aussie-politics-explained', 'latest-tech-explained'] as const;

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
    running: runs.filter((r) => r.status === 'running').length,
    complete: runs.filter((r) => r.status === 'complete').length,
    failed: runs.filter((r) => r.status === 'failed').length,
    pending: runs.filter((r) => r.status === 'pending').length,
    awaitingApproval: data?.awaitingApproval ?? 0,
  };

  const filtered = runs.filter((r) => {
    if (channelFilter !== 'all' && r.channelId !== channelFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (q && !r.inputText.toLowerCase().includes(q.toLowerCase()) && !r.id.includes(q))
      return false;
    return true;
  });

  const STATUS_FILTERS: [StatusFilter, string][] = [
    ['all', 'All'],
    ['running', 'Running'],
    ['complete', 'Complete'],
    ['failed', 'Failed'],
    ['pending', 'Pending'],
  ];

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
          <div className="stat__label">
            <span className="dot" />
            Total runs
          </div>
          <div className="stat__val">{counts.all}</div>
          <div className="stat__delta">across all channels</div>
        </div>
        <div className="stat stat--running">
          <div className="stat__label">
            <span className="dot" />
            Running
          </div>
          <div className="stat__val">{counts.running}</div>
          <div className="stat__delta">active pipelines</div>
        </div>
        <div className="stat stat--approval">
          <div className="stat__label">
            <span className="dot" />
            Awaiting approval
          </div>
          <div className="stat__val">{counts.awaitingApproval}</div>
          <div className="stat__delta">stages need review</div>
        </div>
        <div className="stat stat--failed">
          <div className="stat__label">
            <span className="dot" />
            Failed
          </div>
          <div className="stat__val">{counts.failed}</div>
          <div className="stat__delta">need attention</div>
        </div>
      </div>

      <div className="tools">
        <div className="search">
          <span className="ic">
            <IcSearch size={13} />
          </span>
          <input
            placeholder="Search topic or run ID…"
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
              <span className="num">{counts[k === 'all' ? 'all' : k] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="select-wrap">
          <IcFilter size={11} />
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            style={{ color: 'var(--tx-1)' }}
          >
            {CHANNELS_LIST.map((id) => (
              <option key={id} value={id}>
                {id === 'all'
                  ? 'All channels'
                  : (CHANNEL_MAP[id]?.short ?? id)}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--f-mono)',
            fontSize: 11,
            color: 'var(--tx-3)',
          }}
        >
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
          {Array.from({ length: 3 }, (_, i) => (
            <div className="run__row" key={i} style={{ cursor: 'default' }}>
              <div>
                <div className="skel" style={{ height: 13, width: '60%', marginBottom: 6 }} />
                <div className="skel" style={{ height: 10, width: '30%' }} />
              </div>
              <div>
                <div className="skel" style={{ height: 10, width: 80 }} />
              </div>
              <div>
                <div className="skel" style={{ height: 20, width: 60, borderRadius: 4 }} />
              </div>
              <div>
                <div className="skel" style={{ height: 10, width: 50 }} />
              </div>
              <div />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <h3>No runs match those filters.</h3>
          <p>Try clearing the search or status filter, or start a new run.</p>
          <Link href="/runs/new" className="btn btn--primary">
            <IcPlus size={13} /> New run
          </Link>
        </div>
      ) : (
        <div className="runs">
          <div className="runs__head">
            <div>Topic</div>
            <div>Channel</div>
            <div>Status</div>
            <div>Created</div>
            <div />
          </div>
          {filtered.map((run) => {
            const ch = CHANNEL_MAP[run.channelId];
            return (
              <Link key={run.id} href={`/runs/${run.id}`} className="run__row" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="run__topic">
                  <b>{run.inputText}</b>
                  <small>{run.id}</small>
                </div>
                <div className="run__channel">
                  {ch && (
                    <div
                      className="ch-dot"
                      style={{
                        background: `linear-gradient(135deg, ${ch.palette[0]} 0% 50%, ${ch.palette[1]} 50% 100%)`,
                      }}
                    />
                  )}
                  {ch?.short ?? run.channelId}
                </div>
                <div>
                  <span className={pillClass(run.status)}>
                    <span className="dot" />
                    {run.status}
                  </span>
                </div>
                <div className="run__time">{relTime(run.createdAt)}</div>
                <div className="run__chev">
                  <IcChev size={14} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
