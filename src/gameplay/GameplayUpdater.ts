import { EndlessManager } from '../endless/EndlessManager';

import { GameplayContext } from './GameplayContext';
import { RuntimeDiagnosticsCollector } from './RuntimeDiagnosticsCollector';

export interface GameplayUpdateCallbacks {
  getGameplayTimeScale(): number;
  updateAutoPlayer(deltaMs: number): void;
  updatePlayerFromVirtualJoystick(deltaMs: number): void;
  updatePlayerHitRange(): void;
  isPlayerDead(): boolean;
  isFinalBossDefeated(): boolean;
  endGame(resultType: 'gameOver' | 'victory'): void;
  emitHUDState(): void;
}

export interface GameplayUpdateOptions {
  deltaMs: number;
  isLevelUpSelectionActive: boolean;
  isAutoMovementEnabled: boolean;
  worldWidth: number;
  worldHeight: number;
  callbacks: GameplayUpdateCallbacks;
}

export class GameplayUpdater {
  private readonly runtimeDiagnosticsCollector = new RuntimeDiagnosticsCollector();

  update(context: GameplayContext, options: GameplayUpdateOptions): void {
    const { callbacks } = options;
    const configuredTimeScale = callbacks.getGameplayTimeScale();
    const effectiveDelta = options.deltaMs * configuredTimeScale;
    const playerDelta = effectiveDelta * context.endlessBossManager.getPlayerMoveSpeedMultiplier();

    context.performanceMonitor.update(options.deltaMs, effectiveDelta);
    context.virtualJoystick.setGameplayActive(
      !options.isLevelUpSelectionActive && !options.isAutoMovementEnabled,
    );

    context.timeManager.update(effectiveDelta);
    context.passiveManager.update(effectiveDelta, context.playerHealth);
    context.relicManager.update(effectiveDelta);
    context.mapMechanicRuntime.update(effectiveDelta);
    const playerPosition = context.player.getPositionLike();
    const playerSlowState = context.mapMechanicRuntime.getPlayerSlowState(
      playerPosition.x,
      playerPosition.y,
    );
    const mapMoveSpeedMultiplier = playerSlowState.multiplier;
    context.player.setMapMoveSpeedMultiplier(
      Math.max(
        mapMoveSpeedMultiplier,
        context.characterRuntime.getMapMoveSpeedFloorMultiplier(),
      ),
    );
    const playerSlowAcquired = context.player.setSlowVisual(
      playerSlowState.isSlowed,
      playerSlowState.multiplier,
    );

    if (playerSlowAcquired) {
      context.floatingTextManager.showMoveSpeedDown(
        playerPosition.x,
        playerPosition.y,
      );
    }

    if (options.isAutoMovementEnabled) {
      callbacks.updateAutoPlayer(playerDelta);
    } else if (context.virtualJoystick.hasInput()) {
      callbacks.updatePlayerFromVirtualJoystick(playerDelta);
    } else {
      context.player.update(playerDelta);
    }

    context.mapMechanicRuntime.resolvePlayerObstacleCollision(context.player);
    context.mapMechanicRuntime.tryTeleportPlayer(context.player);
    callbacks.updatePlayerHitRange();
    context.enemyFlow.removeDeadEnemies();
    context.spawnDirector.update(context.timeManager.gameTimeSeconds, effectiveDelta);
    context.bossController.update(context.timeManager.gameTimeSeconds, effectiveDelta);
    this.updateEndlessState(context, effectiveDelta, true);
    context.enemyFlow.update(context.timeManager.gameTimeSeconds, effectiveDelta);

    if (callbacks.isPlayerDead()) {
      callbacks.endGame(context.runState.endlessStarted ? 'victory' : 'gameOver');
      return;
    }

    if (callbacks.isFinalBossDefeated() && !context.playtestSettings.endlessMode) {
      callbacks.endGame('victory');
      return;
    }

    context.weaponManager.update(
      context.player,
      context.enemies,
      effectiveDelta,
      context.characterRuntime,
      (
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        projectileRadius: number | undefined,
      ) => (
        context.mapMechanicRuntime.isProjectilePathBlocked(
          startX,
          startY,
          endX,
          endY,
          projectileRadius,
        )
      ),
    );

    this.updateEndlessState(context, effectiveDelta, false);

    if (callbacks.isFinalBossDefeated() && !context.playtestSettings.endlessMode) {
      callbacks.endGame('victory');
      return;
    }

    const effectivePickupRange = context.playerPickupRange
      * context.characterRuntime.getPickupRangeMultiplier();

    context.pickupManager.update({
      player: context.player,
      pickupRange: effectivePickupRange,
      deltaMs: effectiveDelta,
    });
    context.treasureManager.update({
      player: context.player,
      pickupRange: effectivePickupRange,
      deltaMs: effectiveDelta,
    });
    context.floatingTextManager.update(effectiveDelta);
    this.runtimeDiagnosticsCollector.updatePerformanceCounts(context, options.deltaMs, configuredTimeScale);
    callbacks.emitHUDState();
  }

  private updateEndlessState(
    context: GameplayContext,
    effectiveDelta: number,
    allowSpawns: boolean,
  ): void {
    if (
      context.playtestSettings.endlessMode
      && context.bossController.hasBossBeenKilled()
      && !context.runState.endlessStarted
    ) {
      context.runState.startEndless(context.timeManager.gameTimeSeconds);
      context.endlessManager.start(context.timeManager.gameTimeSeconds);
      context.endlessBossManager.start(context.timeManager.gameTimeSeconds);
    }

    if (!context.runState.endlessStarted) {
      context.levelManager.setRequiredExpMultiplier(1);
      context.expRequirementMultiplier = 1;
      return;
    }

    context.runState.updateEndlessTime(context.timeManager.gameTimeSeconds);
    context.expRequirementMultiplier = EndlessManager.getExpRequirementMultiplier(
      context.runState.endlessSurvivalTime,
    );
    context.levelManager.setRequiredExpMultiplier(context.expRequirementMultiplier);
    context.runState.recordExpRequirementMultiplier(context.expRequirementMultiplier);
    if (!allowSpawns) {
      return;
    }

    context.endlessManager.update(context.timeManager.gameTimeSeconds, effectiveDelta);
    context.endlessBossManager.update(context.timeManager.gameTimeSeconds, effectiveDelta);
  }
}
