import Phaser from 'phaser';

import { buildTitleLoadPlan } from '../assets/AssetManifest';
import { ExternalArtRegistry } from '../assets/ExternalArtRegistry';
import { queueLoadPlan } from '../assets/AssetLoadRegistry';
import { SettingsManager } from '../settings/SettingsManager';

export class TitlePreloadScene extends Phaser.Scene {
  constructor() {
    super('TitlePreloadScene');
  }

  preload(): void {
    ExternalArtRegistry.clear();
    queueLoadPlan(this, buildTitleLoadPlan(SettingsManager.getDisplay()));
  }

  create(): void {
    ExternalArtRegistry.loadManifest(this);
    this.scene.start('TitleScene');
  }
}
