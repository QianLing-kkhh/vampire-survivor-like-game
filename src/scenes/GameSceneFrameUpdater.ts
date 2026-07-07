import type { GameplayContext } from '../gameplay/GameplayContext';
import type { GameplayUpdater } from '../gameplay/GameplayUpdater';
import type { ProgressionEffectSyncContext } from '../progression/ProgressionEffectSynchronizer';
import type { ProgressionEffectSynchronizer } from '../progression/ProgressionEffectSynchronizer';

interface GameplayActivityController {
  setGameplayActive(active: boolean): void;
}

interface OrientationOverlayUpdater {
  update(): boolean;
}

interface MapVisibilityUpdater {
  update(position?: { x: number; y: number }): void;
}

export interface GameSceneFrameUpdateContext {
  isGameOver: boolean;
  orientationOverlayController: OrientationOverlayUpdater;
  virtualJoystick?: GameplayActivityController;
  isGameplayPaused: boolean;
  isStrategyPauseActive: boolean;
  gameplayContext?: GameplayContext;
  progressionEffectSynchronizer: ProgressionEffectSynchronizer;
  progressionEffectSyncContext: ProgressionEffectSyncContext;
  hasGeneratedStrategy: boolean;
  gameplayUpdater: GameplayUpdater;
  deltaMs: number;
  isLevelUpSelectionActive: boolean;
  isAutoMovementEnabled: boolean;
  worldWidth: number;
  worldHeight: number;
  mapVisibilityController: MapVisibilityUpdater;
  playerPosition?: { x: number; y: number };
  callbacks: {
    emitHUDState(): void;
    syncRuntimeStrategyProfile(): void;
    getGameplayTimeScale(): number;
    updateAutoPlayer(deltaMs: number): void;
    updatePlayerFromVirtualJoystick(deltaMs: number): void;
    updatePlayerHitRange(): void;
    isPlayerDead(): boolean;
    isFinalBossDefeated(): boolean;
    endGame(resultType: 'gameOver' | 'victory'): void;
    emitDebugPanelData(): void;
  };
}

export interface GameSceneFrameUpdateResult {
  playerPickupRange?: number;
}

export class GameSceneFrameUpdater {
  update(context: GameSceneFrameUpdateContext): GameSceneFrameUpdateResult {
    if (context.isGameOver) {
      return {};
    }

    if (context.orientationOverlayController.update()) {
      context.virtualJoystick?.setGameplayActive(false);
      context.callbacks.emitHUDState();
      return {};
    }

    if (context.isGameplayPaused || context.isStrategyPauseActive) {
      context.virtualJoystick?.setGameplayActive(false);
      context.callbacks.emitHUDState();
      return {};
    }

    if (!context.gameplayContext) {
      return {};
    }

    const playerPickupRange = context.progressionEffectSynchronizer.syncPlayerPickupRange(
      context.progressionEffectSyncContext,
    );

    if (context.hasGeneratedStrategy) {
      context.callbacks.syncRuntimeStrategyProfile();
    }

    context.gameplayUpdater.update(context.gameplayContext, {
      deltaMs: context.deltaMs,
      isLevelUpSelectionActive: context.isLevelUpSelectionActive,
      isAutoMovementEnabled: context.isAutoMovementEnabled,
      worldWidth: context.worldWidth,
      worldHeight: context.worldHeight,
      callbacks: {
        getGameplayTimeScale: context.callbacks.getGameplayTimeScale,
        updateAutoPlayer: context.callbacks.updateAutoPlayer,
        updatePlayerFromVirtualJoystick: context.callbacks.updatePlayerFromVirtualJoystick,
        updatePlayerHitRange: context.callbacks.updatePlayerHitRange,
        isPlayerDead: context.callbacks.isPlayerDead,
        isFinalBossDefeated: context.callbacks.isFinalBossDefeated,
        endGame: context.callbacks.endGame,
        emitHUDState: context.callbacks.emitHUDState,
      },
    });
    context.mapVisibilityController.update(context.playerPosition);
    context.callbacks.emitDebugPanelData();

    return { playerPickupRange };
  }
}
