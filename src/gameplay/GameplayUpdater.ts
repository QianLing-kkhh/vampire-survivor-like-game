import { EndlessManager } from '../endless/EndlessManager';

import { GameplayContext } from './GameplayContext';

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
  update(context: GameplayContext, options: GameplayUpdateOptions): void {
    const { callbacks } = options;
    const effectiveDelta = options.deltaMs * callbacks.getGameplayTimeScale();
    const playerDelta = effectiveDelta * context.endlessBossManager.getPlayerMoveSpeedMultiplier();

    context.performanceMonitor.update(effectiveDelta);
    context.virtualJoystick.setGameplayActive(
      !options.isLevelUpSelectionActive && !options.isAutoMovementEnabled,
    );

    context.timeManager.update(effectiveDelta);
    context.passiveManager.update(effectiveDelta, context.playerHealth);
    context.mapMechanicRuntime.update(effectiveDelta);
    context.player.setMapMoveSpeedMultiplier(
      context.mapMechanicRuntime.getPlayerSpeedMultiplierAt(
        context.player.body.x,
        context.player.body.y,
      ),
    );

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

    context.weaponManager.update(context.player, context.enemies, effectiveDelta);

    this.updateEndlessState(context, effectiveDelta, false);

    if (callbacks.isFinalBossDefeated() && !context.playtestSettings.endlessMode) {
      callbacks.endGame('victory');
      return;
    }

    context.pickupManager.update(context.player.body, context.playerPickupRange, effectiveDelta);
    context.treasureManager.update(context.player.body, context.playerPickupRange, effectiveDelta);
    context.floatingTextManager.update(effectiveDelta);
    this.updatePerformanceCounts(context, effectiveDelta);
    callbacks.emitHUDState();
  }

  private updatePerformanceCounts(context: GameplayContext, deltaMs: number): void {
    const poolStats = context.poolManager.getStats();

    context.performanceMonitor.updateCounts({
      deltaMs,
      enemyCount: context.enemies.filter((enemy) => !enemy.isDead).length,
      pickupCount: context.pickupManager.getActiveCount(),
      treasureCount: context.treasureManager.getActiveCount(),
      floatingTextCount: context.floatingTextManager.getActiveCount(),
      activeBossCount: context.enemies.filter((enemy) => (
        !enemy.isDead
        && (enemy.id === 'boss' || enemy.id.endsWith('_boss') || enemy.id.startsWith('endless_'))
      )).length,
      pooledObjectCount: poolStats.activeCount + poolStats.availableCount,
      createdObjectCount: poolStats.createdCount,
      reusedObjectCount: poolStats.reusedCount,
      destroyedObjectCount: poolStats.destroyedCount,
    });
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
