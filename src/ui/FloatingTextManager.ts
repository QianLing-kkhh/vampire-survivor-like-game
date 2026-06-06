import Phaser from 'phaser';

import { ObjectPool } from '../performance/ObjectPool';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { PoolManager } from '../performance/PoolManager';
import { PooledObjectFactory } from '../performance/PooledObjectFactory';

import { FloatingText, FloatingTextConfig } from './FloatingText';

export class FloatingTextManager {
  private static readonly MAX_ACTIVE_TEXTS = 60;
  private static readonly MAX_POOL_SIZE = 80;

  private readonly texts: FloatingText[] = [];
  private readonly pool: ObjectPool<FloatingText>;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly performanceMonitor?: PerformanceMonitor,
    poolManager?: PoolManager,
  ) {
    const factory: PooledObjectFactory<FloatingText> = {
      create: (...args: unknown[]) => {
        this.performanceMonitor?.recordCreated('floatingText');
        const [x, y, value, config] = args;

        return new FloatingText(
          scene,
          Number(x),
          Number(y),
          String(value),
          config as FloatingTextConfig,
        );
      },
      destroy: (text: FloatingText) => {
        this.performanceMonitor?.recordDestroyed('floatingText');
        text.destroy();
      },
    };

    this.pool = poolManager
      ? poolManager.createPool('floatingText', factory, FloatingTextManager.MAX_POOL_SIZE)
      : new ObjectPool<FloatingText>(factory, FloatingTextManager.MAX_POOL_SIZE);
  }

  showEnemyDamage(x: number, y: number, damage: number, isBoss = false): void {
    if (!isBoss && this.texts.length >= FloatingTextManager.MAX_ACTIVE_TEXTS) {
      return;
    }

    this.spawn(
      x,
      y - (isBoss ? 38 : 18),
      Math.ceil(damage).toString(),
      {
        color: '#f8fafc',
        fontSize: isBoss ? '22px' : '16px',
      },
    );
  }

  showPlayerDamage(x: number, y: number, damage: number): void {
    this.spawn(x, y - 28, `-${Math.ceil(damage)}`, {
      color: '#ef4444',
      fontSize: '22px',
    });
  }

  showPlayerHeal(x: number, y: number, amount: number): void {
    this.spawn(x, y - 34, `+${Math.ceil(amount)}`, {
      color: '#22c55e',
      fontSize: '20px',
    });
  }

  update(deltaMs: number): void {
    for (let index = this.texts.length - 1; index >= 0; index -= 1) {
      if (this.texts[index].update(deltaMs)) {
        continue;
      }

      const text = this.texts.splice(index, 1)[0];
      this.pool.release(text);
    }
  }

  destroy(): void {
    for (const text of this.texts) {
      this.pool.release(text);
    }

    this.texts.length = 0;
    this.pool.clear();
  }

  getActiveCount(): number {
    return this.texts.length;
  }

  getPoolStats() {
    return this.pool.getStats();
  }

  private spawn(
    x: number,
    y: number,
    value: string,
    config: {
      color: string;
      fontSize: string;
    },
  ): void {
    if (this.texts.length >= FloatingTextManager.MAX_ACTIVE_TEXTS) {
      const oldest = this.texts.shift();
      if (oldest) {
        this.pool.release(oldest);
      }
    }

    const beforeStats = this.pool.getStats();
    const text = this.pool.acquire(x, y, value, config);
    const afterStats = this.pool.getStats();

    if (afterStats.reusedCount > beforeStats.reusedCount) {
      this.performanceMonitor?.recordReused('floatingText');
    }

    this.texts.push(text);
  }
}
