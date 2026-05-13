# Channels

A channel is a YAML config file. The pipeline reads the config at run start and threads it through every stage. **No channel-specific code exists anywhere else in the system.**

## Adding a new channel

1. Create `packages/channels/configs/<channel-id>.yaml`.
2. Fill in every field required by the schema (`packages/channels/src/schema.ts`).
3. Run `pnpm channels:validate` to confirm it parses.
4. Reference the channel id from the cockpit when starting a new run.

That's it. No code changes.

## Schema (overview)

```yaml
channel_id: <kebab-case>
display_name: <human readable>

audience:
  description: <who is this for>
  assumed_knowledge_level: low | medium | high

tone:
  voice: casual | authoritative | playful | explainer
  notes: <free-form guidance for the scriptwriter>

length_target_seconds: [<min>, <max>]

research:
  min_sources: <int>
  recency_window_days: <int>
  require_primary_sources: <bool>
  source_balance: # required for any politically-charged channel
    - <source name or category>
    - ...
  blocked_sources: [] # optional deny-list

bias_rules: # plain-language rules the fact-checker enforces
  - <rule>
  - ...

jargon:
  explain_threshold: <description of who would not know the term>
  include_history: <bool>

visual_style:
  template: kinetic-explainer | <future templates>
  palette: ['#hex', ...]
  font: <font family>
  motion_intensity: subtle | balanced | snappy
  broll_policy: stock_preferred | mixed | generated_allowed

publish:
  auto_upload: <bool> # human approval still required until trust earned
  shorts_variant: <bool>
  description_template: <string>
```

## Example: `aussie-politics`

```yaml
channel_id: aussie-politics-explained
display_name: Aussie Politics Explained for Dummies

audience:
  description: Australians age 18-35 new to politics
  assumed_knowledge_level: low

tone:
  voice: explainer
  notes: |
    Casual, no condescension. Acknowledge that politics is confusing.
    Never editorialize. Attribute every claim.

length_target_seconds: [180, 420]

research:
  min_sources: 4
  recency_window_days: 14
  require_primary_sources: true
  source_balance:
    - ABC News
    - Sydney Morning Herald
    - The Australian
    - The Guardian Australia
    - parliamentary Hansard / government primary sources

bias_rules:
  - Present claims with attribution; never state a contested claim as fact.
  - If a claim is contested, show all major positions with their sources.
  - Avoid loaded terms ("slammed", "destroyed", "exposed"); use neutral verbs.
  - Provide historical context when a term or institution is named.

jargon:
  explain_threshold: anything a Year 12 student would not know
  include_history: true

visual_style:
  template: kinetic-explainer
  palette: ['#0B2545', '#FFD700', '#F4F4F4']
  font: Inter
  motion_intensity: balanced
  broll_policy: mixed

publish:
  auto_upload: false
  shorts_variant: true
  description_template: |
    {summary}

    Sources:
    {source_list}

    This video uses AI-generated narration and animation. Editorial decisions and source curation are human-reviewed.
```

## Example: `latest-tech`

```yaml
channel_id: latest-tech-explained
display_name: Latest Tech Explained

audience:
  description: Curious non-engineers who want to understand what just shipped
  assumed_knowledge_level: medium

tone:
  voice: casual
  notes: Conversational and energetic. Concrete examples over jargon.

length_target_seconds: [120, 300]

research:
  min_sources: 3
  recency_window_days: 7
  require_primary_sources: true
  source_balance: # tech doesn't need political balance, but does need primary
    - vendor announcement / official docs
    - independent reporting
    - hands-on review or technical deep-dive

bias_rules:
  - Distinguish announced features from shipping features.
  - Flag marketing claims as such; do not repeat them as fact.

jargon:
  explain_threshold: any technical term outside common consumer usage
  include_history: false

visual_style:
  template: kinetic-explainer
  palette: ['#0F0F0F', '#00E5FF', '#FFFFFF']
  font: JetBrains Mono
  motion_intensity: snappy
  broll_policy: generated_allowed

publish:
  auto_upload: false
  shorts_variant: true
  description_template: |
    {summary}

    Sources:
    {source_list}

    AI-generated narration and animation. Editorially reviewed.
```

## Anti-patterns

- **Don't** add `if (channel.id === '...') ...` in stage code. Add a schema field instead and check that.
- **Don't** rely on the channel id as anything other than an identifier. The behavior must come from explicit fields.
- **Don't** put prompts in the channel config. Prompts belong with their agents; channel configs feed _parameters_ into prompts.
