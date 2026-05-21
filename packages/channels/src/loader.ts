import { channelConfigSchema, type ChannelConfig } from './schema.js';

// Inline registry — avoids readFileSync/import.meta.url which breaks when bundled by Next.js/webpack.
// The YAML files in configs/ remain the canonical source of truth for documentation and validation.
const REGISTRY: Record<string, unknown> = {
  'aussie-politics-explained': {
    channel_id: 'aussie-politics-explained',
    display_name: 'Aussie Politics Explained for Dummies',
    audience: {
      description: 'Australians age 18-35 new to politics',
      assumed_knowledge_level: 'low',
    },
    tone: {
      voice: 'explainer',
      notes:
        'Casual, no condescension. Acknowledge that politics is confusing. Never editorialize. Attribute every claim. Present contested issues by naming all major positions and their sources.',
    },
    length_target_seconds: [180, 420],
    research: {
      min_sources: 4,
      recency_window_days: 14,
      require_primary_sources: true,
      source_balance: [
        'ABC News',
        'Sydney Morning Herald',
        'The Australian',
        'The Guardian Australia',
        'parliamentary Hansard / government primary sources',
      ],
      blocked_sources: [],
    },
    bias_rules: [
      'Present claims with attribution; never state a contested claim as fact.',
      'If a claim is contested, show all major positions with their sources.',
      'Avoid loaded terms ("slammed", "destroyed", "exposed"); use neutral verbs.',
      'Provide historical context when a term or institution is first named.',
      'Never describe a policy as "good" or "bad"; describe what it does and who says what about it.',
    ],
    jargon: {
      explain_threshold: 'anything a Year 12 student would not know',
      include_history: true,
    },
    visual_style: {
      template: 'kinetic-explainer',
      palette: ['#0B2545', '#FFD700', '#F4F4F4'],
      font: 'Inter',
      motion_intensity: 'balanced',
      broll_policy: 'mixed',
    },
    publish: {
      auto_upload: false,
      shorts_variant: true,
      description_template:
        '{summary}\n\nSources:\n{source_list}\n\nThis video uses AI-generated narration and animation. Editorial decisions and source curation are human-reviewed.',
    },
  },

  'latest-tech-explained': {
    channel_id: 'latest-tech-explained',
    display_name: 'Latest Tech Explained',
    audience: {
      description: 'Curious non-engineers who want to understand what just shipped',
      assumed_knowledge_level: 'medium',
    },
    tone: {
      voice: 'casual',
      notes:
        'Conversational and energetic. Concrete examples over jargon. What does this actually mean for a normal person?',
    },
    length_target_seconds: [120, 300],
    research: {
      min_sources: 3,
      recency_window_days: 7,
      require_primary_sources: true,
      source_balance: [
        'vendor announcement or official documentation',
        'independent reporting',
        'hands-on review or technical deep-dive',
      ],
      blocked_sources: [],
    },
    bias_rules: [
      'Distinguish announced features from shipping features.',
      'Flag marketing claims as such; do not repeat them as fact.',
      'Include independent assessments alongside vendor claims.',
    ],
    jargon: {
      explain_threshold: 'any technical term outside common consumer usage',
      include_history: false,
    },
    visual_style: {
      template: 'kinetic-explainer',
      palette: ['#0F0F0F', '#00E5FF', '#FFFFFF'],
      font: 'JetBrains Mono',
      motion_intensity: 'snappy',
      broll_policy: 'generated_allowed',
    },
    publish: {
      auto_upload: false,
      shorts_variant: true,
      description_template:
        '{summary}\n\nSources:\n{source_list}\n\nAI-generated narration and animation. Editorially reviewed.',
    },
  },

  'pitch-video': {
    channel_id: 'pitch-video',
    display_name: 'Pitch Video',
    audience: {
      description: 'Construction industry decision-makers and investors evaluating SiteSpace',
      assumed_knowledge_level: 'medium',
    },
    tone: {
      voice: 'professional',
      notes:
        'Confident, clear, solution-focused. Australian audience. No fluff — every sentence earns its place.',
    },
    length_target_seconds: [120, 200],
    research: {
      min_sources: 0,
      recency_window_days: 365,
      require_primary_sources: false,
      source_balance: [],
      blocked_sources: [],
    },
    bias_rules: [
      'This is a promotional video — present the product capabilities accurately.',
      'Do not make unverifiable claims about market share or competitor comparisons.',
    ],
    jargon: {
      explain_threshold: 'construction-specific acronyms only',
      include_history: false,
    },
    visual_style: {
      template: 'kinetic-explainer',
      palette: ['#0D1F2D', '#00C5B5', '#FFFFFF'],
      font: 'Inter',
      motion_intensity: 'smooth',
      broll_policy: 'generated_allowed',
    },
    publish: {
      auto_upload: false,
      shorts_variant: false,
      description_template: '{summary}\n\nBook a 15-minute demo at sitespace.com.au',
    },
  },
};

export function loadChannel(channelId: string): ChannelConfig {
  const raw = REGISTRY[channelId];
  if (!raw)
    throw new Error(
      `Unknown channel: "${channelId}". Available: ${Object.keys(REGISTRY).join(', ')}`,
    );
  const result = channelConfigSchema.safeParse(raw);
  if (!result.success)
    throw new Error(`Invalid channel config for "${channelId}":\n${result.error.toString()}`);
  return result.data;
}

export function listChannels(): ChannelConfig[] {
  return Object.values(REGISTRY).map((raw) => channelConfigSchema.parse(raw));
}
