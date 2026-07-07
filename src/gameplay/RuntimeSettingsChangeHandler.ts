import type { PlaytestSettingName, PlaytestSettingsState } from '../settings/PlaytestSettings';

import type { GameplayContext } from './GameplayContext';
import { RuntimeSettingsSynchronizer } from './RuntimeSettingsSynchronizer';

export interface RuntimeSettingsChangeContext {
  gameplayContext?: GameplayContext;
  previousSettings: PlaytestSettingsState;
  nextSettings: PlaytestSettingsState;
  settingName: PlaytestSettingName;
  configuredGameplayTimeScale: number;
  gameTimeSeconds: number;
  runId: string;
  isGameplayPaused: boolean;
  isStrategyPanelPauseActive: boolean;
  isUpgradeSelectionActive: boolean;
  isEndlessStarted: boolean;
  isGameOver: boolean;
  resetSceneClocks: () => void;
  clearPlayerMoveDirection: () => void;
  setVirtualJoystickActive: (active: boolean) => void;
  shouldVirtualJoystickBeActive: () => boolean;
  refreshLevelUpPanelAutoSelection: () => void;
  startEndlessIfBossAlreadyKilled: () => void;
  endGameWithVictory: () => void;
  syncCurrentBgm: () => void;
  emitHUDState: () => void;
}

export class RuntimeSettingsChangeHandler {
  private readonly synchronizer = new RuntimeSettingsSynchronizer();

  handle(context: RuntimeSettingsChangeContext): void {
    const syncResult = this.synchronizer.sync({
      gameplayContext: context.gameplayContext,
      previousSettings: context.previousSettings,
      nextSettings: context.nextSettings,
      settingName: context.settingName,
      configuredGameplayTimeScale: context.configuredGameplayTimeScale,
    });
    context.resetSceneClocks();
    context.gameplayContext?.gameEventBus.emit('ui.settingsChanged', {
      settingName: context.settingName,
      gameTimeSeconds: context.gameTimeSeconds,
    }, {
      gameTimeSeconds: context.gameTimeSeconds,
      runId: context.runId,
    });

    if (syncResult.shouldHandleAutoMovement) {
      this.handleAutoMovementChanged(context);
    }

    if (syncResult.shouldHandleAutoUpgrade) {
      this.handleAutoUpgradeChanged(context);
    }

    if (syncResult.shouldHandleEndlessMode) {
      this.handleEndlessModeChanged(context);
    }

    if (syncResult.shouldSyncBgm) {
      context.syncCurrentBgm();
    }

    if (syncResult.shouldEmitHud) {
      context.emitHUDState();
    }
  }

  private handleAutoMovementChanged(context: RuntimeSettingsChangeContext): void {
    if (!context.nextSettings.autoMovement) {
      context.clearPlayerMoveDirection();
    }

    if (
      !context.isGameplayPaused
      && !context.isStrategyPanelPauseActive
      && !context.isUpgradeSelectionActive
    ) {
      context.setVirtualJoystickActive(context.shouldVirtualJoystickBeActive());
    }

    if (context.previousSettings.autoMovement !== context.nextSettings.autoMovement) {
      context.emitHUDState();
    }
  }

  private handleAutoUpgradeChanged(context: RuntimeSettingsChangeContext): void {
    if (
      context.previousSettings.autoUpgrade !== context.nextSettings.autoUpgrade
      && context.isUpgradeSelectionActive
    ) {
      context.refreshLevelUpPanelAutoSelection();
    }
  }

  private handleEndlessModeChanged(context: RuntimeSettingsChangeContext): void {
    if (context.previousSettings.endlessMode === context.nextSettings.endlessMode) {
      return;
    }

    if (!context.nextSettings.endlessMode && context.isEndlessStarted && !context.isGameOver) {
      context.endGameWithVictory();
      return;
    }

    if (context.nextSettings.endlessMode) {
      context.startEndlessIfBossAlreadyKilled();
    }
  }
}
