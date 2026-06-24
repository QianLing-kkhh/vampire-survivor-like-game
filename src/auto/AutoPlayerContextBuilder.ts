import type { BossAttackController } from '../boss/BossAttackController';
import type { EnemyQuery } from '../enemy/EnemyQuery';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { LevelManager } from '../progression/LevelManager';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerQuery } from '../player/PlayerQuery';
import type { PlayerStats } from '../player/PlayerStats';
import type { WeaponManager } from '../weapon/WeaponManager';
import type { AutoPlayerContext, AutoPickupSnapshot, AutoTreasureSnapshot } from './AutoPlayerTypes';

export interface AutoPlayerContextBuilderConfig {
  player: PlayerQuery;
  enemies: readonly EnemyQuery[];
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
    const playerPosition = config.player.getPositionLike();
    const playerVelocity = config.player.getVelocityLike();
    const playerAimDirection = config.player.getAimDirectionLike();
    const playerFacingDirection = config.player.getFacingDirectionLike();

    return {
      playerPosition: {
        x: playerPosition.x,
        y: playerPosition.y,
      },
      enemyPositions: config.enemies
        .filter((enemy) => enemy.isAlive())
        .map((enemy) => {
          const snapshot = enemy.getEnemySnapshot();
          const health = snapshot.health;

          return {
            id: snapshot.autoMoveId,
            enemyId: snapshot.id,
            x: snapshot.position.x,
            y: snapshot.position.y,
            radiusPx: snapshot.collisionRadius,
            moveSpeed: snapshot.moveSpeed,
            damage: snapshot.damage,
            hpRatio: health.maxHp > 0 ? health.currentHp / health.maxHp : 0,
            isBoss: snapshot.boss,
            isElite: snapshot.elite,
            isMiniBoss: snapshot.miniBoss,
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
        radiusPx: config.player.getCollisionRadius(),
        velocity: {
          x: playerVelocity.x,
          y: playerVelocity.y,
        },
        aimDirection: {
          x: playerAimDirection.x,
          y: playerAimDirection.y,
        },
        facingDirection: {
          x: playerFacingDirection.x,
          y: playerFacingDirection.y,
        },
        isAlive: config.player.isAlive(),
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
