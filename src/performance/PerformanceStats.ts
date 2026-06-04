export interface PerformanceStats {
  fps: number;
  deltaMs: number;
  enemyCount: number;
  projectileCount?: number;
  pickupCount?: number;
  treasureCount?: number;
  floatingTextCount?: number;
  activeBossCount?: number;
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
