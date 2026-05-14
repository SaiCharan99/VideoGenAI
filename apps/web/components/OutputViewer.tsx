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
                        <a href={`https://${s.url}`} target="_blank" rel="noreferrer">
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

  const hasFormatted = stageId === 'brief' || stageId === 'research' || stageId === 'script';

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
      ) : (
        <JsonView data={output} />
      )}
    </div>
  );
}
