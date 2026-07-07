import type { PassiveManager } from '../passive/PassiveManager';
import type { WeaponManager } from '../weapon/WeaponManager';

import type { EvolutionManager } from './EvolutionManager';

export class EvolutionCandidateStatsFormatter {
  format(context: {
    evolutionManager?: EvolutionManager;
    weaponManager?: WeaponManager;
    passiveManager?: PassiveManager;
  }): string {
    if (!context.weaponManager) {
      return '';
    }

    return (context.evolutionManager?.getEvolutionRules() ?? []).map((rule) => {
      const weaponUpgradeTotal = context.weaponManager?.getWeaponUpgradeTotal(rule.baseWeaponId) ?? 0;
      const passiveLevel = context.passiveManager?.getLevel(rule.requiredPassiveId) ?? 0;
      const hasBase = context.weaponManager?.hasWeapon(rule.baseWeaponId) ?? false;
      const hasEvolved = context.weaponManager?.hasWeapon(rule.evolvedWeaponId) ?? false;
      const eligible = hasBase
        && !hasEvolved
        && weaponUpgradeTotal >= rule.requiredWeaponUpgradeTotal
        && passiveLevel >= rule.requiredPassiveLevel;

      return [
        `${rule.baseWeaponId}->${rule.evolvedWeaponId}`,
        `weapon=${weaponUpgradeTotal}/${rule.requiredWeaponUpgradeTotal}`,
        `passive=${rule.requiredPassiveId}:${passiveLevel}/${rule.requiredPassiveLevel}`,
        `base=${hasBase ? 'true' : 'false'}`,
        `evolved=${hasEvolved ? 'true' : 'false'}`,
        `eligible=${eligible ? 'true' : 'false'}`,
      ].join(';');
    }).join('|');
  }
}
