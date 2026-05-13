import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChannel } from './loader.js';

const CONFIGS_DIR = join(fileURLToPath(import.meta.url), '..', '..', 'configs');

const files = readdirSync(CONFIGS_DIR).filter((f) => f.endsWith('.yaml'));
let hasError = false;

for (const file of files) {
  const channelId = file.replace('.yaml', '');
  try {
    loadChannel(channelId);
    console.log(`  ✓ ${channelId}`);
  } catch (err) {
    console.error(`  ✗ ${channelId}: ${String(err)}`);
    hasError = true;
  }
}

if (hasError) process.exit(1);
