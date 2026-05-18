import { EventSchemas, Inngest } from 'inngest';

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

type VideoGenAIEvents = PipelineStartEvent | StageResponseEvent | RunResumedEvent;

export const inngest = new Inngest({
  id: 'videogenai',
  schemas: new EventSchemas().fromUnion<VideoGenAIEvents>(),
});
