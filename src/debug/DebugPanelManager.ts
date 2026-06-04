import Phaser from 'phaser';

import { SettingsManager } from '../settings/SettingsManager';

import { DebugPanel } from './DebugPanel';
import { DebugPanelData } from './DebugPanelData';

export class DebugPanelManager {
  private static readonly UPDATE_INTERVAL_MS = 500;

  private panel?: DebugPanel;
  private lastUpdateTimeMs = Number.NEGATIVE_INFINITY;
  private readonly unsubscribeSettings: () => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.unsubscribeSettings = SettingsManager.subscribe((domain) => {
      if (domain === 'developer') {
        this.syncVisibility();
      }
    });
    this.syncVisibility();
  }

  update(data: DebugPanelData): void {
    const settings = SettingsManager.getDeveloper();

    if (!settings.showDebugPanel) {
      this.panel?.setVisible(false);
      return;
    }

    if (!this.panel) {
      this.panel = new DebugPanel(this.scene);
    }

    this.panel.setVisible(true);

    if (this.scene.time.now - this.lastUpdateTimeMs < DebugPanelManager.UPDATE_INTERVAL_MS) {
      return;
    }

    this.lastUpdateTimeMs = this.scene.time.now;
    this.panel.update(data, settings);
  }

  destroy(): void {
    this.unsubscribeSettings();
    this.panel?.destroy();
    this.panel = undefined;
  }

  private syncVisibility(): void {
    const settings = SettingsManager.getDeveloper();
    this.panel?.setVisible(settings.showDebugPanel);
  }
}

