import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ChannelTheme } from '../themes/index.js';

interface Props {
  text: string;
  theme: ChannelTheme;
}

export function TextCard({ text, theme }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = fps * 0.3;
  const easeOut = Easing.out((t: number) => Easing.ease(t));
  const opacity = interpolate(frame, [0, fadeIn], [0, 1], {
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const y = interpolate(frame, [0, fadeIn], [28, 0], {
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 160px',
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          color: theme.text,
          fontFamily: theme.font,
          fontSize: 68,
          fontWeight: 700,
          lineHeight: 1.2,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </div>
  );
}
