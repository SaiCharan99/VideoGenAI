'use client';

import { useEffect, useState } from 'react';

type Variant = 'dark' | 'light' | 'mono-black' | 'mono-white';

interface Props {
  variant?: Variant;
  animated?: boolean;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

const BARS = [
  { x: 0, y: 2, h: 96 },
  { x: 12, y: 10, h: 80 },
  { x: 24, y: 20, h: 60 },
  { x: 36, y: 30, h: 40 },
  { x: 48, y: 38, h: 24 },
  { x: 60, y: 38, h: 24 },
  { x: 72, y: 30, h: 40 },
  { x: 84, y: 20, h: 60 },
  { x: 96, y: 10, h: 80 },
  { x: 108, y: 2, h: 96 },
] as const;

const COLORS: Record<Variant, { base: string; accent: string }> = {
  dark: { base: '#f5f6f8', accent: '#00e5ff' },
  light: { base: '#0a0a0c', accent: '#0099b3' },
  'mono-black': { base: '#0a0a0c', accent: '#0a0a0c' },
  'mono-white': { base: '#f5f6f8', accent: '#f5f6f8' },
};

function keyTimes(i: number): string {
  if (i === 0) return '0;0.1;1';
  if (i === 9) return '0;0.9;1';
  return `0;${(i * 0.1).toFixed(1)};${((i + 1) * 0.1).toFixed(1)};1`;
}

function animValues(i: number, base: string, accent: string): string {
  if (i === 0) return `${accent};${base};${base}`;
  if (i === 9) return `${base};${accent};${base}`;
  return `${base};${accent};${base};${base}`;
}

interface WordmarkProps {
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

/* Geometric VGAI letterforms extracted from the brand lockup SVG */
export function VgaiWordmark({ height = 18, className, style }: WordmarkProps) {
  const sw = 12;
  const cap: React.SVGProps<SVGPathElement> = {
    stroke: 'currentColor',
    strokeWidth: sw,
    strokeLinecap: 'butt',
    strokeLinejoin: 'miter',
    strokeMiterlimit: 4,
    fill: 'none',
  };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 254 80"
      aria-hidden="true"
      style={{ height, width: 'auto', display: 'block', overflow: 'visible', ...style }}
      className={className}
    >
      {/* V */}
      <g transform="translate(0,0)">
        <path d="M 6 0 L 28 80 L 50 0" {...cap} />
      </g>
      {/* G */}
      <g transform="translate(68,0)">
        <path d="M 50 14 L 50 0 L 0 0 L 0 80 L 50 80 L 50 40 L 28 40" {...cap} />
      </g>
      {/* A */}
      <g transform="translate(136,0)">
        <path d="M 6 80 L 28 0 L 50 80" {...cap} />
        <path d="M 14 50 L 42 50" {...cap} />
      </g>
      {/* I */}
      <g transform="translate(204,0)">
        <path d="M 6 0 L 50 0" {...cap} />
        <path d="M 28 0 L 28 80" {...cap} />
        <path d="M 6 80 L 50 80" {...cap} />
      </g>
    </svg>
  );
}

export function VgaiIcon({
  variant = 'dark',
  animated = false,
  height = 24,
  className,
  style,
}: Props) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (!animated) {
      setShouldAnimate(false);
      return;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldAnimate(!mq.matches);
    const handler = (e: MediaQueryListEvent) => setShouldAnimate(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [animated]);

  const { base, accent } = COLORS[variant];
  const isMono = variant === 'mono-black' || variant === 'mono-white';
  const staticAccentIdx = 4;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 116 100"
      role="img"
      aria-label="VGAI"
      style={{ height, width: 'auto', display: 'block', ...style }}
      className={className}
    >
      {BARS.map((b, i) => {
        const fill = !isMono && !shouldAnimate && i === staticAccentIdx ? accent : base;
        return (
          <rect key={i} x={b.x} y={b.y} width={8} height={b.h} rx={1} fill={fill}>
            {shouldAnimate && (
              <animate
                attributeName="fill"
                calcMode="discrete"
                keyTimes={keyTimes(i)}
                values={animValues(i, base, accent)}
                dur="2.4s"
                repeatCount="indefinite"
              />
            )}
          </rect>
        );
      })}
    </svg>
  );
}
