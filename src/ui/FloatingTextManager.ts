import Phaser from 'phaser';

import { ObjectPool } from '../performance/ObjectPool';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { PoolManager } from '../performance/PoolManager';
import { PooledObjectFactory } from '../performance/PooledObjectFactory';

import { FloatingText, FloatingTextConfig } from './FloatingText';
import { FLOATING_TEXT_STYLE } from './floating/FloatingTextStyle';

export interface ChestUpgradeFloatingTextPayload {
  name: string;
  iconFallback?: string;
  beforeLevel?: number;
  afterLevel?: number;
  maxLevel?: number;
  isMax?: boolean;
  kind?: 'levelUp' | 'acquired' | 'stat' | 'endlessReward' | 'evolution';
  evolvedName?: string;
}

export class FloatingTextManager {
  private static readonly MAX_ACTIVE_TEXTS = 60;
  private static readonly MAX_POOL_SIZE = 80;

  private readonly texts: FloatingText[] = [];
  private readonly pool: ObjectPool<FloatingText>;
  private chestUpgradeMessageLane = 0;
  private enemyMergeMessageLane = 0;
  private slowDebuffMessageLane = 0;

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
      isBoss ? FLOATING_TEXT_STYLE.bossDamage : FLOATING_TEXT_STYLE.enemyDamage,
    );
  }

  showPlayerDamage(x: number, y: number, damage: number): void {
    this.spawn(x, y - 28, `-${Math.ceil(damage)}`, FLOATING_TEXT_STYLE.playerDamage);
  }

  showPlayerHeal(x: number, y: number, amount: number): void {
    this.spawn(x, y - 34, `+${Math.ceil(amount)}`, FLOATING_TEXT_STYLE.playerHeal);
  }

  showChestUpgrade(
    x: number,
    y: number,
    payload: ChestUpgradeFloatingTextPayload,
  ): void {
    const lane = this.chestUpgradeMessageLane % 4;
    this.chestUpgradeMessageLane += 1;
    const prefix = payload.iconFallback ? `${payload.iconFallback} ` : '';
    const label = this.formatChestUpgradeLabel(prefix, payload);

    this.spawn(
      x + (lane % 2 === 0 ? -12 : 12),
      y - 56 - lane * 24,
      label,
      FLOATING_TEXT_STYLE.chestUpgrade,
    );
  }

  showEnemyMergeLevelUp(
    x: number,
    y: number,
    beforeLevel: number,
    afterLevel: number,
    maxLevel: number,
  ): void {
    const lane = this.enemyMergeMessageLane % 4;
    this.enemyMergeMessageLane += 1;
    const maxSuffix = afterLevel >= maxLevel ? ' MAX' : '';
    const label = `Lv.${beforeLevel} -> Lv.${afterLevel}${maxSuffix}`;

    this.spawn(
      x + (lane % 2 === 0 ? -10 : 10),
      y - 34 - lane * 16,
      label,
      FLOATING_TEXT_STYLE.enemyMergeLevelUp,
    );
  }

  showMoveSpeedDown(x: number, y: number): void {
    const lane = this.slowDebuffMessageLane % 4;
    this.slowDebuffMessageLane += 1;

    this.spawn(
      x + (lane % 2 === 0 ? -8 : 8),
      y - 42 - lane * 12,
      '\u{1F45F}\u2193',
      FLOATING_TEXT_STYLE.moveSpeedDown,
    );
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
    config: FloatingTextConfig,
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

  private formatChestUpgradeLabel(
    prefix: string,
    payload: ChestUpgradeFloatingTextPayload,
  ): string {
    if (payload.kind === 'evolution') {
      const evolvedName = payload.evolvedName ?? payload.name;

      return `${prefix}${payload.name} -> ${evolvedName} EVOLVED`.trim();
    }

    if (payload.kind === 'stat' || payload.kind === 'endlessReward') {
      return `${prefix}${payload.name} upgraded`.trim();
    }

    if (payload.kind === 'acquired' || (payload.beforeLevel ?? 0) <= 0) {
      const afterLevel = payload.afterLevel ?? 1;

      return `${prefix}${payload.name} acquired Lv.${afterLevel}`.trim();
    }

    const beforeLevel = payload.beforeLevel ?? 0;
    const afterLevel = payload.afterLevel ?? beforeLevel;
    const maxSuffix = payload.isMax ? ' MAX' : '';

    return `${prefix}${payload.name} Lv.${beforeLevel} -> Lv.${afterLevel}${maxSuffix}`.trim();
  }
}
