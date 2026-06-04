import { EnemyStats } from '../../enemy/Enemy';
import { Mutator } from '../Mutator';
import { EnemyStatMutatorConfig } from '../MutatorConfig';
import { MutatorContext } from '../MutatorContext';

export class EnemyStatMutator implements Mutator {
  readonly id: string;
  readonly type = 'enemyStat';

  constructor(private readonly config: EnemyStatMutatorConfig) {
    this.id = config.id ?? config.type;
  }

  applyEnemyStats(stats: EnemyStats, _context: MutatorContext): EnemyStats {
    return this.applyStats(stats);
  }

  applyBossStats(stats: EnemyStats, _context: MutatorContext): EnemyStats {
    return this.applyStats(stats);
  }

  private applyStats(stats: EnemyStats): EnemyStats {
    return {
      ...stats,
      hp: Math.round(stats.hp * (this.config.enemyHpMultiplier ?? 1)),
      damage: Math.round(stats.damage * (this.config.enemyDamageMultiplier ?? 1)),
      moveSpeed: stats.moveSpeed * (this.config.enemySpeedMultiplier ?? 1),
    };
  }
}
