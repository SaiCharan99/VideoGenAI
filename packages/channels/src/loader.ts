import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { channelConfigSchema, type ChannelConfig } from './schema.js';

const CONFIGS_DIR = join(fileURLToPath(import.meta.url), '..', '..', 'configs');

export function loadChannel(channelId: string): ChannelConfig {
  const filePath = join(CONFIGS_DIR, `${channelId}.yaml`);
  let raw: unknown;
  try {
    raw = yaml.load(readFileSync(filePath, 'utf8'));
  } catch {
    throw new Error(`Channel config not found: ${channelId} (looked in ${filePath})`);
  }
  const result = channelConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid channel config for "${channelId}":\n${result.error.toString()}`);
  }
  return result.data;
}
