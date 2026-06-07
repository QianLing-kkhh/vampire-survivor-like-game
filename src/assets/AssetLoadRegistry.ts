import Phaser from 'phaser';

import { PLAYER_ART_DIRECTIONS, getAnimationKeys } from './AssetManifest';
import { isAssetLoaded } from './AssetLoadGuards';
import { AssetLoadPlan, AssetRequest } from './AssetLoadPlan';

const loadedAssetSignatures = new WeakMap<Phaser.Game, Map<string, string>>();

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
  const signatures = getLoadedAssetSignatures(scene);

  for (const asset of plan.assets) {
    const signature = getAssetSignature(asset);
    const knownSignature = signatures.get(asset.key);
    const loaded = isAssetLoaded(scene, asset);

    if (loaded && knownSignature === signature) {
      continue;
    }

    if (loaded || hasCachedAsset(scene, asset)) {
      removeCachedAsset(scene, asset);
    }

    queueAssetLoad(scene, asset);
    signatures.set(asset.key, signature);
  }
}

function getLoadedAssetSignatures(scene: Phaser.Scene): Map<string, string> {
  const existing = loadedAssetSignatures.get(scene.game);

  if (existing) {
    return existing;
  }

  const signatures = new Map<string, string>();
  loadedAssetSignatures.set(scene.game, signatures);

  return signatures;
}

function getAssetSignature(asset: AssetRequest): string {
  switch (asset.type) {
    case 'spritesheet':
      return [
        asset.type,
        asset.path,
        asset.frameWidth,
        asset.frameHeight,
        asset.endFrame ?? '',
      ].join('|');
    default:
      return [asset.type, asset.path].join('|');
  }
}

function hasCachedAsset(scene: Phaser.Scene, asset: AssetRequest): boolean {
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

function removeCachedAsset(scene: Phaser.Scene, asset: AssetRequest): void {
  switch (asset.type) {
    case 'image':
    case 'spritesheet':
      removeAnimationsForTexture(scene, asset.key);
      if (scene.textures.exists(asset.key)) {
        scene.textures.remove(asset.key);
      }
      break;
    case 'audio':
      if (scene.cache.audio.exists(asset.key)) {
        scene.cache.audio.remove(asset.key);
      }
      break;
    case 'json':
      if (scene.cache.json.exists(asset.key)) {
        scene.cache.json.remove(asset.key);
      }
      break;
    default:
      break;
  }
}

function removeAnimationsForTexture(scene: Phaser.Scene, textureKey: string): void {
  for (const animationKey of getAnimationAliasKeys(textureKey)) {
    if (scene.anims.exists(animationKey)) {
      scene.anims.remove(animationKey);
    }
  }
}

function getAnimationAliasKeys(textureKey: string): string[] {
  const aliases = new Set<string>([
    textureKey,
    ...getAnimationKeys(textureKey),
  ]);

  if (textureKey === 'art_player_player_walk_sheet') {
    aliases.add('art_player_walk');
    aliases.add('art_player_idle');

    for (const direction of PLAYER_ART_DIRECTIONS) {
      aliases.add(`art_player_walk_${direction}`);
      aliases.add(`art_player_idle_${direction}`);
    }
  }

  const playerSkinWalkSheetMatch = textureKey.match(/^art_player_(.+)_walk_sheet$/);

  if (playerSkinWalkSheetMatch) {
    const skinId = playerSkinWalkSheetMatch[1];
    aliases.add(`art_player_${skinId}_walk`);
    aliases.add(`art_player_${skinId}_idle`);
  }

  return Array.from(aliases);
}
