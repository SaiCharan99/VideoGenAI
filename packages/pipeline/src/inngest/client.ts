import { EventSchemas, Inngest } from 'inngest';

interface Events {
  'videogenai/run.start': {
    data: { runId: string; channelId: string; inputText: string };
  };
  'videogenai/stage.approved': {
    data: { runId: string; stageId: string };
  };
}

export const inngest = new Inngest({
  id: 'videogenai',
  schemas: new EventSchemas().fromRecord<Events>(),
});

export type PipelineStartEvent = { name: 'videogenai/run.start' } & Events['videogenai/run.start'];
export type StageApprovedEvent = {
  name: 'videogenai/stage.approved';
} & Events['videogenai/stage.approved'];
