export interface PerformanceStats {
  fps: number;
  deltaMs: number;
  averageDeltaMs?: number;
  configuredTimeScale?: number;
  effectiveTimeScale?: number;
  sceneTimeScale?: number;
  physicsTimeScale?: number;
  gameSecondsPerRealSecond?: number;
  enemyCount: number;
  projectileCount?: number;
  pickupCount?: number;
  pickupGemCount?: number;
  pickupMergeCount?: number;
  treasureCount?: number;
  chestCount?: number;
  floatingTextCount?: number;
  floatingTextActiveCount?: number;
  floatingTextPoolSize?: number;
  activeBossCount?: number;
  endlessEnemyCount?: number;
  endlessBossCount?: number;
  activeTweenCount?: number;
  activeTimerCount?: number;
  mapMechanicVisualCount?: number;
  slowZoneCount?: number;
  totalRenderableWorldObjects?: number;
  shadowCountEstimate?: number;
  separationCandidateChecks?: number;
  separationTrackedEnemyCount?: number;
  separationBucketCount?: number;
  weaponEnemyScanEstimate?: number;
  spawnAccumulatorSummary?: string;
  spawnClampCount?: number;
  minEnemyFloorSpawnCount?: number;
  enemyMergeCount?: number;
  enemyMergeCreatedLv2?: number;
  enemyMergeCreatedLv3?: number;
  enemyMergeMaxLevelReached?: number;
  maxMergeLevelSeen?: number;
  maxAliveEnemyCount?: number;
  averageAliveEnemyCount?: number;
  pooledObjectCount?: number;
  createdObjectCount?: number;
  reusedObjectCount?: number;
  destroyedObjectCount?: number;
}

export interface ObjectPoolStats {
  activeCount: number;
  availableCount: number;
  createdCount: number;
  reusedCount: number;
  destroyedCount: number;
}
