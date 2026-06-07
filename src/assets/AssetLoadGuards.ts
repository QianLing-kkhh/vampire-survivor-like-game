import Phaser from 'phaser';

import { AssetRequest } from './AssetLoadPlan';

export function isAssetLoaded(scene: Phaser.Scene, asset: AssetRequest): boolean {
  switch (asset.type) {
    case 'image':
      return scene.textures.exists(asset.key);
    case 'spritesheet':
      return isSpritesheetLoaded(scene, asset);
    case 'audio':
      return scene.cache.audio.exists(asset.key);
    case 'json':
      return scene.cache.json.exists(asset.key);
    default:
      return false;
  }
}

function isSpritesheetLoaded(
  scene: Phaser.Scene,
  asset: Extract<AssetRequest, { type: 'spritesheet' }>,
): boolean {
  if (!scene.textures.exists(asset.key)) {
    return false;
  }

  const endFrame = asset.endFrame ?? 0;

  for (let frame = 0; frame <= endFrame; frame += 1) {
    const textureFrame = scene.textures.getFrame(asset.key, frame);

    if (
      !textureFrame
      || textureFrame.width !== asset.frameWidth
      || textureFrame.height !== asset.frameHeight
    ) {
      return false;
    }
  }

  return true;
}
