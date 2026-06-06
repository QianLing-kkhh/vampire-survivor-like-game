import Phaser from 'phaser';

import { AssetRequest } from './AssetLoadPlan';

export function isAssetLoaded(scene: Phaser.Scene, asset: AssetRequest): boolean {
  switch (asset.type) {
    case 'image':
    case 'spritesheet':
      return scene.textures.exists(asset.key);
    case 'audio':
      return scene.cache.audio.exists(asset.key);
    case 'json':
      return scene.cache.json.exists(asset.key);
    default:
      return false;
  }
}
