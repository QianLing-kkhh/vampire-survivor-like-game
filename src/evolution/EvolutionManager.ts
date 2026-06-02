import { WeaponManager } from '../weapon/WeaponManager';

import { EvolutionResult, EvolutionRule } from './EvolutionRule';

export interface EvolutionContext {
  weaponManager: WeaponManager;
  getPassiveLevel(passiveId: string): number;
}

export class EvolutionManager {
  constructor(private readonly rules: readonly EvolutionRule[]) {}

  tryEvolve(context: EvolutionContext): EvolutionResult | undefined {
    const eligibleRules = this.rules.filter((rule) => (
      this.canEvolve(rule, context)
    ));

    if (eligibleRules.length === 0) {
      return undefined;
    }

    const rule = eligibleRules[Math.floor(Math.random() * eligibleRules.length)];

    if (!context.weaponManager.evolveWeapon(rule.baseWeaponId, rule.evolvedWeaponId)) {
      return undefined;
    }

    return {
      baseWeaponId: rule.baseWeaponId,
      evolvedWeaponId: rule.evolvedWeaponId,
    };
  }

  hasEligibleEvolution(context: EvolutionContext): boolean {
    return this.rules.some((rule) => this.canEvolve(rule, context));
  }

  private canEvolve(rule: EvolutionRule, context: EvolutionContext): boolean {
    return (
      context.weaponManager.hasWeapon(rule.baseWeaponId)
      && !context.weaponManager.hasWeapon(rule.evolvedWeaponId)
      && context.getPassiveLevel(rule.requiredPassiveId) >= rule.requiredPassiveLevel
      && context.weaponManager.getWeaponUpgradeTotal(rule.baseWeaponId)
        >= rule.requiredWeaponUpgradeTotal
    );
  }
}
