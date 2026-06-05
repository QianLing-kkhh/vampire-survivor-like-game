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
    const configuredTimeScale = callbacks.getGameplayTimeScale();
    const effectiveDelta = options.deltaMs * configuredTimeScale;
    const playerDelta = effectiveDelta * context.endlessBossManager.getPlayerMoveSpeedMultiplier();

    context.performanceMonitor.update(options.deltaMs, effectiveDelta);
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
    this.updatePerformanceCounts(context, options.deltaMs, configuredTimeScale);
    callbacks.emitHUDState();
  }

  private updatePerformanceCounts(
    context: GameplayContext,
    realDeltaMs: number,
    configuredTimeScale: number,
  ): void {
    const poolStats = context.poolManager.getStats();
    const floatingTextPoolStats = context.floatingTextManager.getPoolStats();
    const activeEnemies = context.enemies.filter((enemy) => !enemy.isDead);
    const activeBossCount = activeEnemies.filter((enemy) => this.isBossLikeEnemyId(enemy.id)).length;
    const projectileCount = context.weaponManager.getProjectileCount();
    const pickupStats = context.pickupManager.getDebugStats();
    const spawnStats = context.spawnDirector.getDebugStats();
    const endlessStats = context.endlessManager.getDebugStats();
    const mapMechanicStats = context.mapMechanicRuntime.getDebugStats();
    const spawnClampCount = spawnStats.spawnClampCount + endlessStats.spawnClampCount;
    const pickupCount = pickupStats.activeCount;
    const treasureCount = context.treasureManager.getActiveCount();
    const floatingTextCount = floatingTextPoolStats.activeCount;
    const totalRenderableWorldObjects = activeEnemies.length
      + projectileCount
      + pickupCount
      + treasureCount
      + floatingTextCount
      + mapMechanicStats.visualCount;

    context.performanceMonitor.updateCounts({
      deltaMs: realDeltaMs,
      configuredTimeScale,
      effectiveTimeScale: context.effectiveTimeScale,
      sceneTimeScale: context.scene.time.timeScale,
      physicsTimeScale: this.getPhysicsTimeScale(context),
      enemyCount: activeEnemies.length,
      projectileCount,
      pickupCount,
      pickupGemCount: pickupCount,
      pickupMergeCount: pickupStats.mergedPickupCount,
      treasureCount,
      chestCount: treasureCount,
      floatingTextCount,
      floatingTextActiveCount: floatingTextCount,
      floatingTextPoolSize: floatingTextPoolStats.availableCount,
      activeBossCount,
      endlessEnemyCount: context.runState.endlessStarted
        ? activeEnemies.filter((enemy) => !this.isBossLikeEnemyId(enemy.id)).length
        : 0,
      endlessBossCount: context.runState.endlessStarted ? activeBossCount : 0,
      activeTweenCount: this.getActiveTweenCount(context),
      activeTimerCount: this.getActiveTimerCount(context),
      mapMechanicVisualCount: mapMechanicStats.visualCount,
      slowZoneCount: mapMechanicStats.slowZoneCount,
      totalRenderableWorldObjects,
      spawnAccumulatorSummary: [
        `wave=${Math.round(spawnStats.maxAccumulatorMs)}ms`,
        `endless=${Math.round(endlessStats.maxAccumulatorMs)}ms`,
        `clamp=${spawnClampCount}`,
      ].join(' '),
      spawnClampCount,
      pooledObjectCount: poolStats.activeCount + poolStats.availableCount,
      createdObjectCount: poolStats.createdCount,
      reusedObjectCount: poolStats.reusedCount,
      destroyedObjectCount: poolStats.destroyedCount,
    });
  }

  private isBossLikeEnemyId(enemyId: string): boolean {
    return enemyId === 'boss'
      || enemyId.endsWith('_boss')
      || enemyId.startsWith('endless_');
  }

  private getPhysicsTimeScale(context: GameplayContext): number {
    const world = context.scene.physics.world as unknown as { timeScale?: number };

    return world.timeScale ?? 1;
  }

  private getActiveTweenCount(context: GameplayContext): number {
    const tweens = context.scene.tweens as unknown as {
      getTweens?: () => unknown[];
      getAllTweens?: () => unknown[];
    };

    return tweens.getTweens?.().length
      ?? tweens.getAllTweens?.().length
      ?? 0;
  }

  private getActiveTimerCount(context: GameplayContext): number {
    const clock = context.scene.time as unknown as {
      getAllEvents?: () => unknown[];
    };

    return clock.getAllEvents?.().length ?? 0;
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
