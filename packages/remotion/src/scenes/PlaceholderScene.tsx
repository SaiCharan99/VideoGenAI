import type { ChannelTheme } from '../themes/index.js';

interface Props {
  visualKind: string;
  visualDescription: string;
  theme: ChannelTheme;
}

export function PlaceholderScene({ visualKind, visualDescription, theme }: Props) {
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
        gap: 20,
        padding: 80,
      }}
    >
      <div
        style={{
          color: theme.accent,
          fontFamily: theme.font,
          fontSize: 16,
          opacity: 0.5,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        [{visualKind}]
      </div>
      <div
        style={{
          color: theme.textSecondary,
          fontFamily: theme.font,
          fontSize: 32,
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
