import { BossDashImpactResolver } from '../boss/BossDashImpactResolver';
import type { Enemy } from '../enemy/Enemy';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerHealth } from '../player/PlayerHealth';
import { knockPlayerBackFromPoint } from '../player/PlayerKnockback';
import type { RunState } from '../run/RunState';

export interface GameSceneBossDamageContext {
  enemies: Enemy[];
  player?: PlayerController;
  playerHealth?: PlayerHealth;
  runState: RunState;
  contactDamageCooldowns: Map<Enemy, number>;
  recordPlayerDamage: (actualDamage: number) => void;
  dashImpactRadius: number;
  dashImpactDamage: number;
  dashKnockbackDistance: number;
  contactDamageCooldownMs: number;
}

export class GameSceneBossDamageUpdater {
  private readonly bossDashImpactResolver = new BossDashImpactResolver();

  applyProjectileDamage(damage: number, context: GameSceneBossDamageContext): void {
    if (!context.playerHealth) {
      return;
    }

    const actualDamage = context.playerHealth.takeDamage(damage);

    if (actualDamage <= 0) {
      return;
    }

    context.recordPlayerDamage(actualDamage);
  }

  updateDashImpacts(context: GameSceneBossDamageContext): void {
    if (!context.player || !context.playerHealth) {
      return;
    }

    const hits = this.bossDashImpactResolver.resolveHits({
      enemies: context.enemies,
      playerPosition: context.player.getPositionLike(),
      impactRadius: context.dashImpactRadius,
    });

    for (const hit of hits) {
      const actualDamage = context.playerHealth.takeDamage(
        context.dashImpactDamage,
      );

      if (actualDamage <= 0) {
        continue;
      }

      context.runState.recordBossDashHit();
      context.recordPlayerDamage(actualDamage);
      knockPlayerBackFromPoint(
        context.player,
        hit.impactPosition,
        context.dashKnockbackDistance,
      );
      context.contactDamageCooldowns.set(hit.enemy, context.contactDamageCooldownMs);
    }
  }
}
