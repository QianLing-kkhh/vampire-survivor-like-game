import Phaser from 'phaser';

import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PhaserRuntimeTimeScale } from '../phaser-adapter/PhaserRuntimeTimeScale';
import type { PauseFlowHandlerContext } from '../ui/pause/PauseFlowHandler';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';
import type { StatsBuildSnapshot } from '../ui/stats/StatsBuildSnapshot';

interface GameplayActivityController {
  setGameplayActive(active: boolean): void;
}

export interface GameScenePauseFlowScenePort extends Phaser.Scene {
  isGameOver: boolean;
  upgradeSelectionState: { active: boolean };
  isPauseMenuOpen: boolean;
  timeManager: { gameTimeSeconds: number };
  runId: string;
  gameplayContext?: GameplayContext;
  isGameplayPaused: boolean;
  runtimeTimeScale: PhaserRuntimeTimeScale;
  playtestSettings: PlaytestSettingsState;
  virtualJoystick?: GameplayActivityController;
  buildStatsBuildSnapshot(): StatsBuildSnapshot;
  shouldVirtualJoystickBeActive(): boolean;
}

export class GameScenePauseFlowContextAdapter {
  build(scene: GameScenePauseFlowScenePort): PauseFlowHandlerContext {
    return {
      isGameOver: scene.isGameOver,
      isLevelUpSelectionActive: scene.upgradeSelectionState.active,
      isPauseMenuOpen: scene.isPauseMenuOpen,
      gameTimeSeconds: scene.timeManager.gameTimeSeconds,
      runId: scene.runId,
      gameplayContext: scene.gameplayContext,
      setPauseMenuOpen: (open: boolean) => {
        scene.isPauseMenuOpen = open;
      },
      setGameplayPaused: (paused: boolean) => {
        scene.isGameplayPaused = paused;
      },
      buildStatsBuildSnapshot: () => scene.buildStatsBuildSnapshot(),
      applyGameplayTimeScale: () => (
        scene.runtimeTimeScale.applyConfigured(
          scene,
          scene.gameplayContext,
          scene.playtestSettings,
        )
      ),
      setVirtualJoystickActive: (active: boolean) => (
        scene.virtualJoystick?.setGameplayActive(active)
      ),
      shouldVirtualJoystickBeActive: () => scene.shouldVirtualJoystickBeActive(),
    };
  }
}
