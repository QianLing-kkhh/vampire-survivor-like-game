import type { GameplayContext } from './GameplayContext';

export class RuntimeDiagnosticsCollector {
  updatePerformanceCounts(
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
    const populationStats = context.enemyFlow.getPopulationStats();
    const endlessStats = context.endlessManager.getDebugStats();
    const mapMechanicStats = context.mapMechanicRuntime.getDebugStats();
    const enemyMovementStats = context.enemyMovement.getDebugStats();
    const spawnClampCount = spawnStats.spawnClampCount + endlessStats.spawnClampCount;
    const pickupCount = pickupStats.activeCount;
    const treasureCount = context.treasureManager.getActiveCount();
    const floatingTextCount = floatingTextPoolStats.activeCount;
    const shadowCountEstimate = activeEnemies.length
      + pickupCount
      + treasureCount
      + projectileCount
      + 1;
    const weaponEnemyScanEstimate = activeEnemies.length * Math.max(1, projectileCount + 3);
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
      shadowCountEstimate,
      separationCandidateChecks: enemyMovementStats.separationCandidateChecks,
      separationTrackedEnemyCount: enemyMovementStats.separationTrackedEnemyCount,
      separationBucketCount: enemyMovementStats.separationBucketCount,
      weaponEnemyScanEstimate,
      spawnAccumulatorSummary: [
        `wave=${Math.round(spawnStats.maxAccumulatorMs)}ms`,
        `endless=${Math.round(endlessStats.maxAccumulatorMs)}ms`,
        `clamp=${spawnClampCount}`,
      ].join(' '),
      spawnClampCount,
      minEnemyFloorSpawnCount: spawnStats.minEnemyFloorSpawnCount,
      enemyMergeCount: populationStats.enemyMergeCount,
      enemyMergeCreatedLv2: populationStats.enemyMergeCreatedLv2,
      enemyMergeCreatedLv3: populationStats.enemyMergeCreatedLv3,
      enemyMergeMaxLevelReached: populationStats.enemyMergeMaxLevelReached,
      maxMergeLevelSeen: populationStats.maxMergeLevelSeen,
      maxAliveEnemyCount: populationStats.maxAliveEnemyCount,
      averageAliveEnemyCount: populationStats.averageAliveEnemyCount,
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
}
