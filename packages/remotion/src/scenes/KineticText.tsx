import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ChannelTheme } from '../themes/index.js';

interface Props {
  text: string;
  theme: ChannelTheme;
}

export function KineticText({ text, theme }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');
  const staggerFrames = theme.motionIntensity === 'snappy' ? fps * 0.055 : fps * 0.1;
  const springConfig =
    theme.motionIntensity === 'snappy'
      ? { damping: 32, stiffness: 220, mass: 0.5 }
      : { damping: 22, stiffness: 180, mass: 0.6 };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 140px',
      }}
    >
      <div
        style={{
          color: theme.text,
          fontFamily: theme.font,
          fontSize: 56,
          fontWeight: 600,
          lineHeight: 1.45,
          textAlign: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: 16,
          rowGap: 4,
        }}
      >
        {words.map((word, i) => {
          const delay = i * staggerFrames;
          const opacity = interpolate(frame, [delay, delay + fps * 0.22], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const translateY = spring({
            frame: frame - delay,
            fps,
            config: springConfig,
            durationInFrames: 18,
            from: 44,
            to: 0,
          });
          return (
            <span
              key={i}
              style={{ opacity, transform: `translateY(${translateY}px)`, display: 'inline-block' }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}
