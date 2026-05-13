import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VideoGenAI Cockpit',
  description: 'Human-in-the-loop pipeline for AI-generated YouTube videos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-[var(--border)] px-6 py-3 flex items-center gap-3">
          <span className="font-mono font-bold text-[var(--accent)] tracking-tight">
            VideoGenAI
          </span>
          <span className="text-[var(--muted)] text-xs">cockpit</span>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
