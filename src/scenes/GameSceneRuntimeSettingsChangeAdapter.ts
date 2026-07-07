import Phaser from 'phaser';

import type { GameplayContext } from '../gameplay/GameplayContext';
import {
  RuntimeSettingsChangeHandler,
  type RuntimeSettingsChangeContext,
} from '../gameplay/RuntimeSettingsChangeHandler';
import type { PhaserRuntimeTimeScale } from '../phaser-adapter/PhaserRuntimeTimeScale';
import {
  PlaytestSettings,
  type PlaytestSettingName,
  type PlaytestSettingsState,
} from '../settings/PlaytestSettings';

export interface GameSceneRuntimeSettingsScenePort extends Phaser.Scene {
  gameplayContext?: GameplayContext;
  playtestSettings: PlaytestSettingsState;
  runtimeTimeScale: PhaserRuntimeTimeScale;
  timeManager: { gameTimeSeconds: number };
  runId: string;
  isGameplayPaused: boolean;
  liveStrategyControlHandler: { isPauseActive: boolean };
  upgradeSelectionState: { active: boolean };
  runState: { endlessStarted: boolean };
  isGameOver: boolean;
  player?: { clearExternalMoveDirection(): void };
  virtualJoystick?: { setGameplayActive(active: boolean): void };
  shouldVirtualJoystickBeActive(): boolean;
  refreshLevelUpPanelAutoSelection(): void;
  startEndlessIfBossAlreadyKilled(): void;
  endGame(resultType: 'victory'): void;
  syncCurrentBgm(): void;
  emitHUDState(): void;
}

type RuntimeSettingsChangeCallbacks = Pick<
  RuntimeSettingsChangeContext,
  | 'resetSceneClocks'
  | 'clearPlayerMoveDirection'
  | 'setVirtualJoystickActive'
  | 'shouldVirtualJoystickBeActive'
  | 'refreshLevelUpPanelAutoSelection'
  | 'startEndlessIfBossAlreadyKilled'
  | 'endGameWithVictory'
  | 'syncCurrentBgm'
  | 'emitHUDState'
>;

export class GameSceneRuntimeSettingsChangeAdapter {
  private readonly runtimeSettingsChangeHandler = new RuntimeSettingsChangeHandler();

  subscribe(scene: GameSceneRuntimeSettingsScenePort): () => void {
    return PlaytestSettings.subscribe((settingName, nextSettings) => {
      this.handleSettingsChanged(scene, settingName, nextSettings);
    });
  }

  private handleSettingsChanged(
    scene: GameSceneRuntimeSettingsScenePort,
    settingName: PlaytestSettingName,
    nextSettings: PlaytestSettingsState,
  ): void {
    const previousSettings = this.applyNextSettings(scene, nextSettings);

    this.runtimeSettingsChangeHandler.handle(this.createChangeContext(
      scene,
      settingName,
      previousSettings,
      nextSettings,
    ));
  }

  private applyNextSettings(
    scene: GameSceneRuntimeSettingsScenePort,
    nextSettings: PlaytestSettingsState,
  ): PlaytestSettingsState {
    const previousSettings = scene.playtestSettings;

    scene.playtestSettings = nextSettings;
    return previousSettings;
  }

  private createChangeContext(
    scene: GameSceneRuntimeSettingsScenePort,
    settingName: PlaytestSettingName,
    previousSettings: PlaytestSettingsState,
    nextSettings: PlaytestSettingsState,
  ): RuntimeSettingsChangeContext {
    return {
      gameplayContext: scene.gameplayContext,
      previousSettings,
      nextSettings,
      settingName,
      configuredGameplayTimeScale: scene.runtimeTimeScale.getConfigured(nextSettings),
      gameTimeSeconds: scene.timeManager.gameTimeSeconds,
      runId: scene.runId,
      isGameplayPaused: scene.isGameplayPaused,
      isStrategyPanelPauseActive: scene.liveStrategyControlHandler.isPauseActive,
      isUpgradeSelectionActive: scene.upgradeSelectionState.active,
      isEndlessStarted: scene.runState.endlessStarted,
      isGameOver: scene.isGameOver,
      ...this.createChangeCallbacks(scene),
    };
  }

  private createChangeCallbacks(
    scene: GameSceneRuntimeSettingsScenePort,
  ): RuntimeSettingsChangeCallbacks {
    return {
      resetSceneClocks: () => scene.runtimeTimeScale.resetSceneClocks(scene),
      clearPlayerMoveDirection: () => scene.player?.clearExternalMoveDirection(),
      setVirtualJoystickActive: (active) => scene.virtualJoystick?.setGameplayActive(active),
      shouldVirtualJoystickBeActive: () => scene.shouldVirtualJoystickBeActive(),
      refreshLevelUpPanelAutoSelection: () => scene.refreshLevelUpPanelAutoSelection(),
      startEndlessIfBossAlreadyKilled: () => scene.startEndlessIfBossAlreadyKilled(),
      endGameWithVictory: () => scene.endGame('victory'),
      syncCurrentBgm: () => scene.syncCurrentBgm(),
      emitHUDState: () => scene.emitHUDState(),
    };
  }
}
