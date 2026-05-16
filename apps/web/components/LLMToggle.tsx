'use client';

import { useState, useEffect, useCallback } from 'react';

type Provider = 'anthropic' | 'openai';

const LABEL: Record<Provider, string> = { anthropic: 'Anthropic', openai: 'OpenAI' };
const SHORT: Record<Provider, string> = { anthropic: 'ANTH', openai: 'OAI' };

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

  const requestSwitch = useCallback(() => {
    const next: Provider = provider === 'anthropic' ? 'openai' : 'anthropic';
    setPending(next);
  }, [provider]);

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
      <button
        className={`llm-toggle llm-toggle--${provider}`}
        onClick={requestSwitch}
        title={`LLM provider: ${LABEL[provider]} — click to switch`}
        aria-label={`Switch LLM provider from ${LABEL[provider]}`}
      >
        <span className="llm-toggle__dot" />
        <span className="llm-toggle__label">{SHORT[provider]}</span>
      </button>

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
          <div className="llm-modal">
            <div className="llm-modal__title" id="llm-modal-title">
              Switch LLM provider?
            </div>
            <div className="llm-modal__body">
              <p>
                Switch from <strong>{LABEL[provider]}</strong> to <strong>{LABEL[pending]}</strong>?
              </p>
              <p className="llm-modal__note">
                All new pipeline runs will use {LABEL[pending]}. Runs already in progress are not
                affected.
              </p>
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
