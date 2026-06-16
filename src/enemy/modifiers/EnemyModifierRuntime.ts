import { HitResult } from '../../combat/HitResult';
import type { EnemyStats } from '../../core/domain/EnemyTypes';
import { Enemy } from '../Enemy';

import {
  EnemyModifier,
  EnemyModifierAfterDamageContext,
  EnemyModifierDeathContext,
} from './EnemyModifier';

export class EnemyModifierRuntime {
  private attachedEnemy?: Enemy;
  private deathHandled = false;

  constructor(private readonly modifiers: EnemyModifier[]) {}

  get isEmpty(): boolean {
    return this.modifiers.length === 0;
  }

  applyStats(stats: EnemyStats): EnemyStats {
    return this.modifiers.reduce(
      (currentStats, modifier) => modifier.applyStats?.({ ...currentStats }) ?? currentStats,
      { ...stats },
    );
  }

  attach(enemy: Enemy): void {
    this.attachedEnemy = enemy;
    this.modifiers.forEach((modifier) => modifier.onAttach?.(enemy));
  }

  beforeTakeDamage(hitResult: HitResult, damage: number): {
    damage: number;
    absorbedDamage: number;
  } {
    if (!this.attachedEnemy) {
      return { damage, absorbedDamage: 0 };
    }

    let nextDamage = damage;
    let absorbedDamage = 0;

    for (const modifier of this.modifiers) {
      const result = modifier.beforeTakeDamage?.({
        enemy: this.attachedEnemy,
        hitResult,
        damage: nextDamage,
      });

      if (!result) {
        continue;
      }

      nextDamage = Math.max(0, result.damage);
      absorbedDamage += Math.max(0, result.absorbed ?? 0);
    }

    return { damage: nextDamage, absorbedDamage };
  }

  afterTakeDamage(context: EnemyModifierAfterDamageContext): void {
    this.modifiers.forEach((modifier) => modifier.afterTakeDamage?.(context));
  }

  onDeath(context: EnemyModifierDeathContext): void {
    if (this.deathHandled) {
      return;
    }

    this.deathHandled = true;
    this.modifiers.forEach((modifier) => modifier.onDeath?.(context));
  }

  update(deltaMs: number): void {
    if (!this.attachedEnemy) {
      return;
    }

    this.modifiers.forEach((modifier) => modifier.update?.(deltaMs, {
      enemy: this.attachedEnemy as Enemy,
    }));
  }

  getDisplayTags(): string[] {
    return this.modifiers.flatMap((modifier) => modifier.getDisplayTags?.() ?? []);
  }
}
