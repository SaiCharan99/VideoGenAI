import type { AssetManifest, Script, Storyboard } from '@videogenai/types';
import type { ComponentType } from 'react';
import { Composition } from 'remotion';
import { KineticExplainer } from './KineticExplainer.js';
import type { KineticExplainerProps } from './KineticExplainer.js';

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

// Remotion 4's Composition component is typed against Record<string,unknown>.
// We cast to satisfy the API while preserving our typed defaultProps / calculateMetadata.
const TypedComposition = Composition as unknown as (props: {
  id: string;
  component: ComponentType<KineticExplainerProps>;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  defaultProps: KineticExplainerProps;
  calculateMetadata: (opts: { props: KineticExplainerProps }) => { durationInFrames: number };
}) => null;

const previewScript: Script = {
  title: 'Preview',
  description: 'Remotion Studio preview',
  lines: [{ scene: 1, text: 'Preview scene', source_ids: [] }],
  estimated_duration_seconds: 5,
};

const previewStoryboard: Storyboard = {
  scenes: [
    {
      scene: 1,
      duration_seconds: 5,
      visual_kind: 'kinetic_text',
      visual_description: 'Preview',
      text_overlay: 'VideoGenAI — Kinetic Explainer',
    },
  ],
};

const previewAssets: AssetManifest = { assets: [] };

export function RemotionRoot() {
  return (
    <TypedComposition
      id="KineticExplainer"
      component={KineticExplainer}
      durationInFrames={FPS * 5}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{
        script: previewScript,
        storyboard: previewStoryboard,
        assets: previewAssets,
        channelId: 'latest-tech-explained',
      }}
      calculateMetadata={({ props }) => {
        const totalSeconds = props.storyboard.scenes.reduce(
          (sum, s) => sum + s.duration_seconds,
          0,
        );
        return { durationInFrames: Math.max(1, Math.round(totalSeconds * FPS)) };
      }}
    />
  );
}
