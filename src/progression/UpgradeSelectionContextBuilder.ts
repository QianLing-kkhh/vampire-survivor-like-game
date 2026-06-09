import type { AutoUpgradeSelectionContext } from '../auto/AutoUpgradeSelector';
import type { Enemy } from '../enemy/Enemy';
import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { WeaponManager } from '../weapon/WeaponManager';
import type { UpgradeSelectionContext } from './UpgradeSelector';

type PlayerPosition = {
  x: number;
  y: number;
};

export type UpgradeSelectionContextBuilderConfig = {
  weaponManager?: WeaponManager;
  passiveManager?: PassiveManager;
  playerStats?: PlayerStats;
  playerHealth?: PlayerHealth;
};

export type AutoUpgradeSelectionContextBuilderConfig = UpgradeSelectionContextBuilderConfig & {
  gameplayContext?: GameplayContext;
  playerPosition?: PlayerPosition;
  enemies: readonly Enemy[];
  pickupPositions: readonly { x: number; y: number; exp: number }[];
  treasureCount: number;
};

export class UpgradeSelectionContextBuilder {
  buildUpgradeSelectionContext(
    config: UpgradeSelectionContextBuilderConfig,
  ): UpgradeSelectionContext {
    const {
      weaponManager,
      passiveManager,
      playerStats,
      playerHealth,
    } = config;

    return {
      hasWeapon: (weaponId: string) => weaponManager?.hasWeapon(weaponId) ?? false,
      getWeaponStat: (weaponId, stat) => weaponManager?.getWeaponStat(weaponId, stat),
      getPassiveLevel: (passiveId: string) => passiveManager?.getLevel(passiveId) ?? 0,
      isWeaponUpgradeLimitReached: (weaponId: string) => (
        weaponManager?.isWeaponUpgradeLimitReached(weaponId) ?? false
      ),
      hasWeaponOrEvolution: (weaponId: string) => (
        weaponManager?.hasWeaponOrEvolution(weaponId) ?? false
      ),
      isBaseWeaponEvolved: (weaponId: string) => (
        weaponManager?.isBaseWeaponEvolved(weaponId) ?? false
      ),
      getPlayerStat: (stat) => {
        switch (stat) {
          case 'moveSpeed':
            return playerStats?.moveSpeed ?? 0;
          case 'pickupRange':
            return playerStats?.pickupRange ?? 0;
          case 'maxHp':
            return playerHealth?.maxHp ?? playerStats?.maxHp ?? 0;
          default:
            return 0;
        }
      },
      getPlayerStatLimit: (stat) => {
        switch (stat) {
          case 'moveSpeed':
            return playerStats?.maxMoveSpeed ?? Infinity;
          case 'pickupRange':
            return playerStats?.maxPickupRange ?? Infinity;
          case 'maxHp':
            return playerStats?.maxHpLimit ?? Infinity;
          default:
            return Infinity;
        }
      },
    };
  }

  buildAutoUpgradeSelectionContext(
    config: AutoUpgradeSelectionContextBuilderConfig,
  ): AutoUpgradeSelectionContext {
    const {
      gameplayContext,
      weaponManager,
      passiveManager,
      playerStats,
      playerHealth,
      playerPosition,
      enemies,
      pickupPositions,
      treasureCount,
    } = config;
    const characterSnapshot = gameplayContext?.characterRuntime.getAutoPlayerSnapshot();
    const weaponContext = weaponManager?.getAutoWeaponContext();
    const hpRatio = playerHealth && playerHealth.maxHp > 0
      ? playerHealth.currentHp / playerHealth.maxHp
      : 1;
    let nearestEnemyDistance = Infinity;
    let enemyPressure = 0;
    let bossThreat = false;

    if (playerPosition) {
      for (const enemy of enemies) {
        if (enemy.isDead) {
          continue;
        }

        const distance = Math.hypot(
          playerPosition.x - enemy.body.x,
          playerPosition.y - enemy.body.y,
        );
        nearestEnemyDistance = Math.min(nearestEnemyDistance, distance);

        if (distance <= 300) {
          const proximity = (300 - Math.max(0, distance)) / 300;
          const targetContext = enemy.getDamageTargetContext();
          const threat = targetContext.isBoss
            ? 4
            : targetContext.isElite
              ? 2
              : 1;

          enemyPressure += proximity * proximity * threat * (hpRatio < 0.5 ? 1.25 : 1);
          bossThreat ||= targetContext.isBoss && distance < 520;
        }
      }
    }

    return {
      weaponIds: weaponManager?.getWeaponIds() ?? [],
      weapons: weaponContext?.weapons,
      player: {
        currentHp: playerHealth?.currentHp ?? playerStats?.maxHp ?? 0,
        maxHp: playerHealth?.maxHp ?? playerStats?.maxHp ?? 0,
        shieldStacks: playerHealth?.getShieldStacks() ?? 0,
      },
      character: {
        characterId: characterSnapshot?.characterId,
        damageReactionType: characterSnapshot?.damageReactionType,
        baseStats: characterSnapshot?.baseStats,
      },
      battle: {
        enemyPressure,
        nearestEnemyDistance,
        bossThreat,
      },
      resources: {
        pickupCount: pickupPositions.length,
        pickupExpTotal: pickupPositions.reduce((total, pickup) => total + Math.max(1, pickup.exp), 0),
        treasureCount,
      },
      getWeaponUpgradeTotal: (weaponId: string) => (
        weaponManager?.getWeaponUpgradeTotal(weaponId) ?? 0
      ),
      getPassiveLevel: (passiveId: string) => passiveManager?.getLevel(passiveId) ?? 0,
    };
  }
}
