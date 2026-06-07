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
import { I18n } from '../i18n/I18n';
import { SettingsManager } from '../settings/SettingsManager';
import { LoadingOverlay } from '../ui/LoadingOverlay';

export class TitlePreloadScene extends Phaser.Scene {
  private loadingOverlay?: LoadingOverlay;

  constructor() {
    super('TitlePreloadScene');
  }

  preload(): void {
    this.createLoadingOverlay(I18n.t('loading.titleAssets'));
    ExternalArtRegistry.clear();
    this.loadArtManifestBackedTitlePlan();
  }

  create(): void {
    this.loadingOverlay?.setProgress(1);
    this.loadingOverlay?.setMessage(I18n.t('loading.complete'));
    ExternalArtRegistry.loadManifest(this);
    this.loadingOverlay?.destroy();
    this.loadingOverlay = undefined;
    this.scene.start('TitleScene');
  }

  private createLoadingOverlay(message: string): void {
    this.loadingOverlay?.destroy();
    this.loadingOverlay = new LoadingOverlay(this, {
      title: I18n.t('loading.title'),
      message,
    });
    this.load.on('progress', this.handleLoadProgress, this);
    this.load.on('fileprogress', this.handleFileProgress, this);
    this.load.on('filecomplete', this.handleFileComplete, this);
    this.load.on('loaderror', this.handleLoadError, this);
    this.load.once('complete', this.cleanupLoaderListeners, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupLoaderListeners();
      this.loadingOverlay?.destroy();
      this.loadingOverlay = undefined;
    });
  }

  private handleLoadProgress(value: number): void {
    this.loadingOverlay?.setProgress(value);
  }

  private handleFileProgress(file: { key?: string }): void {
    if (file.key) {
      this.loadingOverlay?.setCurrentFile(file.key);
    }
  }

  private handleFileComplete(key: string): void {
    this.loadingOverlay?.setCurrentFile(key);
  }

  private handleLoadError(file: { key?: string }): void {
    this.loadingOverlay?.setMessage(I18n.t('loading.failedAsset', { key: file.key ?? 'unknown' }));
  }

  private cleanupLoaderListeners(): void {
    this.load.off('progress', this.handleLoadProgress, this);
    this.load.off('fileprogress', this.handleFileProgress, this);
    this.load.off('filecomplete', this.handleFileComplete, this);
    this.load.off('loaderror', this.handleLoadError, this);
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
