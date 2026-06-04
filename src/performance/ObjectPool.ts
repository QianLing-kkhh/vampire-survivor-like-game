import { ObjectPoolStats } from './PerformanceStats';
import { Poolable } from './Poolable';
import { PooledObjectFactory } from './PooledObjectFactory';

export class ObjectPool<T extends Poolable> {
  private readonly available: T[] = [];
  private readonly active = new Set<T>();
  private createdCount = 0;
  private reusedCount = 0;
  private destroyedCount = 0;

  constructor(
    private readonly factory: PooledObjectFactory<T>,
    private readonly maxSize = 100,
  ) {}

  acquire(...args: unknown[]): T {
    const item = this.available.pop();

    if (item) {
      this.reusedCount += 1;
      item.resetForReuse(...args);
      this.active.add(item);
      return item;
    }

    const created = this.factory.create(...args);
    this.createdCount += 1;
    created.resetForReuse(...args);
    this.active.add(created);
    return created;
  }

  release(item: T): void {
    if (!this.active.delete(item)) {
      return;
    }

    item.releaseToPool();

    if (this.available.length >= this.maxSize) {
      this.destroyItem(item);
      return;
    }

    this.available.push(item);
  }

  clear(): void {
    for (const item of this.active) {
      item.releaseToPool();
      this.destroyItem(item);
    }

    for (const item of this.available) {
      this.destroyItem(item);
    }

    this.active.clear();
    this.available.length = 0;
  }

  getStats(): ObjectPoolStats {
    return {
      activeCount: this.active.size,
      availableCount: this.available.length,
      createdCount: this.createdCount,
      reusedCount: this.reusedCount,
      destroyedCount: this.destroyedCount,
    };
  }

  private destroyItem(item: T): void {
    this.destroyedCount += 1;
    this.factory.destroy?.(item);
  }
}
