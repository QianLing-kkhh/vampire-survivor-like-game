import Phaser from 'phaser';

import { ContentBootstrap } from '../content/ContentBootstrap';
import { ContentRegistry } from '../content/ContentRegistry';
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

    ContentRegistry.listCharacters().forEach((character) => {
      UnlockManager.unlock('character', character.id);
    });
    ContentRegistry.listStages().forEach((stage) => {
      UnlockManager.unlock('stage', stage.id);
    });
    ContentRegistry.listMaps().forEach((map) => {
      UnlockManager.unlock('map', map.id);
    });
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
