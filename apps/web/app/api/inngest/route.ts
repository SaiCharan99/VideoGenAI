import { inngest, pipelineRun } from '@videogenai/pipeline';
import { serve } from 'inngest/next';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [pipelineRun],
});
