import Phaser from 'phaser';

import {
  EXTERNAL_ART_MANIFEST_CACHE_KEY,
  ExternalArtAsset,
  ExternalArtAssetDirection,
  ExternalArtAssetState,
  ExternalArtManifest,
} from './ExternalArtManifest';
import { ExternalArtValidator } from './ExternalArtValidator';

export class ExternalArtRegistry {
  private static manifest: ExternalArtManifest | null = null;
  private static manifestLoaded = false;

  static loadManifest(scene?: Phaser.Scene): ExternalArtManifest | null {
    if (this.manifestLoaded) {
      return this.manifest;
    }

    if (!scene) {
      this.manifestLoaded = true;
      this.manifest = null;
      return this.manifest;
    }

    try {
      const manifest = scene.cache.json.get(EXTERNAL_ART_MANIFEST_CACHE_KEY) as unknown;

      if (manifest === undefined || manifest === null) {
        this.manifestLoaded = true;
        this.manifest = null;
        return this.manifest;
      }

      this.setManifest(manifest);
    } catch (error) {
      console.warn('[external-art] Failed to read manifest.', error);
      this.manifestLoaded = true;
      this.manifest = null;
    }

    return this.manifest;
  }

  static setManifest(value: unknown): void {
    const result = ExternalArtValidator.validateManifest(value);

    for (const warning of result.warnings) {
      console.warn(`[external-art] ${warning}`);
    }

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.warn(`[external-art] ${error}`);
      }

      this.manifest = null;
      this.manifestLoaded = true;
      return;
    }

    this.manifest = value as ExternalArtManifest;
    this.manifestLoaded = true;
  }

  static clear(): void {
    this.manifest = null;
    this.manifestLoaded = false;
  }

  static getAssets(): readonly ExternalArtAsset[] {
    return this.manifest?.assets ?? [];
  }

  static getAssetByLogicalKey(logicalKey: string): ExternalArtAsset | undefined {
    return this.getAssets().find((asset) => asset.logicalKey === logicalKey);
  }

  static getPlayerSkinAsset(
    skinId: string,
    state: ExternalArtAssetState,
    direction: ExternalArtAssetDirection,
  ): ExternalArtAsset | undefined {
    return this.getAssets().find((asset) => (
      asset.category === 'player'
      && asset.skinId === skinId
      && asset.state === state
      && asset.direction === direction
    ));
  }

  static getPortrait(skinId: string): ExternalArtAsset | undefined {
    return this.getAssets().find((asset) => (
      asset.category === 'player'
      && asset.skinId === skinId
      && asset.type === 'portrait'
    ));
  }

  static getWeaponIcon(weaponId: string): ExternalArtAsset | undefined {
    return this.getAssets().find((asset) => (
      asset.category === 'weapon'
      && asset.targetId === weaponId
      && asset.type === 'icon'
    ));
  }

  static getEffect(effectId: string): ExternalArtAsset | undefined {
    return this.getAssets().find((asset) => (
      asset.category === 'effect'
      && asset.targetId === effectId
    ));
  }
}
