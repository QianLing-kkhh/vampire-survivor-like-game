import { EnemyStats } from '../Enemy';

import { EnemyModifier } from './EnemyModifier';
import { FastModifierConfig } from './EnemyModifierConfig';

export class FastModifier implements EnemyModifier {
  readonly type = 'fast' as const;

  constructor(private readonly config: FastModifierConfig) {}

  applyStats(stats: EnemyStats): EnemyStats {
    return {
      ...stats,
      moveSpeed: stats.moveSpeed * (this.config.speedMultiplier ?? 1.35),
    };
  }

  getDisplayTags(): string[] {
    return ['Fast'];
  }
}
