import Phaser from 'phaser';

import { DebugDataCollector } from '../../debug/DebugDataCollector';
import type { GameplayContext } from '../../gameplay/GameplayContext';
import { SettingsManager } from '../../settings/SettingsManager';

export class DebugPanelPresenter {
  private readonly debugDataCollector = new DebugDataCollector();

  emit(scene: Phaser.Scene, gameplayContext: GameplayContext | undefined): void {
    if (!gameplayContext) {
      return;
    }

    scene.scene.get('UIScene').events.emit(
      'UpdateDebugPanel',
      this.debugDataCollector.collect(gameplayContext),
    );
  }

  toggle(): void {
    const developerSettings = SettingsManager.getDeveloper();

    SettingsManager.updateDeveloper({
      showDebugPanel: !developerSettings.showDebugPanel,
    });
  }
}
