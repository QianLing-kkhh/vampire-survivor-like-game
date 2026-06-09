import type { BossAttackController } from '../boss/BossAttackController';
import type { Enemy } from '../enemy/Enemy';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { LevelManager } from '../progression/LevelManager';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { WeaponManager } from '../weapon/WeaponManager';
import type { AutoPlayerContext, AutoPickupSnapshot, AutoTreasureSnapshot } from './AutoPlayer';

export interface AutoPlayerContextBuilderConfig {
  playerBody: {
    x: number;
    y: number;
  };
  enemies: readonly Enemy[];
  pickupPositions: readonly AutoPickupSnapshot[];
  treasurePositions: readonly AutoTreasureSnapshot[];
  playerPickupRange: number;
  playerHitRadiusPx: number;
  playerStats: PlayerStats;
  playerHealth?: PlayerHealth;
  levelManager?: LevelManager;
  weaponManager?: WeaponManager;
  gameplayContext?: GameplayContext;
  bossAttackController?: BossAttackController;
  deltaMs: number;
  worldBounds: {
    width: number;
    height: number;
  };
}

export class AutoPlayerContextBuilder {
  build(config: AutoPlayerContextBuilderConfig): AutoPlayerContext {
    const pickupRangePx = config.playerPickupRange
      * (config.gameplayContext?.characterRuntime.getPickupRangeMultiplier() ?? 1);
    const characterSnapshot = config.gameplayContext?.characterRuntime.getAutoPlayerSnapshot();

    return {
      playerPosition: config.playerBody,
      enemyPositions: config.enemies
        .filter((enemy) => !enemy.isDead)
        .map((enemy) => {
          const targetContext = enemy.getDamageTargetContext();

          return {
            id: enemy.getAutoMoveId(),
            x: enemy.body.x,
            y: enemy.body.y,
            radiusPx: enemy.body.radius,
            moveSpeed: enemy.moveSpeed,
            damage: enemy.damage,
            hpRatio: enemy.maxHp > 0 ? enemy.currentHp / enemy.maxHp : 0,
            isBoss: targetContext.isBoss,
            isElite: targetContext.isElite,
            isMiniBoss: enemy.id.endsWith('_boss'),
          };
        }),
      pickupPositions: config.pickupPositions,
      treasurePositions: config.treasurePositions,
      pickupRangePx,
      player: {
        currentHp: config.playerHealth?.currentHp ?? config.playerStats.maxHp,
        maxHp: config.playerHealth?.maxHp ?? config.playerStats.maxHp,
        level: config.levelManager?.currentLevel ?? 1,
        hitRadiusPx: config.playerHitRadiusPx,
        moveSpeed: config.playerStats.moveSpeed,
        pickupRangePx,
        characterId: characterSnapshot?.characterId,
        damageReactionType: characterSnapshot?.damageReactionType,
        baseStats: characterSnapshot?.baseStats,
      },
      weaponContext: config.weaponManager?.getAutoWeaponContext(),
      map: config.gameplayContext?.mapMechanicRuntime.getAutoMapSnapshot(),
      bossWarnings: [
        ...(config.gameplayContext?.bossController.getAutoBossWarnings() ?? []),
        ...(config.bossAttackController?.getAutoBossWarnings() ?? []),
        ...(config.gameplayContext?.endlessBossManager.getAutoBossWarnings() ?? []),
      ],
      deltaMs: config.deltaMs,
      worldBounds: config.worldBounds,
    };
  }
}
