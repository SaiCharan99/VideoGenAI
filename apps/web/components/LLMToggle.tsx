'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

type Provider = 'anthropic' | 'openai';

const LABEL: Record<Provider, string> = { anthropic: 'Anthropic', openai: 'OpenAI' };

/* ─── Brand icons ──────────────────────────────────────────────────────────── */

function AnthropicIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 248 248" fill="currentColor" aria-hidden="true">
      <path d="M52.4285 162.873L98.7844 136.879L99.5485 134.602L98.7844 133.334H96.4921L88.7237 132.862L62.2346 132.153L39.3113 131.207L17.0249 130.026L11.4214 128.844L6.2 121.873L6.7094 118.447L11.4214 115.257L18.171 115.847L33.0711 116.911L55.485 118.447L71.6586 119.392L95.728 121.873H99.5485L100.058 120.337L98.7844 119.392L97.7656 118.447L74.5877 102.732L49.4995 86.1905L36.3823 76.62L29.3779 71.7757L25.8121 67.2858L24.2839 57.3608L30.6515 50.2716L39.3113 50.8623L41.4763 51.4531L50.2636 58.1879L68.9842 72.7209L93.4357 90.6804L97.0015 93.6343L98.4374 92.6652L98.6571 91.9801L97.0015 89.2625L83.757 65.2772L69.621 40.8192L63.2534 30.6579L61.5978 24.632C60.9565 22.1032 60.579 20.0111 60.579 17.4246L67.8381 7.49965L71.9133 6.19995L81.7193 7.49965L85.7946 11.0443L91.9074 24.9865L101.714 46.8451L116.996 76.62L121.453 85.4816L123.873 93.6343L124.764 96.1155H126.292V94.6976L127.566 77.9197L129.858 57.3608L132.15 30.8942L132.915 23.4505L136.608 14.4708L143.994 9.62643L149.725 12.344L154.437 19.0788L153.8 23.4505L150.998 41.6463L145.522 70.1215L141.957 89.2625H143.994L146.414 86.7813L156.093 74.0206L172.266 53.698L179.398 45.6635L187.803 36.802L193.152 32.5484H203.34L210.726 43.6549L207.415 55.1159L196.972 68.3492L188.312 79.5739L175.896 96.2095L168.191 109.585L168.882 110.689L170.738 110.53L198.755 104.504L213.91 101.787L231.994 98.7149L240.144 102.496L241.036 106.395L237.852 114.311L218.495 119.037L195.826 123.645L162.07 131.592L161.696 131.893L162.137 132.547L177.36 133.925L183.855 134.279H199.774L229.447 136.524L237.215 141.605L241.8 147.867L241.036 152.711L229.065 158.737L213.019 154.956L175.45 145.977L162.587 142.787H160.805V143.85L171.502 154.366L191.242 172.089L215.82 195.011L217.094 200.682L213.91 205.172L210.599 204.699L188.949 188.394L180.544 181.069L161.696 165.118H160.422V166.772L164.752 173.152L187.803 207.771L188.949 218.405L187.294 221.832L181.308 223.959L174.813 222.777L161.187 203.754L147.305 182.486L136.098 163.345L134.745 164.2L128.075 235.42L125.019 239.082L117.887 241.8L111.902 237.31L108.718 229.984L111.902 215.452L115.722 196.547L118.779 181.541L121.58 162.873L123.291 156.636L123.14 156.219L121.773 156.449L107.699 175.752L86.304 204.699L69.3663 222.777L65.291 224.431L58.2867 220.768L58.9235 214.27L62.8713 208.48L86.304 178.705L100.44 160.155L109.551 149.507L109.462 147.967L108.959 147.924L46.6977 188.512L35.6182 189.93L30.7788 185.44L31.4156 178.115L33.7079 175.752L52.4285 162.873Z" />
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

      {/* Confirmation modal — portalled to body to escape header backdrop-filter stacking context */}
      {pending &&
        createPortal(
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
          </div>,
          document.body,
        )}
    </>
  );
}
