'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CHANNELS, fmtRange } from '@/lib/channels';
import { ALL_STAGES } from '@/lib/stages';
import { IcBolt, IcChev, IcSparkle } from '@/components/ui/Icons';

function cls(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

const EXAMPLES = [
  'Why is the RBA changing rates again?',
  'What does OpenAI\'s latest model actually change?',
  'Why are energy prices still high?',
  'Preferential voting, explained without the diagram from hell',
];

const GATE_IDS = new Set(['brief', 'research', 'script', 'fact-check', 'storyboard', 'publish']);

export default function NewRunPage() {
  const router = useRouter();
  const [channelId, setChannelId] = useState(CHANNELS[0]!.id);
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canStart = topic.trim().length >= 8;
  const selectedChannel = CHANNELS.find((c) => c.id === channelId) ?? CHANNELS[0]!;

  async function handleSubmit() {
    if (!canStart || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, inputText: topic }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: unknown };
        setError(typeof body.error === 'string' ? body.error : JSON.stringify(body.error));
        return;
      }
      const { runId } = (await res.json()) as { runId: string };
      router.push(`/runs/${runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="page-tabs">
        <Link href="/runs">Runs</Link>
        <span className="sep"><IcChev size={10} /></span>
        <span style={{ color: 'var(--tx-1)' }}>New run</span>
      </div>

      <div className="ph">
        <div>
          <div className="ph__title">Compose a new run</div>
          <div className="ph__sub">Pick a channel, give it a one-line idea. The pipeline takes it from there.</div>
        </div>
      </div>

      <div className="composer">
        <div className="composer__main">
          {/* Channel selector */}
          <div className="fld">
            <label className="fld__label">
              <span>Channel</span>
              <span className="req">REQUIRED</span>
            </label>
            <div className="channels">
              {CHANNELS.map((c) => (
                <div
                  key={c.id}
                  className={cls('channel', channelId === c.id && 'selected')}
                  onClick={() => setChannelId(c.id)}
                  role="radio"
                  aria-checked={channelId === c.id}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setChannelId(c.id); }}
                >
                  <div className="channel__head">
                    <div
                      className="channel__swatch"
                      style={{
                        background: `linear-gradient(135deg, ${c.palette[0]} 0% 50%, ${c.palette[1]} 50% 100%)`,
                      }}
                    />
                    <div className="channel__name">{c.name}</div>
                    <div className="channel__radio" />
                  </div>
                  <div className="channel__meta">
                    <div>
                      <span className="k">Audience</span>
                      <span className="v">{c.audience}</span>
                    </div>
                    <div>
                      <span className="k">Duration</span>
                      <span className="v">{fmtRange(c.duration)}</span>
                    </div>
                    <div>
                      <span className="k">Tone</span>
                      <span className="v">{c.tone}</span>
                    </div>
                    <div>
                      <span className="k">Motion</span>
                      <span className="v">{c.motion}</span>
                    </div>
                  </div>
                  <div className="channel__sources">
                    {c.sources.map((s) => (
                      <span key={s} className="tag">{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topic textarea */}
          <div className="fld">
            <label className="fld__label">
              <span>Topic</span>
              <span className="req">ONE LINE · UP TO 200 CHARS</span>
            </label>
            <div className="textarea-wrap">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value.slice(0, 200))}
                placeholder={`e.g. ${EXAMPLES[0]}`}
                rows={3}
                autoFocus
              />
              <div className="textarea-wrap__foot">
                <span>The brief stage will refine this into an angle, audience note, and must-cover list.</span>
                <span style={{ color: topic.length > 180 ? 'var(--ac-approve)' : 'var(--tx-3)' }}>
                  {topic.length}/200
                </span>
              </div>
            </div>
          </div>

          {/* Quick-start chips */}
          <div className="fld">
            <span className="fld__hint">Or pick a starter:</span>
            <div className="chips" style={{ marginTop: 6 }}>
              {EXAMPLES.map((ex) => (
                <button key={ex} className="chip" onClick={() => setTopic(ex)}>
                  <IcSparkle size={11} /> {ex}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', border: '1px solid var(--ac-bad-br)',
              borderRadius: 'var(--r-2)', background: 'var(--ac-bad-bg)',
              color: 'var(--ac-bad)', fontFamily: 'var(--f-mono)', fontSize: 12,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/runs" className="btn btn--ghost">Cancel</Link>
            <button
              className="btn btn--primary"
              disabled={!canStart || submitting}
              onClick={() => void handleSubmit()}
            >
              <IcBolt size={13} />
              {submitting ? 'Starting…' : 'Start pipeline'}
              <span className="kbd-badge" style={{ color: 'var(--bg-0)', background: 'rgba(0,0,0,0.15)', borderColor: 'transparent' }}>⌘↵</span>
            </button>
            {!canStart && topic.length > 0 && (
              <span style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'var(--f-mono)' }}>
                Need at least 8 characters.
              </span>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="composer__side">
          <div className="preview-card">
            <h4>What happens next <span>10 stages</span></h4>
            <div className="pipe-preview">
              {ALL_STAGES.map((s, i) => (
                <div key={s.id} className={cls('pipe-preview__step', GATE_IDS.has(s.id) && 'gate')}>
                  <div className="pipe-preview__dot">{String(i + 1).padStart(2, '0')}</div>
                  <span className="pipe-preview__name">{s.label}</span>
                  {GATE_IDS.has(s.id) && <span className="pipe-preview__gate">approval</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="preview-card">
            <h4>Channel rules <span>{selectedChannel.short}</span></h4>
            <dl className="rules" style={{ margin: 0 }}>
              <dt>Audience</dt><dd>{selectedChannel.audience}</dd>
              <dt>Tone</dt><dd>{selectedChannel.tone}</dd>
              <dt>Duration</dt><dd>{fmtRange(selectedChannel.duration)}</dd>
              <dt>Required source mix</dt>
              <dd>
                <div className="chips" style={{ marginTop: 4 }}>
                  {selectedChannel.sources.map((s) => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                </div>
              </dd>
              <dt>Visual palette</dt>
              <dd>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                  {selectedChannel.palette.map((p) => (
                    <div
                      key={p}
                      title={p}
                      style={{
                        width: 22, height: 22, borderRadius: 4,
                        background: p, boxShadow: '0 0 0 1px var(--br-2) inset',
                      }}
                    />
                  ))}
                  <code style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--tx-3)', marginLeft: 4 }}>
                    {selectedChannel.palette.join(' · ')}
                  </code>
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
