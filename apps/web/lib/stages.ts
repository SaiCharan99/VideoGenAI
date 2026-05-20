export interface StageMeta {
  id: string;
  label: string;
  hasApproval: boolean;
  comingSoon?: boolean;
}

export const ALL_STAGES: StageMeta[] = [
  { id: 'brief', label: 'Brief', hasApproval: true },
  { id: 'research', label: 'Research', hasApproval: true },
  { id: 'jargon', label: 'Jargon', hasApproval: false },
  { id: 'script', label: 'Script', hasApproval: true },
  { id: 'fact-check', label: 'Fact-check', hasApproval: true },
  { id: 'storyboard', label: 'Storyboard', hasApproval: true },
  { id: 'assets', label: 'Assets', hasApproval: false },
  { id: 'render', label: 'Render', hasApproval: false },
  { id: 'qa', label: 'QA', hasApproval: true },
  { id: 'publish', label: 'Publish', hasApproval: false },
];

export const LIVE_STAGES = ALL_STAGES.filter((s) => !s.comingSoon);

export const STAGE_META = Object.fromEntries(ALL_STAGES.map((s) => [s.id, s])) as Record<
  string,
  StageMeta
>;

export const fmtDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const relTime = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  const s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
