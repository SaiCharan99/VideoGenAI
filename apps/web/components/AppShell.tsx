'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CHANNELS } from '@/lib/channels';
import { IcRuns, IcChannels, IcPlus, IcSearch, IcSettings, IcChev } from '@/components/ui/Icons';
import { LLMToggle } from '@/components/LLMToggle';

function cls(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(' ');
}

function Header() {
  const pathname = usePathname();

  let crumbs: React.ReactNode = null;
  if (pathname === '/runs') {
    crumbs = <span>Runs</span>;
  } else if (pathname === '/runs/new') {
    crumbs = (
      <>
        <Link href="/runs" style={{ color: 'var(--tx-3)', textDecoration: 'none' }}>
          Runs
        </Link>
        <span className="sep">
          <IcChev size={10} />
        </span>
        <span className="cur">New run</span>
      </>
    );
  } else {
    const runId = /^\/runs\/([^/]+)$/.exec(pathname)?.[1];
    if (runId) {
      crumbs = (
        <>
          <Link href="/runs" style={{ color: 'var(--tx-3)', textDecoration: 'none' }}>
            Runs
          </Link>
          <span className="sep">
            <IcChev size={10} />
          </span>
          <span className="cur" style={{ fontFamily: 'var(--f-mono)', fontSize: 11 }}>
            {runId}
          </span>
        </>
      );
    }
  }

  return (
    <header className="hdr">
      <div className="hdr__brand">
        <div className="hdr__logo">VG</div>
        <div className="hdr__name">
          VideoGenAI <span>/ cockpit</span>
        </div>
      </div>
      <div className="hdr__crumbs">{crumbs}</div>
      <div className="hdr__right">
        <LLMToggle />
        <span className="hdr__chip">
          <span className="dot" /> Inngest
        </span>
        <span className="hdr__chip mute">
          <span className="dot" /> local
        </span>
        <span className="hdr__op">
          operator <b>@you</b>
        </span>
      </div>
    </header>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const isRuns =
    pathname === '/runs' || pathname === '/runs/new' || /^\/runs\/[^/]+$/.test(pathname);

  return (
    <nav className="side" aria-label="Primary">
      <div className="side__section">
        <div className="side__label">Workspace</div>
        <Link href="/runs" className={cls('side__item', isRuns && 'active')}>
          <span className="ic">
            <IcRuns />
          </span>
          Runs
        </Link>
        <span className="side__item disabled">
          <span className="ic">
            <IcChannels />
          </span>
          Channels
          <span className="count">2</span>
        </span>
        <span className="side__item disabled">
          <span className="ic">
            <IcSettings />
          </span>
          Settings
        </span>
      </div>

      <div className="side__section">
        <div className="side__label">Channels</div>
        {CHANNELS.map((c) => (
          <span key={c.id} className="side__item" title={c.name}>
            <span className="ic">
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${c.palette[0]} 0% 50%, ${c.palette[1]} 50% 100%)`,
                  boxShadow: '0 0 0 1px var(--br-2) inset',
                }}
              />
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.short}
            </span>
          </span>
        ))}
      </div>

      <div className="side__section">
        <div className="side__label">Shortcuts</div>
        <Link href="/runs/new" className="side__item">
          <span className="ic">
            <IcPlus />
          </span>
          New run
          <span className="kbd">N</span>
        </Link>
        <span className="side__item">
          <span className="ic">
            <IcSearch />
          </span>
          Search
          <span className="kbd">/</span>
        </span>
      </div>

      <div className="side__footer">
        <div className="side__avatar">YO</div>
        <div className="side__who">
          <div>operator</div>
          <small>@you · local</small>
        </div>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Header />
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}
