import Phaser from 'phaser';

import { isAssetLoaded } from './AssetLoadGuards';
import { AssetLoadPlan, AssetRequest } from './AssetLoadPlan';

export function queueAssetLoad(scene: Phaser.Scene, asset: AssetRequest): void {
  switch (asset.type) {
    case 'image':
      scene.load.image(asset.key, asset.path);
      break;
    case 'spritesheet':
      scene.load.spritesheet(asset.key, asset.path, {
        frameWidth: asset.frameWidth,
        frameHeight: asset.frameHeight,
        endFrame: asset.endFrame,
      });
      break;
    case 'audio':
      scene.load.audio(asset.key, asset.path);
      break;
    case 'json':
      scene.load.json(asset.key, asset.path);
      break;
    default:
      break;
  }
}

export function queueLoadPlan(scene: Phaser.Scene, plan: AssetLoadPlan): void {
  for (const asset of plan.assets) {
    if (isAssetLoaded(scene, asset)) {
      continue;
    }

    queueAssetLoad(scene, asset);
  }
}
