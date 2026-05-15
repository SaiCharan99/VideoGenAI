export interface ChannelConfig {
  id: string;
  name: string;
  short: string;
  audience: string;
  tone: string;
  duration: [number, number];
  palette: [string, string, string];
  sources: string[];
  motion: string;
}

export const CHANNELS: ChannelConfig[] = [
  {
    id: 'aussie-politics-explained',
    name: 'Aussie Politics Explained',
    short: 'Aussie Politics',
    audience: 'Australians 18–35, new to politics',
    tone: 'Casual explainer · neutral · no condescension',
    duration: [240, 420],
    palette: ['#0B2545', '#FFD700', '#F4F4F4'],
    sources: ['ABC News', 'SMH', 'The Australian', 'Guardian AU', 'Hansard'],
    motion: 'Balanced',
  },
  {
    id: 'latest-tech-explained',
    name: 'Latest Tech Explained',
    short: 'Latest Tech',
    audience: 'Curious non-engineers, what just shipped',
    tone: 'Conversational · energetic · concrete examples',
    duration: [180, 360],
    palette: ['#0F0F0F', '#00E5FF', '#FFFFFF'],
    sources: ['Vendor docs', 'Independent reporting', 'Hands-on review'],
    motion: 'Snappy',
  },
];

export const CHANNEL_MAP = Object.fromEntries(CHANNELS.map((c) => [c.id, c])) as Record<
  string,
  ChannelConfig
>;

export const fmtRange = ([a, b]: [number, number]) =>
  `${Math.round(a / 60)}–${Math.round(b / 60)} min`;
