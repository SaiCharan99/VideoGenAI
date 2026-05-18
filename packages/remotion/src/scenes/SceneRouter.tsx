import type { AssetManifest, StoryboardScene } from '@videogenai/types';
import type { ChannelTheme } from '../themes/index.js';
import { ChartScene } from './ChartScene.js';
import { GeneratedStill } from './GeneratedStill.js';
import { KineticText } from './KineticText.js';
import { PlaceholderScene } from './PlaceholderScene.js';
import { StockBroll } from './StockBroll.js';
import { TextCard } from './TextCard.js';

interface Props {
  scene: StoryboardScene;
  assets: AssetManifest;
  theme: ChannelTheme;
}

export function SceneRouter({ scene, assets, theme }: Props) {
  const asset = assets.assets.find((a) => a.scene === scene.scene && a.kind !== 'tts_audio');
  const assetUrl = asset && 'url' in asset ? (asset.url ?? null) : null;
  const overlay = scene.text_overlay ?? null;

  switch (scene.visual_kind) {
    case 'text_card':
      return <TextCard text={overlay ?? scene.visual_description} theme={theme} />;
    case 'kinetic_text':
      return <KineticText text={overlay ?? scene.visual_description} theme={theme} />;
    case 'stock_broll':
      return (
        <StockBroll
          assetUrl={assetUrl}
          visualDescription={scene.visual_description}
          textOverlay={overlay}
          theme={theme}
        />
      );
    case 'generated_still':
    case 'generated_clip':
      return (
        <GeneratedStill
          assetUrl={assetUrl}
          visualDescription={scene.visual_description}
          textOverlay={overlay}
          theme={theme}
        />
      );
    case 'chart':
      return (
        <ChartScene
          visualDescription={scene.visual_description}
          textOverlay={overlay}
          theme={theme}
        />
      );
    default:
      return (
        <PlaceholderScene
          visualKind={scene.visual_kind}
          visualDescription={scene.visual_description}
          theme={theme}
        />
      );
  }
}
