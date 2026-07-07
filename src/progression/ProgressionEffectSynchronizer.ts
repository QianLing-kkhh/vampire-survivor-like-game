import type { GameplayContext } from '../gameplay/GameplayContext';
import type { PassiveManager } from '../passive/PassiveManager';
import type { PlayerHealth } from '../player/PlayerHealth';
import type { PlayerStats } from '../player/PlayerStats';
import type { TreasureManager } from '../pickup/TreasureManager';
import type { WeaponManager } from '../weapon/WeaponManager';

export interface ProgressionEffectSyncContext {
  gameplayContext?: GameplayContext;
  passiveManager?: PassiveManager;
  playerStats?: PlayerStats;
  playerHealth?: PlayerHealth;
  treasureManager?: TreasureManager;
  weaponManager?: WeaponManager;
}

export class ProgressionEffectSynchronizer {
  handleUpgradeApplied(context: ProgressionEffectSyncContext): number {
    this.syncPassiveEffects(context);
    return this.syncPlayerPickupRange(context);
  }

  applyCharacterLevelStats(
    level: number,
    context: ProgressionEffectSyncContext,
  ): number {
    if (!context.gameplayContext || !context.playerStats || !context.playerHealth) {
      return this.syncPlayerPickupRange(context);
    }

    const previousMaxHp = context.playerStats.maxHp;
    const baseStats = context.gameplayContext.characterRuntime.setLevel(level);

    context.playerStats.setCharacterBaseStats(baseStats);

    const maxHpIncrease = context.playerStats.maxHp - previousMaxHp;

    if (maxHpIncrease > 0) {
      context.playerHealth.increaseMaxHp(
        maxHpIncrease,
        false,
        context.playerStats.maxHpLimit,
      );
    }

    this.syncPassiveEffects(context);
    return this.syncPlayerPickupRange(context);
  }

  syncPlayerPickupRange(context: ProgressionEffectSyncContext): number {
    const relicPickupRangeMultiplier = context.gameplayContext
      ?.relicManager.getStatModifiers().pickupRangeMultiplier ?? 1;
    const playerPickupRange = (context.playerStats?.pickupRange ?? 0)
      * 48
      * relicPickupRangeMultiplier;

    if (context.gameplayContext) {
      context.gameplayContext.playerPickupRange = playerPickupRange;
    }

    return playerPickupRange;
  }

  private syncPassiveEffects(context: ProgressionEffectSyncContext): void {
    const effects = context.passiveManager?.getEffects();

    if (!effects) {
      return;
    }

    context.weaponManager?.setPassiveModifiers({
      damageMultiplier: effects.damageMultiplier,
      cooldownMultiplier: effects.cooldownMultiplier,
      projectileSpeedMultiplier: effects.projectileSpeedMultiplier,
    });
    context.gameplayContext?.syncCharacterCombatModifiers();
    context.treasureManager?.setBonusDropChance(effects.treasureDropBonus);
  }
}
