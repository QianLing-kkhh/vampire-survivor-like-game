import Phaser from 'phaser';

import type { Enemy } from '../enemy/Enemy';

export interface BossDashImpactHit {
  enemy: Enemy;
  impactPosition: Phaser.Math.Vector2;
}

export class BossDashImpactResolver {
  resolveHits(context: {
    enemies: readonly Enemy[];
    playerPosition: { x: number; y: number };
    impactRadius: number;
  }): BossDashImpactHit[] {
    const hits: BossDashImpactHit[] = [];

    for (const enemy of context.enemies) {
      if (enemy.isDead) {
        continue;
      }

      const impactPosition = enemy.consumeDashImpact();

      if (!impactPosition) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        context.playerPosition.x,
        context.playerPosition.y,
        impactPosition.x,
        impactPosition.y,
      );

      if (distance > context.impactRadius || !enemy.consumeDashHit()) {
        continue;
      }

      hits.push({ enemy, impactPosition });
    }

    return hits;
  }
}
