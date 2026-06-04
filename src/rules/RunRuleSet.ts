import { EnemyStats } from '../enemy/Enemy';

import { DifficultyDefinition } from './DifficultyDefinition';
import { Mutator } from './Mutator';
import { MutatorConfig } from './MutatorConfig';
import { MutatorContext } from './MutatorContext';

export class RunRuleSet {
  constructor(
    readonly difficulty: DifficultyDefinition,
    readonly mutators: readonly Mutator[],
    readonly mutatorConfigs: readonly MutatorConfig[],
    readonly context: MutatorContext,
  ) {}

  get rulesetId(): string {
    const mutatorIds = this.getMutatorIds();

    return mutatorIds.length === 0
      ? this.difficulty.id
      : `${this.difficulty.id}+${mutatorIds.join('+')}`;
  }

  getMutatorIds(): string[] {
    return this.mutators.map((mutator) => mutator.id);
  }

  applyEnemyStats(stats: EnemyStats): EnemyStats {
    return this.mutators.reduce(
      (nextStats, mutator) => mutator.applyEnemyStats?.(nextStats, this.context) ?? nextStats,
      {
        ...stats,
        hp: Math.round(stats.hp * this.difficulty.enemyHpMultiplier),
        damage: Math.round(stats.damage * this.difficulty.enemyDamageMultiplier),
        moveSpeed: stats.moveSpeed * this.difficulty.enemySpeedMultiplier,
      },
    );
  }

  applyBossStats(stats: EnemyStats): EnemyStats {
    return this.mutators.reduce(
      (nextStats, mutator) => mutator.applyBossStats?.(nextStats, this.context) ?? nextStats,
      {
        ...stats,
        hp: Math.round(stats.hp * this.difficulty.bossHpMultiplier),
        damage: Math.round(stats.damage * this.difficulty.bossDamageMultiplier),
        moveSpeed: stats.moveSpeed * this.difficulty.enemySpeedMultiplier,
      },
    );
  }

  applySpawnInterval(interval: number): number {
    const difficultyInterval = interval / Math.max(0.001, this.difficulty.spawnRateMultiplier);

    return this.mutators.reduce(
      (nextInterval, mutator) => mutator.applySpawnRate?.(nextInterval, this.context)
        ?? nextInterval,
      difficultyInterval,
    );
  }

  applyTreasureDropChance(chance: number): number {
    const difficultyChance = this.clamp01(chance * this.difficulty.treasureDropMultiplier);

    return this.clamp01(this.mutators.reduce(
      (nextChance, mutator) => mutator.applyTreasureDropChance?.(nextChance, this.context)
        ?? nextChance,
      difficultyChance,
    ));
  }

  applyExpValue(exp: number): number {
    const difficultyExp = Math.max(0, Math.round(exp * this.difficulty.expMultiplier));

    return Math.max(0, Math.round(this.mutators.reduce(
      (nextExp, mutator) => mutator.applyExpValue?.(nextExp, this.context) ?? nextExp,
      difficultyExp,
    )));
  }

  applyFinalBossSpawnTime(seconds: number): number {
    return this.mutators.reduce(
      (nextSeconds, mutator) => mutator.applyFinalBossSpawnTime?.(nextSeconds, this.context)
        ?? nextSeconds,
      seconds,
    );
  }

  filterWeaponPool(weaponIds: string[]): string[] {
    return this.mutators.reduce(
      (nextWeaponIds, mutator) => mutator.filterWeaponPool?.(nextWeaponIds, this.context)
        ?? nextWeaponIds,
      [...weaponIds],
    );
  }

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
