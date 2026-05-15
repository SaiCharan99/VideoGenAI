interface IconProps {
  size?: number;
  className?: string;
}

const svg = (children: React.ReactNode, { size = 14, className }: IconProps = {}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

export const IcRuns = (p: IconProps) =>
  svg(
    <>
      <path d="M3 6h13M3 12h13M3 18h9" />
      <circle cx="20" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>,
    p,
  );

export const IcChannels = (p: IconProps) =>
  svg(
    <>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M8 21h8M12 18v3" />
    </>,
    p,
  );

export const IcPlus = (p: IconProps) => svg(<path d="M12 5v14M5 12h14" />, p);

export const IcSearch = (p: IconProps) =>
  svg(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>,
    p,
  );

export const IcChev = (p: IconProps) => svg(<path d="m9 6 6 6-6 6" />, p);

export const IcChevDown = (p: IconProps) => svg(<path d="m6 9 6 6 6-6" />, p);

export const IcCheck = (p: IconProps) => svg(<path d="M5 12.5 10 17l9-10" />, p);

export const IcX = (p: IconProps) => svg(<path d="M6 6l12 12M6 18 18 6" />, p);

export const IcExt = (p: IconProps) =>
  svg(
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
    </>,
    p,
  );

export const IcCopy = (p: IconProps) =>
  svg(
    <>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M4 15V5a1 1 0 0 1 1-1h10" />
    </>,
    p,
  );

export const IcRefresh = (p: IconProps) =>
  svg(
    <>
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </>,
    p,
  );

export const IcFilter = (p: IconProps) => svg(<path d="M3 5h18l-7 9v6l-4-2v-4z" />, p);

export const IcAlert = (p: IconProps) =>
  svg(
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z" />
    </>,
    p,
  );

export const IcTerminal = (p: IconProps) =>
  svg(
    <>
      <path d="m4 17 6-6-6-6" />
      <path d="M12 19h8" />
    </>,
    p,
  );

export const IcBolt = (p: IconProps) => svg(<path d="M13 2 3 14h7l-1 8 10-12h-7z" />, p);

export const IcClock = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>,
    p,
  );

export const IcEye = (p: IconProps) =>
  svg(
    <>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </>,
    p,
  );

export const IcBrackets = (p: IconProps) => svg(<path d="M7 4H4v16h3M17 4h3v16h-3" />, p);

export const IcSparkle = (p: IconProps) =>
  svg(
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />,
    p,
  );

export const IcArrowR = (p: IconProps) =>
  svg(
    <>
      <path d="m12 5 7 7-7 7" />
      <path d="M5 12h14" />
    </>,
    p,
  );

export const IcSettings = (p: IconProps) =>
  svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
    p,
  );
