import type { AssetManifest, Script, Storyboard } from '@videogenai/types';
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import { SceneRouter } from './scenes/SceneRouter.js';
import { getTheme } from './themes/index.js';

export interface KineticExplainerProps {
  script: Script;
  storyboard: Storyboard;
  assets: AssetManifest;
  channelId: string;
}

export function KineticExplainer({ storyboard, assets, channelId }: KineticExplainerProps) {
  const { fps } = useVideoConfig();
  const theme = getTheme(channelId);

  let offset = 0;
  const sequences = storyboard.scenes.map((scene) => {
    const durationInFrames = Math.max(1, Math.round(scene.duration_seconds * fps));
    const from = offset;
    offset += durationInFrames;

    return (
      <Sequence
        key={scene.scene}
        from={from}
        durationInFrames={durationInFrames}
        name={`Scene ${scene.scene}`}
      >
        <AbsoluteFill>
          <SceneRouter scene={scene} assets={assets} theme={theme} />
        </AbsoluteFill>
      </Sequence>
    );
  });

  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      {assets.narration_url && <Audio src={assets.narration_url} />}
      {sequences}
    </AbsoluteFill>
  );
}
