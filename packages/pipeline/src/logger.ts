import { type Logger } from '@videogenai/types';

export function createLogger(runId: string, stageId: string): Logger {
  const prefix = `[${runId.slice(0, 8)}/${stageId}]`;
  return {
    info: (msg, meta) => console.info(`${prefix} INFO ${msg}`, meta ? JSON.stringify(meta) : ''),
    warn: (msg, meta) => console.warn(`${prefix} WARN ${msg}`, meta ? JSON.stringify(meta) : ''),
    error: (msg, meta) => console.error(`${prefix} ERROR ${msg}`, meta ? JSON.stringify(meta) : ''),
  };
}
