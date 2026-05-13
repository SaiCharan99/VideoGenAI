import { EventSchemas, Inngest } from 'inngest';

export interface PipelineStartEvent {
  name: 'videogenai/run.start';
  data: { runId: string; channelId: string; inputText: string };
}

export interface StageApprovedEvent {
  name: 'videogenai/stage.approved';
  data: { runId: string; stageId: string };
}

type VideoGenAIEvents = PipelineStartEvent | StageApprovedEvent;

export const inngest = new Inngest({
  id: 'videogenai',
  schemas: new EventSchemas().fromUnion<VideoGenAIEvents>(),
});
