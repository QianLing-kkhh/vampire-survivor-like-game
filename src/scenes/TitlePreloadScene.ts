import Phaser from 'phaser';

import {
  ART_MANIFEST_CACHE_KEY,
  buildTitleLoadPlan,
  getArtManifestVersion,
  parseArtManifestAssets,
  resolveArtManifestPath,
} from '../assets/AssetManifest';
import { ExternalArtRegistry } from '../assets/ExternalArtRegistry';
import { queueLoadPlan } from '../assets/AssetLoadRegistry';
import { SettingsManager } from '../settings/SettingsManager';

export class TitlePreloadScene extends Phaser.Scene {
  constructor() {
    super('TitlePreloadScene');
  }

  preload(): void {
    ExternalArtRegistry.clear();
    this.loadArtManifestBackedTitlePlan();
  }

  create(): void {
    ExternalArtRegistry.loadManifest(this);
    this.scene.start('TitleScene');
  }

  private loadArtManifestBackedTitlePlan(): void {
    const settings = SettingsManager.getDisplay();
    const manifestPath = resolveArtManifestPath(settings.assetStyle);
    let queuedPlan = false;
    const queueFallbackPlan = (): void => {
      if (queuedPlan) {
        return;
      }

      queuedPlan = true;
      queueLoadPlan(this, buildTitleLoadPlan(settings));
    };

    const queueManifestPlan = (): void => {
      if (queuedPlan) {
        return;
      }

      const manifest = this.cache.json.get(ART_MANIFEST_CACHE_KEY);
      const manifestAssets = parseArtManifestAssets(manifest);

      if (manifestAssets.length === 0) {
        console.warn(`[art] Invalid or empty title art manifest: ${manifestPath}; using built-in title art list.`);
        queueFallbackPlan();
        return;
      }

      queuedPlan = true;
      queueLoadPlan(
        this,
        buildTitleLoadPlan(settings, manifestAssets, getArtManifestVersion(manifest)),
      );
    };

    this.cache.json.remove(ART_MANIFEST_CACHE_KEY);
    this.load.once(`filecomplete-json-${ART_MANIFEST_CACHE_KEY}`, queueManifestPlan);
    this.load.once('loaderror', (file: { key?: string }) => {
      if (file.key !== ART_MANIFEST_CACHE_KEY) {
        return;
      }

      console.warn(`[art] Title art manifest failed to load: ${manifestPath}; using built-in title art list.`);
      queueFallbackPlan();
    });
    this.load.json(ART_MANIFEST_CACHE_KEY, manifestPath);
  }
}
