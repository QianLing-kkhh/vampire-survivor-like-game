import { ObjectPool } from './ObjectPool';
import { ObjectPoolStats } from './PerformanceStats';
import { Poolable } from './Poolable';
import { PooledObjectFactory } from './PooledObjectFactory';

export class PoolManager {
  private readonly pools = new Map<string, ObjectPool<Poolable>>();

  createPool<T extends Poolable>(
    id: string,
    factory: PooledObjectFactory<T>,
    maxSize = 100,
  ): ObjectPool<T> {
    const existingPool = this.pools.get(id);

    if (existingPool) {
      return existingPool as ObjectPool<T>;
    }

    const pool = new ObjectPool<T>(factory, maxSize);
    this.pools.set(id, pool as ObjectPool<Poolable>);
    return pool;
  }

  getStats(): ObjectPoolStats {
    const total: ObjectPoolStats = {
      activeCount: 0,
      availableCount: 0,
      createdCount: 0,
      reusedCount: 0,
      destroyedCount: 0,
    };

    for (const pool of this.pools.values()) {
      const stats = pool.getStats();
      total.activeCount += stats.activeCount;
      total.availableCount += stats.availableCount;
      total.createdCount += stats.createdCount;
      total.reusedCount += stats.reusedCount;
      total.destroyedCount += stats.destroyedCount;
    }

    return total;
  }

  clear(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }

    this.pools.clear();
  }
}
