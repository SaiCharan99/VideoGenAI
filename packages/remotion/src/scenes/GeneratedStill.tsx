import { Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ChannelTheme } from '../themes/index.js';

interface Props {
  assetUrl: string | null;
  visualDescription: string;
  textOverlay: string | null;
  theme: ChannelTheme;
}

export function GeneratedStill({ assetUrl, visualDescription, textOverlay, theme }: Props) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Subtle Ken Burns zoom over scene duration
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.07], {
    extrapolateRight: 'clamp',
  });

  if (!assetUrl) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(135deg, ${theme.bg}, #0a0a0a)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: 80,
        }}
      >
        <div
          style={{
            color: theme.accent,
            fontFamily: theme.font,
            fontSize: 18,
            opacity: 0.5,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          [ai image]
        </div>
        <div
          style={{
            color: theme.textSecondary,
            fontFamily: theme.font,
            fontSize: 28,
            textAlign: 'center',
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          {visualDescription}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        background: '#000',
      }}
    >
      <Img
        src={assetUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />
      {textOverlay && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 80,
            right: 80,
            color: '#fff',
            fontFamily: theme.font,
            fontSize: 46,
            fontWeight: 700,
            textShadow: '0 2px 20px rgba(0,0,0,0.85)',
          }}
        >
          {textOverlay}
        </div>
      )}
    </div>
  );
}
