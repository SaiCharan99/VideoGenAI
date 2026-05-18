export interface ChannelTheme {
  bg: string;
  accent: string;
  text: string;
  textSecondary: string;
  font: string;
  motionIntensity: 'snappy' | 'balanced';
}

const THEMES: Record<string, ChannelTheme> = {
  'aussie-politics-explained': {
    bg: '#0B2545',
    accent: '#FFD700',
    text: '#F4F4F4',
    textSecondary: 'rgba(244,244,244,0.6)',
    font: 'Inter, sans-serif',
    motionIntensity: 'balanced',
  },
  'latest-tech-explained': {
    bg: '#0F0F0F',
    accent: '#00E5FF',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.55)',
    font: '"JetBrains Mono", monospace',
    motionIntensity: 'snappy',
  },
};

const FALLBACK_THEME: ChannelTheme = THEMES['latest-tech-explained']!;

export function getTheme(channelId: string): ChannelTheme {
  return THEMES[channelId] ?? FALLBACK_THEME;
}
