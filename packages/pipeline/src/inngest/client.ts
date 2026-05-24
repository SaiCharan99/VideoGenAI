import { EventSchemas, Inngest } from 'inngest';
import type { Script, Storyboard } from '@videogenai/types';

export interface PipelineStartEvent {
  name: 'videogenai/run.start';
  data: { runId: string; channelId: string; inputText: string };
}

export interface StageResponseEvent {
  name: `videogenai/stage.${string}.response`;
  data: {
    runId: string;
    action: 'approved' | 'revise';
    editedOutput?: unknown;
    feedback?: string;
  };
}

export interface RunResumedEvent {
  name: 'videogenai/run.resumed';
  data: { runId: string };
}

export interface RunInjectEvent {
  name: 'videogenai/run.inject';
  data: {
    runId: string;
    channelId: string;
    script: Script;
    storyboard: Storyboard;
  };
}

type VideoGenAIEvents = PipelineStartEvent | StageResponseEvent | RunResumedEvent | RunInjectEvent;

export const inngest = new Inngest({
  id: 'videogenai',
  schemas: new EventSchemas().fromUnion<VideoGenAIEvents>(),
});
