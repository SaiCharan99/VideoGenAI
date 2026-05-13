'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const CHANNELS = [
  { id: 'aussie-politics-explained', label: 'Aussie Politics Explained' },
  { id: 'latest-tech-explained', label: 'Latest Tech Explained' },
];

export default function NewRunPage() {
  const router = useRouter();
  const [channelId, setChannelId] = useState(CHANNELS[0]!.id);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, inputText }),
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
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold mb-6">New run</h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Channel
          </label>
          <select
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            {CHANNELS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            Topic / one-liner
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="e.g. Why is the Reserve Bank raising interest rates again?"
            rows={3}
            minLength={10}
            maxLength={500}
            required
            className="bg-[var(--surface)] border border-[var(--border)] rounded px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--muted)]"
          />
          <span className="text-xs text-[var(--muted)] text-right">{inputText.length} / 500</span>
        </div>

        {error && (
          <p className="text-sm text-[var(--red)] border border-[var(--red)] rounded px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || inputText.length < 10}
          className="bg-[var(--accent)] text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {submitting ? 'Starting…' : 'Start pipeline'}
        </button>
      </form>
    </div>
  );
}
