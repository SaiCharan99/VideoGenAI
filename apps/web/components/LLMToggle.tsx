'use client';

import { useState, useEffect, useCallback } from 'react';

type Provider = 'anthropic' | 'openai';

const LABEL: Record<Provider, string> = { anthropic: 'Anthropic', openai: 'OpenAI' };

/* ─── Brand icons ──────────────────────────────────────────────────────────── */

function AnthropicIcon({ size = 13 }: { size?: number }) {
  // Anthropic official logomark — 46:32 wide mark, width scaled to preserve ratio
  const w = Math.round(size * 1.4375);
  return (
    <svg width={w} height={size} viewBox="0 0 46 32" fill="currentColor" aria-hidden="true">
      <path d="M32.73 0h-6.945L14.54 32h6.945l11.245-32zM18.58 0H11.635L0 32h7.006z" />
    </svg>
  );
}

function OpenAIIcon({ size = 13 }: { size?: number }) {
  // OpenAI bloom — simplified 6-petal rosette
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.28 9.82a6 6 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18a6 6 0 0 0-4 2.9 6.05 6.05 0 0 0 .74 7.1 6 6 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A6 6 0 0 0 13.26 24a6.06 6.06 0 0 0 5.77-4.21 6 6 0 0 0 4-2.9 6.06 6.06 0 0 0-.75-7.07zM13.26 22.4a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.8.8 0 0 0 .39-.68V11.2l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.49 4.4zM3.6 18.28a4.47 4.47 0 0 1-.53-3.01l.14.08 4.78 2.76a.77.77 0 0 0 .78 0l5.84-3.37v2.33a.08.08 0 0 1-.03.06L9.74 19.95A4.5 4.5 0 0 1 3.6 18.28zm-1.26-9.9a4.49 4.49 0 0 1 2.37-1.97v4.79a.77.77 0 0 0 .39.68l5.81 3.35-2.02 1.17a.08.08 0 0 1-.07 0l-4.83-2.79A4.5 4.5 0 0 1 2.34 8.38zm16.59 3.86-5.82-3.37 2.02-1.17a.08.08 0 0 1 .07 0l4.83 2.79a4.49 4.49 0 0 1-.68 8.1V13.1a.79.79 0 0 0-.42-.86zm2.01-3.02-.14-.09-4.77-2.78a.78.78 0 0 0-.79 0L9.41 9.72V7.38a.07.07 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zM8.3 12.86l-2.02-1.16a.08.08 0 0 1-.04-.06V6.07A4.5 4.5 0 0 1 13.65 2.6l-.14.08L8.7 5.46a.8.8 0 0 0-.4.68zm1.1-2.37 2.6-1.5 2.6 1.5v3l-2.6 1.5-2.6-1.5z" />
    </svg>
  );
}

/* ─── Toggle component ────────────────────────────────────────────────────── */

export function LLMToggle() {
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [pending, setPending] = useState<Provider | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/settings/llm')
      .then((r) => r.json())
      .then((d: { provider: Provider }) => {
        setProvider(d.provider);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const requestSwitch = useCallback(
    (next: Provider) => {
      if (next !== provider) setPending(next);
    },
    [provider],
  );

  const confirmSwitch = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await fetch('/api/settings/llm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: pending }),
      });
      setProvider(pending);
    } finally {
      setBusy(false);
      setPending(null);
    }
  }, [pending, busy]);

  const cancelSwitch = useCallback(() => setPending(null), []);

  if (!loaded) return null;

  return (
    <>
      {/* Segmented toggle */}
      <div className={`llm-seg llm-seg--${provider}`} role="group" aria-label="LLM provider">
        <button
          className={`llm-seg__opt${provider === 'anthropic' ? ' llm-seg__opt--active' : ''}`}
          onClick={() => requestSwitch('anthropic')}
          aria-pressed={provider === 'anthropic'}
          title="Use Anthropic"
        >
          <AnthropicIcon />
          <span>Anthropic</span>
        </button>
        <button
          className={`llm-seg__opt${provider === 'openai' ? ' llm-seg__opt--active' : ''}`}
          onClick={() => requestSwitch('openai')}
          aria-pressed={provider === 'openai'}
          title="Use OpenAI"
        >
          <OpenAIIcon />
          <span>OpenAI</span>
        </button>
      </div>

      {/* Confirmation modal */}
      {pending && (
        <div
          className="llm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="llm-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelSwitch();
          }}
        >
          <div className={`llm-modal llm-modal--${pending}`}>
            <div className="llm-modal__icon">
              {pending === 'anthropic' ? <AnthropicIcon size={22} /> : <OpenAIIcon size={22} />}
            </div>
            <div className="llm-modal__title" id="llm-modal-title">
              Switch to {LABEL[pending]}?
            </div>
            <div className="llm-modal__body">
              <p>
                New pipeline runs will use <strong>{LABEL[pending]}</strong> instead of{' '}
                <strong>{LABEL[provider]}</strong>.
              </p>
              <p className="llm-modal__note">Runs already in progress are not affected.</p>
            </div>
            <div className="llm-modal__actions">
              <button className="llm-modal__cancel" onClick={cancelSwitch} disabled={busy}>
                Cancel
              </button>
              <button
                className={`llm-modal__confirm llm-modal__confirm--${pending}`}
                onClick={() => {
                  void confirmSwitch();
                }}
                disabled={busy}
              >
                {busy ? 'Switching…' : `Switch to ${LABEL[pending]}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
