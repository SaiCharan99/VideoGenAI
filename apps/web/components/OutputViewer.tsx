'use client';

import ReactMarkdown from 'react-markdown';

interface Props {
  output: unknown;
  stageId: string;
}

interface BriefOutput {
  hook?: string;
  thesis?: string;
  key_points?: string[];
}

interface SourceOutput {
  title?: string;
  url?: string;
  summary?: string;
}

interface FactOutput {
  claim?: string;
  source_ids?: number[];
}

interface ResearchOutput {
  sources?: SourceOutput[];
  facts?: FactOutput[];
}

interface ScriptLine {
  type?: string;
  text?: string;
}

interface ScriptOutput {
  lines?: ScriptLine[];
}

function isBriefOutput(v: unknown): v is BriefOutput {
  return typeof v === 'object' && v !== null;
}

function isResearchOutput(v: unknown): v is ResearchOutput {
  return typeof v === 'object' && v !== null;
}

function isScriptOutput(v: unknown): v is ScriptOutput {
  return typeof v === 'object' && v !== null;
}

export function OutputViewer({ output, stageId }: Props) {
  if (output === null || output === undefined) return null;

  if (stageId === 'brief' && isBriefOutput(output)) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        {typeof output.hook === 'string' && (
          <div>
            <span className="text-xs text-[var(--muted)] uppercase tracking-wider">Hook</span>
            <p className="mt-1">{output.hook}</p>
          </div>
        )}
        {typeof output.thesis === 'string' && (
          <div>
            <span className="text-xs text-[var(--muted)] uppercase tracking-wider">Thesis</span>
            <p className="mt-1">{output.thesis}</p>
          </div>
        )}
        {Array.isArray(output.key_points) && (
          <div>
            <span className="text-xs text-[var(--muted)] uppercase tracking-wider">Key points</span>
            <ul className="mt-1 list-disc list-inside flex flex-col gap-1">
              {output.key_points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (stageId === 'research' && isResearchOutput(output)) {
    const sources = output.sources ?? [];
    const facts = output.facts ?? [];
    return (
      <div className="flex flex-col gap-4 text-sm">
        <div>
          <span className="text-xs text-[var(--muted)] uppercase tracking-wider">
            Sources ({sources.length})
          </span>
          <div className="mt-1 flex flex-col gap-1">
            {sources.map((s, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-[var(--muted)] font-mono text-xs shrink-0">[{i + 1}]</span>
                <div>
                  <span className="font-medium">{s.title ?? ''}</span>
                  {typeof s.url === 'string' && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-[var(--accent)] text-xs hover:underline"
                    >
                      ↗
                    </a>
                  )}
                  {typeof s.summary === 'string' && (
                    <p className="text-[var(--muted)] text-xs mt-0.5">{s.summary}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs text-[var(--muted)] uppercase tracking-wider">
            Facts ({facts.length})
          </span>
          <div className="mt-1 flex flex-col gap-1">
            {facts.map((f, i) => (
              <div key={i} className="text-xs">
                <span>{f.claim ?? ''}</span>
                {Array.isArray(f.source_ids) && f.source_ids.length > 0 && (
                  <span className="ml-1 text-[var(--muted)]">[{f.source_ids.join(', ')}]</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (stageId === 'script' && isScriptOutput(output)) {
    const lines = output.lines ?? [];
    return (
      <div className="flex flex-col gap-1 text-sm">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-3 items-start border-b border-[var(--border)] pb-2">
            <span className="text-xs font-mono text-[var(--muted)] w-6 shrink-0">{i + 1}</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs uppercase text-[var(--muted)] tracking-wider">
                {line.type ?? ''}
              </span>
              <span>{line.text ?? ''}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof output === 'string') {
    return (
      <div className="prose prose-invert prose-sm max-w-none text-[var(--text)]">
        <ReactMarkdown>{output}</ReactMarkdown>
      </div>
    );
  }

  return (
    <pre className="text-xs overflow-auto font-mono text-[var(--muted)] whitespace-pre-wrap">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}
