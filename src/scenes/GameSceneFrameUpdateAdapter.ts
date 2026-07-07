import Phaser from 'phaser';

import type { GameplayContext } from '../gameplay/GameplayContext';
import type { GameplayUpdater } from '../gameplay/GameplayUpdater';
import type { GameSceneFrameUpdateResult } from './GameSceneFrameUpdater';
import { GameSceneFrameUpdater } from './GameSceneFrameUpdater';
import type { PhaserRuntimeTimeScale } from '../phaser-adapter/PhaserRuntimeTimeScale';
import type {
  ProgressionEffectSyncContext,
  ProgressionEffectSynchronizer,
} from '../progression/ProgressionEffectSynchronizer';
import type { PlaytestSettingsState } from '../settings/PlaytestSettings';

interface GameplayActivityController {
  setGameplayActive(active: boolean): void;
}

interface OrientationOverlayUpdater {
  update(): boolean;
}

interface MapVisibilityUpdater {
  update(position?: { x: number; y: number }): void;
}

export interface GameSceneFrameUpdateScenePort extends Phaser.Scene {
  isGameOver: boolean;
  orientationOverlayController: OrientationOverlayUpdater;
  virtualJoystick?: GameplayActivityController;
  isGameplayPaused: boolean;
  liveStrategyControlHandler: { isPauseActive: boolean };
  gameplayContext?: GameplayContext;
  progressionEffectSynchronizer: ProgressionEffectSynchronizer;
  runtimeStrategyProfileSynchronizer: { hasGeneratedStrategy(): boolean };
  gameplayUpdater: GameplayUpdater;
  upgradeSelectionState: { active: boolean };
  playtestSettings: PlaytestSettingsState;
  worldWidth: number;
  worldHeight: number;
  mapVisibilityController: MapVisibilityUpdater;
  player?: { getPositionLike(): { x: number; y: number } };
  playerHealth?: { isDead: boolean };
  runtimeTimeScale: PhaserRuntimeTimeScale;
  playerPickupRange: number;
  getProgressionEffectSyncContext(): ProgressionEffectSyncContext;
  syncRuntimeStrategyProfile(profile?: unknown): void;
  updateAutoPlayer(deltaMs: number): void;
  updatePlayerFromVirtualJoystick(deltaMs: number): void;
  updatePlayerHitRange(): void;
  endGame(resultType: 'gameOver' | 'victory'): void;
  emitHUDState(): void;
  emitDebugPanelData(): void;
}

export class GameSceneFrameUpdateAdapter {
  private readonly frameUpdater = new GameSceneFrameUpdater();

  update(scene: GameSceneFrameUpdateScenePort, deltaMs: number): GameSceneFrameUpdateResult {
    const result = this.frameUpdater.update({
      isGameOver: scene.isGameOver,
      orientationOverlayController: scene.orientationOverlayController,
      virtualJoystick: scene.virtualJoystick,
      isGameplayPaused: scene.isGameplayPaused,
      isStrategyPauseActive: scene.liveStrategyControlHandler.isPauseActive,
      gameplayContext: scene.gameplayContext,
      progressionEffectSynchronizer: scene.progressionEffectSynchronizer,
      progressionEffectSyncContext: scene.getProgressionEffectSyncContext(),
      hasGeneratedStrategy: scene.runtimeStrategyProfileSynchronizer.hasGeneratedStrategy(),
      gameplayUpdater: scene.gameplayUpdater,
      deltaMs,
      isLevelUpSelectionActive: scene.upgradeSelectionState.active,
      isAutoMovementEnabled: scene.playtestSettings.autoMovement,
      worldWidth: scene.worldWidth,
      worldHeight: scene.worldHeight,
      mapVisibilityController: scene.mapVisibilityController,
      playerPosition: scene.player?.getPositionLike(),
      callbacks: {
        getGameplayTimeScale: () => (
          scene.runtimeTimeScale.getEffective(scene.gameplayContext, scene.playtestSettings)
        ),
        syncRuntimeStrategyProfile: () => (
          scene.syncRuntimeStrategyProfile(
            scene.gameplayContext?.runtimeStrategyState?.getProfile(),
          )
        ),
        updateAutoPlayer: (delta) => scene.updateAutoPlayer(delta),
        updatePlayerFromVirtualJoystick: (delta) => (
          scene.updatePlayerFromVirtualJoystick(delta)
        ),
        updatePlayerHitRange: () => scene.updatePlayerHitRange(),
        isPlayerDead: () => scene.playerHealth?.isDead === true,
        isFinalBossDefeated: () => (
          scene.gameplayContext?.bossController.hasBossBeenKilled() === true
        ),
        endGame: (resultType) => scene.endGame(resultType),
        emitHUDState: () => scene.emitHUDState(),
        emitDebugPanelData: () => scene.emitDebugPanelData(),
      },
    });

    if (result.playerPickupRange !== undefined) {
      scene.playerPickupRange = result.playerPickupRange;
    }

    return result;
  }
}
