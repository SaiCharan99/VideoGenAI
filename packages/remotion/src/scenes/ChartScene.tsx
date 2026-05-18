import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ChannelTheme } from '../themes/index.js';

interface Props {
  visualDescription: string;
  textOverlay: string | null;
  theme: ChannelTheme;
}

// Placeholder bar heights — in a future iteration these come from structured chart data in the storyboard
const PLACEHOLDER_BARS = [0.82, 0.58, 0.94, 0.45, 0.71, 0.63];

export function ChartScene({ visualDescription, textOverlay, theme }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: theme.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 160px',
        gap: 48,
      }}
    >
      {textOverlay && (
        <div
          style={{
            color: theme.text,
            fontFamily: theme.font,
            fontSize: 50,
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          {textOverlay}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, height: 340, width: '100%' }}>
        {PLACEHOLDER_BARS.map((h, i) => {
          const delay = i * 3;
          const barH = interpolate(frame, [delay, delay + fps * 0.55], [0, h * 340], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const isFirst = i === 0;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: barH,
                  background: isFirst ? theme.accent : `${theme.accent}70`,
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.1s',
                }}
              />
            </div>
          );
        })}
      </div>

      <div
        style={{
          color: theme.textSecondary,
          fontFamily: theme.font,
          fontSize: 22,
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
