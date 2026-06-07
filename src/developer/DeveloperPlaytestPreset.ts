import Phaser from 'phaser';

import { ContentBootstrap } from '../content/ContentBootstrap';
import { SelectionManager } from '../selection/SelectionManager';
import { RANDOM_UNLOCKED_CHARACTER_ID, RANDOM_UNLOCKED_STAGE_ID } from '../selection/SelectionState';
import { SettingsManager } from '../settings/SettingsManager';
import { UnlockManager } from '../unlock/UnlockManager';

export class DeveloperPlaytestPreset {
  static startFullAutoTestRun(scene: Phaser.Scene): void {
    this.unlockAllPlayableContent();
    this.applyFullAutoTestSettings();
    SelectionManager.clearChallengeSelection();
    SelectionManager.setCharacterId(RANDOM_UNLOCKED_CHARACTER_ID);
    SelectionManager.setStageId(RANDOM_UNLOCKED_STAGE_ID);
    scene.scene.start('RunPreloadScene');
  }

  static unlockAllPlayableContent(): void {
    ContentBootstrap.ensureInitialized();
    UnlockManager.enableTemporaryPlaytestUnlockAll();
  }

  static applyFullAutoTestSettings(): void {
    SettingsManager.updateGameplay({
      autoMovement: true,
      autoUpgrade: true,
      autoOpenTreasure: true,
      fastMode: true,
    });
    SettingsManager.updateDeveloper({
      autoRestartEnabled: true,
      csvLoggingEnabled: true,
      playtestMode: true,
      showDebugLogs: true,
      showDebugPanel: true,
    });
  }
}
