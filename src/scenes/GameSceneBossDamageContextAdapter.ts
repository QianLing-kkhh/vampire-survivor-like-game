import type { Enemy } from '../enemy/Enemy';
import type { GameSceneBossDamageContext } from './GameSceneBossDamageUpdater';
import type { PlayerController } from '../player/PlayerController';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { RunState } from '../run/RunState';

export interface GameSceneBossDamageScenePort {
  enemies: Enemy[];
  player?: PlayerController;
  playerHealth?: PlayerHealth;
  runState: RunState;
  contactDamageCooldowns: Map<Enemy, number>;
  recordPlayerDamage(actualDamage: number): void;
}

export interface GameSceneBossDamageConstants {
  dashImpactRadius: number;
  dashImpactDamage: number;
  dashKnockbackDistance: number;
  contactDamageCooldownMs: number;
}

export class GameSceneBossDamageContextAdapter {
  build(
    scene: GameSceneBossDamageScenePort,
    constants: GameSceneBossDamageConstants,
  ): GameSceneBossDamageContext {
    return {
      enemies: scene.enemies,
      player: scene.player,
      playerHealth: scene.playerHealth,
      runState: scene.runState,
      contactDamageCooldowns: scene.contactDamageCooldowns,
      recordPlayerDamage: (actualDamage: number) => scene.recordPlayerDamage(actualDamage),
      dashImpactRadius: constants.dashImpactRadius,
      dashImpactDamage: constants.dashImpactDamage,
      dashKnockbackDistance: constants.dashKnockbackDistance,
      contactDamageCooldownMs: constants.contactDamageCooldownMs,
    };
  }
}
