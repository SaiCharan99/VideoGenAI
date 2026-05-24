'use client';

import { useState } from 'react';
import { IcCheck, IcX, IcExt, IcEye } from '@/components/ui/Icons';
import { fmtDuration } from '@/lib/stages';

interface Props {
  output: unknown;
  stageId: string;
}

function cls(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

function JsonView({ data }: { data: unknown }) {
  const raw = JSON.stringify(data, null, 2);
  const highlighted = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span class="jk">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="js">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="jn">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="jb">$1</span>');
  return <div className="json" dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

interface BriefData {
  angle?: string;
  hook?: string;
  audience_note?: string;
  thesis?: string;
  length_seconds?: [number, number];
  tone_note?: string;
  must_cover?: string[];
  key_points?: string[];
  must_avoid?: string[];
}

interface SourceData {
  id?: string;
  title?: string;
  publication?: string;
  published_at?: string;
  url?: string;
  excerpt?: string;
  summary?: string;
}

interface FactData {
  claim?: string;
  source_ids?: (string | number)[];
}

interface BalanceCheck {
  passed?: boolean;
  note?: string;
}

interface ResearchData {
  balance_check?: BalanceCheck;
  sources?: SourceData[];
  facts?: FactData[];
}

interface ScriptLine {
  scene?: number | string;
  text?: string;
  type?: string;
  source_ids?: string[];
  speaker_note?: string;
}

interface ScriptData {
  title?: string;
  description?: string;
  estimated_duration_seconds?: number;
  lines?: ScriptLine[];
}

function isBrief(v: unknown): v is BriefData {
  return typeof v === 'object' && v !== null;
}
function isResearch(v: unknown): v is ResearchData {
  return typeof v === 'object' && v !== null;
}
function isScript(v: unknown): v is ScriptData {
  return typeof v === 'object' && v !== null;
}

function OVBrief({ data }: { data: BriefData }) {
  const angle = data.angle ?? data.hook ?? '';
  const audienceNote = data.audience_note ?? data.thesis ?? '';
  const mustCover = data.must_cover ?? data.key_points ?? [];
  const mustAvoid = data.must_avoid ?? [];

  return (
    <div className="ov">
      <div>
        <div className="ov__h">
          Angle <span className="line" />
        </div>
        {angle && <div className="ov__angle">"{angle}"</div>}
        {audienceNote && <div className="ov__lede">{audienceNote}</div>}
      </div>

      {(data.length_seconds ?? data.tone_note) && (
        <div>
          <div className="ov__h">
            Target <span className="line" />
          </div>
          <div className="ov__kv">
            {data.length_seconds && (
              <div>
                <span className="k">Duration</span>
                <span className="v">
                  {fmtDuration(data.length_seconds[0])} – {fmtDuration(data.length_seconds[1])}
                </span>
              </div>
            )}
            {data.tone_note && (
              <div>
                <span className="k">Tone</span>
                <span className="v">{data.tone_note}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {(mustCover.length > 0 || mustAvoid.length > 0) && (
        <div className="cols-2">
          {mustCover.length > 0 && (
            <div>
              <div className="ov__h">
                Must cover · {mustCover.length} <span className="line" />
              </div>
              <ul className="bullets cover">
                {mustCover.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {mustAvoid.length > 0 && (
            <div>
              <div className="ov__h">
                Must avoid · {mustAvoid.length} <span className="line" />
              </div>
              <ul className="bullets avoid">
                {mustAvoid.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OVResearch({ data }: { data: ResearchData }) {
  const sources = data.sources ?? [];
  const facts = data.facts ?? [];
  const balance = data.balance_check;
  const passed = balance?.passed ?? true;

  return (
    <div className="ov">
      <div>
        {balance && (
          <div className={cls('balance', !passed && 'failed')}>
            <div className="b-icon">{passed ? <IcCheck size={12} /> : <IcX size={12} />}</div>
            <div>
              <b>Source balance {passed ? 'passed' : 'failed'}.</b>
              {balance.note && (
                <span style={{ color: 'var(--tx-2)', marginLeft: 6 }}>{balance.note}</span>
              )}
            </div>
          </div>
        )}
        <div className="ov__kv">
          <div>
            <span className="k">Sources</span>
            <span className="v">{sources.length}</span>
          </div>
          <div>
            <span className="k">Facts</span>
            <span className="v">{facts.length}</span>
          </div>
          <div>
            <span className="k">Publications</span>
            <span className="v">
              {new Set(sources.map((s) => s.publication).filter(Boolean)).size}
            </span>
          </div>
        </div>
      </div>

      {sources.length > 0 && (
        <div>
          <div className="ov__h">
            Sources · {sources.length} <span className="line" />
          </div>
          <div>
            {sources.map((s, i) => (
              <div className="source-row" key={s.id ?? i}>
                <span className="source-row__id">{s.id ?? String(i + 1)}</span>
                <div>
                  <div className="source-row__title">{s.title ?? '—'}</div>
                  <div className="source-row__meta">
                    {s.publication && <span className="pub">{s.publication}</span>}
                    {s.published_at && (
                      <>
                        <span className="sep">·</span>
                        <span>{s.published_at}</span>
                      </>
                    )}
                    {s.url && (
                      <>
                        <span className="sep">·</span>
                        <a
                          href={/^https?:\/\//i.test(s.url) ? s.url : `https://${s.url}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.url} <IcExt size={10} />
                        </a>
                      </>
                    )}
                  </div>
                  {(s.excerpt ?? s.summary) && (
                    <div className="source-row__excerpt">"{s.excerpt ?? s.summary}"</div>
                  )}
                </div>
                <button className="btn btn--ghost btn--sm" aria-label="Open source">
                  <IcEye size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {facts.length > 0 && (
        <div>
          <div className="ov__h">
            Facts · {facts.length} <span className="line" />
          </div>
          <div>
            {facts.map((f, i) => (
              <div className="fact-row" key={i}>
                <div className="fact-row__claim">{f.claim ?? ''}</div>
                <div className="fact-row__cites">
                  {(f.source_ids ?? []).map((sid) => (
                    <span key={sid} className="cite">
                      {sid}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OVScript({ data }: { data: ScriptData }) {
  const lines = data.lines ?? [];
  const groups: Record<string, ScriptLine[]> = {};
  for (const l of lines) {
    const key = String(l.scene ?? '1');
    (groups[key] = groups[key] ?? []).push(l);
  }
  const sceneKeys = Object.keys(groups);
  const wordCount = lines.reduce((a, l) => a + (l.text?.split(/\s+/).length ?? 0), 0);

  return (
    <div className="ov">
      <div>
        <div className="ov__h">
          Title &amp; meta <span className="line" />
        </div>
        {data.title && (
          <div className="ov__angle" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>
            {data.title}
          </div>
        )}
        {data.description && <div className="ov__lede">{data.description}</div>}
        <div className="ov__kv" style={{ marginTop: 14 }}>
          {data.estimated_duration_seconds !== undefined && (
            <div>
              <span className="k">Est. duration</span>
              <span className="v">{fmtDuration(data.estimated_duration_seconds)}</span>
            </div>
          )}
          <div>
            <span className="k">Scenes</span>
            <span className="v">{sceneKeys.length}</span>
          </div>
          <div>
            <span className="k">Lines</span>
            <span className="v">{lines.length}</span>
          </div>
          <div>
            <span className="k">Words</span>
            <span className="v">{wordCount}</span>
          </div>
        </div>
      </div>

      {sceneKeys.length > 0 && (
        <div>
          <div className="ov__h">
            Script · {sceneKeys.length} scenes <span className="line" />
          </div>
          <div>
            {sceneKeys.map((scene) => (
              <div className="scene-block" key={scene}>
                <div className="scene-block__num">
                  <span>Scene</span>
                  <b>{String(scene).padStart(2, '0')}</b>
                </div>
                <div>
                  {(groups[scene] ?? []).map((l, i) => (
                    <div
                      key={i}
                      style={{ marginBottom: i < (groups[scene]?.length ?? 0) - 1 ? 14 : 0 }}
                    >
                      {l.text && <div className="scene-block__text">{l.text}</div>}
                      {(l.source_ids?.length ?? 0) > 0 && (
                        <div className="scene-block__cites">
                          <span className="lbl">CITES</span>
                          {(l.source_ids ?? []).map((sid) => (
                            <span key={sid} className="cite">
                              {sid}
                            </span>
                          ))}
                        </div>
                      )}
                      {l.speaker_note && (
                        <div className="scene-block__note">
                          <span className="lbl">Speaker note</span>
                          {l.speaker_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface JargonTerm {
  term?: string;
  definition?: string;
  historical_context?: string;
}
interface JargonData {
  terms?: JargonTerm[];
}
function isJargon(v: unknown): v is JargonData {
  return typeof v === 'object' && v !== null;
}

function OVJargon({ data }: { data: JargonData }) {
  const terms = data.terms ?? [];
  return (
    <div className="ov">
      <div className="ov__h">
        Jargon terms · {terms.length} <span className="line" />
      </div>
      {terms.length === 0 ? (
        <p style={{ color: 'var(--tx-3)', fontSize: 12 }}>No jargon terms identified.</p>
      ) : (
        <div>
          {terms.map((t, i) => (
            <div
              key={i}
              style={{
                padding: '12px 0',
                borderBottom: i < terms.length - 1 ? '1px solid var(--br-1)' : 'none',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--tx-1)', marginBottom: 4 }}>
                {t.term}
              </div>
              <div style={{ fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.55 }}>
                {t.definition}
              </div>
              {t.historical_context && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    color: 'var(--tx-3)',
                    lineHeight: 1.5,
                    borderLeft: '2px solid var(--br-2)',
                    paddingLeft: 10,
                  }}
                >
                  {t.historical_context}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FactCheckIssue {
  severity?: string;
  scene?: number;
  description?: string;
  suggested_fix?: string;
}
interface FactCheckData {
  verdict?: string;
  sourcing_score?: number;
  balance_score?: number;
  issues?: FactCheckIssue[];
  summary?: string;
}
function isFactCheck(v: unknown): v is FactCheckData {
  return typeof v === 'object' && v !== null;
}

function OVFactCheck({ data }: { data: FactCheckData }) {
  const issues = data.issues ?? [];
  const criticals = issues.filter((i) => i.severity === 'critical');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const verdictColor =
    data.verdict === 'pass'
      ? 'var(--ac-ok)'
      : data.verdict === 'pass_with_warnings'
        ? 'var(--ac-approve)'
        : 'var(--ac-bad)';

  function scoreBar(score: number | undefined) {
    const pct = Math.round((score ?? 0) * 100);
    const color = pct >= 90 ? 'var(--ac-ok)' : pct >= 70 ? 'var(--ac-approve)' : 'var(--ac-bad)';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            background: 'var(--bg-4)',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
        </div>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color, minWidth: 32 }}>
          {pct}%
        </span>
      </div>
    );
  }

  return (
    <div className="ov">
      <div>
        <div className="ov__h">
          Verdict <span className="line" />
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 'var(--r-2)',
            border: `1px solid ${verdictColor}`,
            background: `color-mix(in srgb, ${verdictColor} 10%, transparent)`,
            color: verdictColor,
            fontFamily: 'var(--f-mono)',
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 16,
          }}
        >
          {data.verdict ?? '—'}
        </div>
        {data.summary && (
          <div style={{ fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.6 }}>{data.summary}</div>
        )}
      </div>

      <div className="ov__kv">
        <div>
          <span className="k">Sourcing</span>
          <span className="v">{scoreBar(data.sourcing_score)}</span>
        </div>
        <div>
          <span className="k">Balance</span>
          <span className="v">{scoreBar(data.balance_score)}</span>
        </div>
        <div>
          <span className="k">Critical issues</span>
          <span
            className="v"
            style={{ color: criticals.length > 0 ? 'var(--ac-bad)' : 'var(--ac-ok)' }}
          >
            {criticals.length}
          </span>
        </div>
        <div>
          <span className="k">Warnings</span>
          <span
            className="v"
            style={{ color: warnings.length > 0 ? 'var(--ac-approve)' : 'var(--tx-1)' }}
          >
            {warnings.length}
          </span>
        </div>
      </div>

      {issues.length > 0 && (
        <div>
          <div className="ov__h">
            Issues · {issues.length} <span className="line" />
          </div>
          <div>
            {[...criticals, ...warnings, ...infos].map((issue, i) => {
              const sev = issue.severity ?? 'info';
              const color =
                sev === 'critical'
                  ? 'var(--ac-bad)'
                  : sev === 'warning'
                    ? 'var(--ac-approve)'
                    : 'var(--tx-3)';
              return (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    marginBottom: 6,
                    borderRadius: 'var(--r-2)',
                    border: `1px solid ${color}`,
                    background: `color-mix(in srgb, ${color} 8%, transparent)`,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 10,
                        color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {sev}
                    </span>
                    {issue.scene !== undefined && (
                      <span
                        style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--tx-3)' }}
                      >
                        scene {issue.scene}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tx-1)' }}>{issue.description}</div>
                  {issue.suggested_fix && (
                    <div style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 4 }}>
                      Fix: {issue.suggested_fix}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface StoryboardScene {
  scene?: number;
  duration_seconds?: number;
  visual_kind?: string;
  visual_description?: string;
  text_overlay?: string;
  audio_note?: string;
}
interface StoryboardData {
  scenes?: StoryboardScene[];
}
function isStoryboard(v: unknown): v is StoryboardData {
  return typeof v === 'object' && v !== null;
}

const VISUAL_KIND_COLORS: Record<string, string> = {
  text_card: '#b48cff',
  kinetic_text: '#00e5ff',
  chart: '#3ef0a3',
  stock_broll: '#ffb020',
  generated_still: '#ff5470',
  generated_clip: '#ff5470',
  map: '#3ef0a3',
};

function OVStoryboard({ data }: { data: StoryboardData }) {
  const scenes = data.scenes ?? [];
  const totalDur = scenes.reduce((a, s) => a + (s.duration_seconds ?? 0), 0);

  return (
    <div className="ov">
      <div>
        <div className="ov__h">
          Overview <span className="line" />
        </div>
        <div className="ov__kv">
          <div>
            <span className="k">Scenes</span>
            <span className="v">{scenes.length}</span>
          </div>
          <div>
            <span className="k">Total duration</span>
            <span className="v">{fmtDuration(Math.round(totalDur))}</span>
          </div>
          <div>
            <span className="k">Visual kinds</span>
            <span className="v">{new Set(scenes.map((s) => s.visual_kind)).size}</span>
          </div>
        </div>
      </div>

      {scenes.length > 0 && (
        <div>
          <div className="ov__h">
            Scenes · {scenes.length} <span className="line" />
          </div>
          <div>
            {scenes.map((s, i) => {
              const kindColor = VISUAL_KIND_COLORS[s.visual_kind ?? ''] ?? 'var(--tx-3)';
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr',
                    gap: 14,
                    padding: '12px 0',
                    borderBottom: i < scenes.length - 1 ? '1px solid var(--br-1)' : 'none',
                    alignItems: 'start',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--f-mono)',
                      fontSize: 11,
                      color: 'var(--tx-3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <span>Scene</span>
                    <b style={{ color: 'var(--tx-1)', fontSize: 13 }}>
                      {String(s.scene ?? i + 1).padStart(2, '0')}
                    </b>
                    <span style={{ color: 'var(--tx-3)', fontSize: 10 }}>
                      {s.duration_seconds ?? 0}s
                    </span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontFamily: 'var(--f-mono)',
                          fontSize: 10,
                          color: kindColor,
                          background: `color-mix(in srgb, ${kindColor} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${kindColor} 35%, transparent)`,
                          padding: '1px 6px',
                          borderRadius: 3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {s.visual_kind ?? '—'}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--tx-1)',
                        lineHeight: 1.5,
                        marginBottom: 4,
                      }}
                    >
                      {s.visual_description}
                    </div>
                    {s.text_overlay && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--tx-2)',
                          fontFamily: 'var(--f-mono)',
                          background: 'var(--bg-inset)',
                          padding: '4px 8px',
                          borderRadius: 'var(--r-1)',
                          marginBottom: 4,
                        }}
                      >
                        "{s.text_overlay}"
                      </div>
                    )}
                    {s.audio_note && (
                      <div style={{ fontSize: 11.5, color: 'var(--tx-3)', fontStyle: 'italic' }}>
                        🎙 {s.audio_note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assets viewer ────────────────────────────────────────────────────────────

interface AssetItem {
  kind: string;
  scene: number;
  url: string;
  provider?: string;
  attribution?: string;
  prompt?: string;
  duration_seconds?: number;
}
interface AssetsData {
  narration_url?: string;
  assets?: AssetItem[];
}
function isAssets(v: unknown): v is AssetsData {
  return typeof v === 'object' && v !== null && 'assets' in v;
}

const KIND_COLORS: Record<string, string> = {
  stock_broll: '#ffb020',
  generated_still: '#ff5470',
  tts_audio: '#00e5ff',
};

function AssetThumb({ asset }: { asset: AssetItem }) {
  const isVideo = asset.kind === 'stock_broll' && /\.(mp4|webm|mov)(\?|$)/i.test(asset.url);
  const isImage = asset.kind === 'generated_still';

  if (isVideo) {
    return (
      <video
        className="asset-thumb"
        src={asset.url}
        muted
        playsInline
        preload="metadata"
        onMouseEnter={(e) => void e.currentTarget.play()}
        onMouseLeave={(e) => {
          const v = e.currentTarget;
          v.pause();
          v.currentTime = 0;
        }}
      />
    );
  }
  if (isImage) {
    return <img className="asset-thumb" src={asset.url} alt={asset.prompt ?? 'generated still'} />;
  }
  return (
    <div className="asset-thumb asset-thumb--placeholder">
      <span>{asset.kind}</span>
    </div>
  );
}

function OVAssets({ data }: { data: AssetsData }) {
  const assets = (data.assets ?? []).filter((a) => a.kind !== 'tts_audio');
  const sceneAssets = [...assets].sort((a, b) => a.scene - b.scene);
  const stockCount = assets.filter((a) => a.kind === 'stock_broll').length;
  const generatedCount = assets.filter((a) => a.kind === 'generated_still').length;

  return (
    <div className="ov">
      {/* Narration player */}
      {data.narration_url && (
        <div>
          <div className="ov__h">
            Narration <span className="line" />
          </div>
          <div className="narration-wrap">
            <audio controls src={data.narration_url} className="narration-player" />
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="ov__kv">
        <div>
          <span className="k">Narration</span>
          <span
            className="v"
            style={{ color: data.narration_url ? 'var(--ac-ok)' : 'var(--ac-bad)' }}
          >
            {data.narration_url ? 'ready' : 'missing'}
          </span>
        </div>
        <div>
          <span className="k">Total assets</span>
          <span className="v">{assets.length}</span>
        </div>
        {stockCount > 0 && (
          <div>
            <span className="k">Stock clips</span>
            <span className="v">{stockCount}</span>
          </div>
        )}
        {generatedCount > 0 && (
          <div>
            <span className="k">AI stills</span>
            <span className="v">{generatedCount}</span>
          </div>
        )}
      </div>

      {/* Per-scene asset grid */}
      {sceneAssets.length > 0 && (
        <div>
          <div className="ov__h">
            Scene assets · {sceneAssets.length} <span className="line" />
          </div>
          <div className="asset-grid">
            {sceneAssets.map((asset, i) => {
              const kindColor = KIND_COLORS[asset.kind] ?? 'var(--tx-3)';
              return (
                <div key={i} className="asset-card">
                  <AssetThumb asset={asset} />
                  <div className="asset-card__meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontFamily: 'var(--f-mono)',
                          fontSize: 10,
                          color: 'var(--tx-4)',
                        }}
                      >
                        Scene {String(asset.scene).padStart(2, '0')}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--f-mono)',
                          fontSize: 9,
                          color: kindColor,
                          background: `color-mix(in srgb, ${kindColor} 12%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${kindColor} 30%, transparent)`,
                          padding: '1px 5px',
                          borderRadius: 3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {asset.kind.replace('_', ' ')}
                      </span>
                    </div>
                    {asset.prompt && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--tx-3)',
                          lineHeight: 1.4,
                          marginTop: 4,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {asset.prompt}
                      </div>
                    )}
                    {asset.attribution && (
                      <div style={{ fontSize: 10, color: 'var(--tx-4)', marginTop: 4 }}>
                        {asset.attribution}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {assets.length === 0 && (
        <div style={{ color: 'var(--tx-3)', fontSize: 13, padding: '8px 0' }}>
          No scene assets fetched — check API keys (Pexels, Replicate).
        </div>
      )}
    </div>
  );
}

// ── QA viewer ────────────────────────────────────────────────────────────────

interface QaIssue {
  severity?: string;
  category?: string;
  description?: string;
  suggested_fix?: string;
}
interface QaData {
  verdict?: string;
  quality_score?: number;
  content_score?: number;
  asset_score?: number;
  issues?: QaIssue[];
  summary?: string;
  publish_title?: string;
  publish_description?: string;
  tags?: string[];
}
function isQa(v: unknown): v is QaData {
  return typeof v === 'object' && v !== null && 'verdict' in v && 'publish_title' in v;
}

function OVQa({ data }: { data: QaData }) {
  const issues = data.issues ?? [];
  const criticals = issues.filter((i) => i.severity === 'critical');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const verdictColor =
    data.verdict === 'approved'
      ? 'var(--ac-ok)'
      : data.verdict === 'approved_with_notes'
        ? 'var(--ac-approve)'
        : 'var(--ac-bad)';

  function scoreBar(score: number | undefined, label: string) {
    const pct = Math.round((score ?? 0) * 100);
    const color = pct >= 80 ? 'var(--ac-ok)' : pct >= 60 ? 'var(--ac-approve)' : 'var(--ac-bad)';
    return (
      <div>
        <span className="k">{label}</span>
        <span className="v">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 80,
                height: 4,
                borderRadius: 2,
                background: 'var(--bg-4)',
                overflow: 'hidden',
              }}
            >
              <div style={{ width: `${pct}%`, height: '100%', background: color }} />
            </div>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color }}>{pct}%</span>
          </div>
        </span>
      </div>
    );
  }

  return (
    <div className="ov">
      <div>
        <div className="ov__h">
          Verdict <span className="line" />
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            borderRadius: 'var(--r-2)',
            border: `1px solid ${verdictColor}`,
            background: `color-mix(in srgb, ${verdictColor} 10%, transparent)`,
            color: verdictColor,
            fontFamily: 'var(--f-mono)',
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 16,
          }}
        >
          {data.verdict?.replace('_', ' ') ?? '—'}
        </div>
        {data.summary && (
          <div style={{ fontSize: 13, color: 'var(--tx-2)', lineHeight: 1.6 }}>{data.summary}</div>
        )}
      </div>

      <div className="ov__kv">
        {scoreBar(data.quality_score, 'Overall')}
        {scoreBar(data.content_score, 'Content')}
        {scoreBar(data.asset_score, 'Assets')}
        <div>
          <span className="k">Issues</span>
          <span className="v">
            {criticals.length > 0 && (
              <span style={{ color: 'var(--ac-bad)', marginRight: 8 }}>
                {criticals.length} critical
              </span>
            )}
            {warnings.length > 0 && (
              <span style={{ color: 'var(--ac-approve)', marginRight: 8 }}>
                {warnings.length} warning
              </span>
            )}
            {infos.length > 0 && <span style={{ color: 'var(--tx-3)' }}>{infos.length} info</span>}
            {issues.length === 0 && <span style={{ color: 'var(--ac-ok)' }}>none</span>}
          </span>
        </div>
      </div>

      {issues.length > 0 && (
        <div>
          <div className="ov__h">
            Issues · {issues.length} <span className="line" />
          </div>
          <div>
            {[...criticals, ...warnings, ...infos].map((issue, i) => {
              const sev = issue.severity ?? 'info';
              const color =
                sev === 'critical'
                  ? 'var(--ac-bad)'
                  : sev === 'warning'
                    ? 'var(--ac-approve)'
                    : 'var(--tx-3)';
              return (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    marginBottom: 6,
                    borderRadius: 'var(--r-2)',
                    border: `1px solid ${color}`,
                    background: `color-mix(in srgb, ${color} 8%, transparent)`,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontFamily: 'var(--f-mono)',
                        fontSize: 10,
                        color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {sev}
                    </span>
                    {issue.category && (
                      <span
                        style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--tx-3)' }}
                      >
                        {issue.category}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--tx-1)' }}>{issue.description}</div>
                  {issue.suggested_fix && (
                    <div style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 4 }}>
                      Fix: {issue.suggested_fix}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.publish_title && (
        <div>
          <div className="ov__h">
            YouTube metadata <span className="line" />
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--tx-1)',
              lineHeight: 1.4,
              marginBottom: 10,
            }}
          >
            {data.publish_title}
          </div>
          {data.publish_description && (
            <pre
              style={{
                fontSize: 12,
                color: 'var(--tx-2)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'var(--bg-inset)',
                padding: '10px 12px',
                borderRadius: 'var(--r-2)',
                border: '1px solid var(--br-1)',
                marginBottom: 10,
                fontFamily: 'var(--f-sans)',
              }}
            >
              {data.publish_description}
            </pre>
          )}
          {(data.tags ?? []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(data.tags ?? []).map((tag, i) => (
                <span
                  key={i}
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--bg-3)',
                    border: '1px solid var(--br-2)',
                    color: 'var(--tx-2)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Publish viewer ────────────────────────────────────────────────────────────

interface PublishData {
  youtube_video_id?: string;
  youtube_url?: string;
  title?: string;
  description?: string;
  published_at?: string;
}
function isPublish(v: unknown): v is PublishData {
  return typeof v === 'object' && v !== null && 'youtube_video_id' in v;
}

function OVPublish({ data }: { data: PublishData }) {
  return (
    <div className="ov">
      <div className="ov__h">
        Published to YouTube <span className="line" />
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 'var(--r-2)',
          border: '1px solid var(--ac-ok)',
          background: 'color-mix(in srgb, var(--ac-ok) 10%, transparent)',
          color: 'var(--ac-ok)',
          fontFamily: 'var(--f-mono)',
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 16,
        }}
      >
        <IcCheck size={14} /> Live on YouTube
      </div>
      <div className="ov__kv">
        <div>
          <span className="k">Video ID</span>
          <span className="v" style={{ fontFamily: 'var(--f-mono)' }}>
            {data.youtube_video_id ?? '—'}
          </span>
        </div>
        {data.published_at && (
          <div>
            <span className="k">Published</span>
            <span className="v">{new Date(data.published_at).toLocaleString()}</span>
          </div>
        )}
        {data.title && (
          <div>
            <span className="k">Title</span>
            <span className="v">{data.title}</span>
          </div>
        )}
      </div>
      {data.youtube_url && (
        <a
          href={data.youtube_url}
          target="_blank"
          rel="noreferrer"
          className="btn btn--approve btn--sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8 }}
        >
          <IcExt size={12} /> Open on YouTube
        </a>
      )}
    </div>
  );
}

// ── Render viewer ─────────────────────────────────────────────────────────────

interface RenderData {
  output_url?: string;
  duration_seconds?: number;
  width?: number;
  height?: number;
}
function isRender(v: unknown): v is RenderData {
  return typeof v === 'object' && v !== null && 'output_url' in v;
}

function OVRender({ data }: { data: RenderData }) {
  return (
    <div className="ov">
      <div className="ov__h">
        Render manifest <span className="line" />
      </div>
      <div className="ov__kv">
        {data.width && data.height && (
          <div>
            <span className="k">Resolution</span>
            <span className="v">
              {data.width}×{data.height}
            </span>
          </div>
        )}
        {data.duration_seconds !== undefined && (
          <div>
            <span className="k">Duration</span>
            <span className="v">{fmtDuration(Math.round(data.duration_seconds))}</span>
          </div>
        )}
        {data.output_url && (
          <div>
            <span className="k">Output path</span>
            <span className="v" style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}>
              {data.output_url}
            </span>
          </div>
        )}
      </div>
      {data.output_url && (
        <div
          style={{
            marginTop: 8,
            padding: '12px 16px',
            border: '1px dashed var(--br-2)',
            borderRadius: 'var(--r-2)',
            fontSize: 12,
            color: 'var(--tx-3)',
            lineHeight: 1.6,
          }}
        >
          Render manifest written. Run{' '}
          <code style={{ fontFamily: 'var(--f-mono)', color: 'var(--ac-cyan)' }}>
            npx remotion render
          </code>{' '}
          with the manifest to produce the MP4.
        </div>
      )}
    </div>
  );
}

export function OutputViewer({ output, stageId }: Props) {
  const [view, setView] = useState<'formatted' | 'json'>('formatted');

  if (output === null || output === undefined) {
    return (
      <div style={{ padding: '40px 0', color: 'var(--tx-3)', textAlign: 'center', fontSize: 13 }}>
        No output yet.
      </div>
    );
  }

  const jsonSize = JSON.stringify(output).length;
  const jsonSizeLabel = jsonSize > 1024 ? `${Math.round(jsonSize / 1024)}k` : `${jsonSize}b`;

  const FORMATTED_STAGES = new Set([
    'brief',
    'research',
    'script',
    'jargon',
    'fact-check',
    'storyboard',
    'assets',
    'render',
    'qa',
    'publish',
  ]);
  const hasFormatted = FORMATTED_STAGES.has(stageId);

  return (
    <div>
      <div className="subnav">
        {hasFormatted && (
          <button
            className={cls('subnav__opt', view === 'formatted' && 'active')}
            onClick={() => setView('formatted')}
          >
            Formatted
          </button>
        )}
        <button
          className={cls('subnav__opt', view === 'json' && 'active')}
          onClick={() => setView('json')}
        >
          Raw JSON <span className="num">{jsonSizeLabel}</span>
        </button>
      </div>

      {view === 'json' || !hasFormatted ? (
        <JsonView data={output} />
      ) : stageId === 'brief' && isBrief(output) ? (
        <OVBrief data={output} />
      ) : stageId === 'research' && isResearch(output) ? (
        <OVResearch data={output} />
      ) : stageId === 'script' && isScript(output) ? (
        <OVScript data={output} />
      ) : stageId === 'jargon' && isJargon(output) ? (
        <OVJargon data={output} />
      ) : stageId === 'fact-check' && isFactCheck(output) ? (
        <OVFactCheck data={output} />
      ) : stageId === 'storyboard' && isStoryboard(output) ? (
        <OVStoryboard data={output} />
      ) : stageId === 'assets' && isAssets(output) ? (
        <OVAssets data={output} />
      ) : stageId === 'render' && isRender(output) ? (
        <OVRender data={output} />
      ) : stageId === 'qa' && isQa(output) ? (
        <OVQa data={output} />
      ) : stageId === 'publish' && isPublish(output) ? (
        <OVPublish data={output} />
      ) : (
        <JsonView data={output} />
      )}
    </div>
  );
}
