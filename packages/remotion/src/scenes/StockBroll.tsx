import { Img, Video } from 'remotion';
import type { ChannelTheme } from '../themes/index.js';

interface Props {
  assetUrl: string | null;
  visualDescription: string;
  textOverlay: string | null;
  theme: ChannelTheme;
}

export function StockBroll({ assetUrl, visualDescription, textOverlay, theme }: Props) {
  if (!assetUrl) {
    return <Placeholder label="stock footage" description={visualDescription} theme={theme} />;
  }

  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(assetUrl);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      {isVideo ? (
        <Video src={assetUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <Img src={assetUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      {textOverlay && <Scrim text={textOverlay} theme={theme} />}
    </div>
  );
}

function Scrim({ text, theme }: { text: string; theme: ChannelTheme }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '120px 80px 80px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.72))',
        color: '#fff',
        fontFamily: theme.font,
        fontSize: 46,
        fontWeight: 700,
        textShadow: '0 2px 16px rgba(0,0,0,0.6)',
      }}
    >
      {text}
    </div>
  );
}

function Placeholder({
  label,
  description,
  theme,
}: {
  label: string;
  description: string;
  theme: ChannelTheme;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, ${theme.bg} 0%, #111 100%)`,
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
          opacity: 0.55,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        [{label}]
      </div>
      <div
        style={{
          color: theme.textSecondary,
          fontFamily: theme.font,
          fontSize: 30,
          textAlign: 'center',
          maxWidth: 900,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </div>
  );
}
