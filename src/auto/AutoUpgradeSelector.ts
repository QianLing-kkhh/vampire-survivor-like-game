import { EVOLUTION_RULES, EvolutionRule } from '../evolution/EvolutionRule';
import { UpgradeOption } from '../progression/UpgradeOption';
import { RandomSource } from '../random/RandomSource';
import { SeededRandom } from '../random/SeededRandom';

export type AutoUpgradeSelectionMode = 'weighted_random';

export interface AutoUpgradeSelectionContext {
  weaponIds: readonly string[];
  getWeaponUpgradeTotal(weaponId: string): number;
  getPassiveLevel(passiveId: string): number;
}

export class AutoUpgradeSelector {
  private static readonly NEW_WEAPON_WEIGHT = 1.2;
  private static readonly WEAPON_UPGRADE_TOTAL_WEIGHT = 0.5;
  private static readonly PASSIVE_LEVEL_WEIGHT = 0.6;
  private static readonly EVOLUTION_FIRST_BONUS_THRESHOLD = 4;
  private static readonly EVOLUTION_SECOND_BONUS_THRESHOLD = 6;
  private static readonly EVOLUTION_READY_WEAPON_THRESHOLD = 8;
  private static readonly EVOLUTION_PASSIVE_BONUS = 1.5;
  private static readonly EVOLUTION_MISSING_PASSIVE_BONUS = 2.0;
  private static readonly EVOLUTION_MISSING_WEAPON_UPGRADE_BONUS = 2.0;
  private static readonly FOCUS_MISSING_PASSIVE_MULTIPLIER = 3;
  private static readonly FOCUS_MISSING_WEAPON_UPGRADE_MULTIPLIER = 3;
  private static readonly MAX_WEIGHT = 8;

  readonly mode: AutoUpgradeSelectionMode = 'weighted_random';
  private random: RandomSource = new SeededRandom('auto-upgrade-fallback');

  setRandomSource(random: RandomSource): void {
    this.random = random;
  }

  select(
    options: readonly UpgradeOption[],
    context?: AutoUpgradeSelectionContext,
  ): UpgradeOption | undefined {
    if (options.length === 0) {
      return undefined;
    }

    const completionOption = this.selectEvolutionCompletionOption(options, context);

    if (completionOption) {
      return completionOption;
    }

    const focusRule = this.getFocusEvolutionRule(context);

    if (focusRule && !this.isEvolutionRequirementComplete(focusRule, context)) {
      const missingRequirementOption = this.selectMissingEvolutionRequirement(
        options,
        focusRule,
        context,
      );

      if (missingRequirementOption) {
        return missingRequirementOption;
      }

      const focusCandidates = options.filter((option) => (
        this.isFocusCandidate(option.id, focusRule)
      ));

      if (focusCandidates.length > 0) {
        return this.selectWeighted(
          focusCandidates,
          context,
          (option, weight) => this.getFocusAdjustedWeight(option.id, weight, focusRule, context),
        );
      }
    }

    return this.selectWeighted(options, context);
  }

  private selectEvolutionCompletionOption(
    options: readonly UpgradeOption[],
    context?: AutoUpgradeSelectionContext,
  ): UpgradeOption | undefined {
    if (!context) {
      return undefined;
    }

    const missingPassiveRules = this.getEligibleCompletionRules(context)
      .filter((rule) => (
        context.getWeaponUpgradeTotal(rule.baseWeaponId) >= rule.requiredWeaponUpgradeTotal
        && context.getPassiveLevel(rule.requiredPassiveId) < rule.requiredPassiveLevel
        && options.some((option) => option.id === rule.requiredPassiveId)
      ));
    const missingPassiveRule = this.selectHighestUpgradeTotalRule(
      missingPassiveRules,
      context,
    );

    if (missingPassiveRule) {
      return options.find((option) => option.id === missingPassiveRule.requiredPassiveId);
    }

    const missingWeaponRules = this.getEligibleCompletionRules(context)
      .filter((rule) => (
        context.getPassiveLevel(rule.requiredPassiveId) >= rule.requiredPassiveLevel
        && context.getWeaponUpgradeTotal(rule.baseWeaponId) < rule.requiredWeaponUpgradeTotal
        && options.some((option) => this.getWeaponIdForUpgrade(option.id) === rule.baseWeaponId)
      ));
    const missingWeaponRule = this.selectHighestUpgradeTotalRule(
      missingWeaponRules,
      context,
    );

    if (!missingWeaponRule) {
      return undefined;
    }

    const weaponUpgradeCandidates = options.filter((option) => (
      this.getWeaponIdForUpgrade(option.id) === missingWeaponRule.baseWeaponId
    ));

    return this.selectWeighted(weaponUpgradeCandidates, context);
  }

  private getEligibleCompletionRules(context: AutoUpgradeSelectionContext): EvolutionRule[] {
    return EVOLUTION_RULES.filter((rule) => (
      context.weaponIds.includes(rule.baseWeaponId)
      && !context.weaponIds.includes(rule.evolvedWeaponId)
      && !this.isEvolutionRequirementComplete(rule, context)
    ));
  }

  private selectHighestUpgradeTotalRule(
    rules: readonly EvolutionRule[],
    context: AutoUpgradeSelectionContext,
  ): EvolutionRule | undefined {
    if (rules.length === 0) {
      return undefined;
    }

    const highestUpgradeTotal = Math.max(
      ...rules.map((rule) => context.getWeaponUpgradeTotal(rule.baseWeaponId)),
    );
    const highestRules = rules.filter((rule) => (
      context.getWeaponUpgradeTotal(rule.baseWeaponId) === highestUpgradeTotal
    ));
    return this.random.pick(highestRules);
  }

  private selectMissingEvolutionRequirement(
    options: readonly UpgradeOption[],
    rule: EvolutionRule,
    context?: AutoUpgradeSelectionContext,
  ): UpgradeOption | undefined {
    if (!context) {
      return undefined;
    }

    const weaponUpgradeTotal = context.getWeaponUpgradeTotal(rule.baseWeaponId);
    const passiveLevel = context.getPassiveLevel(rule.requiredPassiveId);

    if (
      weaponUpgradeTotal >= rule.requiredWeaponUpgradeTotal
      && passiveLevel < rule.requiredPassiveLevel
    ) {
      return options.find((option) => option.id === rule.requiredPassiveId);
    }

    if (
      passiveLevel >= rule.requiredPassiveLevel
      && weaponUpgradeTotal < rule.requiredWeaponUpgradeTotal
    ) {
      const weaponUpgradeCandidates = options.filter((option) => (
        this.getWeaponIdForUpgrade(option.id) === rule.baseWeaponId
      ));

      return this.selectWeighted(weaponUpgradeCandidates, context);
    }

    return undefined;
  }

  private selectWeighted(
    options: readonly UpgradeOption[],
    context?: AutoUpgradeSelectionContext,
    adjustWeight?: (option: UpgradeOption, weight: number) => number,
  ): UpgradeOption | undefined {
    if (options.length === 0) {
      return undefined;
    }

    const weightedOptions = options.map((option) => {
      const weight = this.getWeight(option, context);

      return {
        option,
        weight: Math.max(1, adjustWeight?.(option, weight) ?? weight),
      };
    });
    const totalWeight = weightedOptions.reduce(
      (total, weightedOption) => total + weightedOption.weight,
      0,
    );

    let roll = this.random.nextFloat(0, totalWeight);

    for (const weightedOption of weightedOptions) {
      roll -= weightedOption.weight;

      if (roll > 0) {
        continue;
      }

      return weightedOption.option;
    }

    return weightedOptions[weightedOptions.length - 1].option;
  }

  private getFocusEvolutionRule(
    context?: AutoUpgradeSelectionContext,
  ): EvolutionRule | undefined {
    if (!context) {
      return undefined;
    }

    const candidateRules = EVOLUTION_RULES.filter((rule) => (
      context.weaponIds.includes(rule.baseWeaponId)
      && !context.weaponIds.includes(rule.evolvedWeaponId)
    ));

    if (candidateRules.length === 0) {
      return undefined;
    }

    const highestUpgradeTotal = Math.max(
      ...candidateRules.map((rule) => context.getWeaponUpgradeTotal(rule.baseWeaponId)),
    );
    const highestRules = candidateRules.filter((rule) => (
      context.getWeaponUpgradeTotal(rule.baseWeaponId) === highestUpgradeTotal
    ));
    return this.random.pick(highestRules);
  }

  private isFocusCandidate(upgradeId: string, rule: EvolutionRule): boolean {
    return (
      upgradeId === rule.requiredPassiveId
      || this.getWeaponIdForUpgrade(upgradeId) === rule.baseWeaponId
    );
  }

  private getFocusAdjustedWeight(
    upgradeId: string,
    weight: number,
    rule: EvolutionRule,
    context?: AutoUpgradeSelectionContext,
  ): number {
    if (!context) {
      return weight;
    }

    const weaponUpgradeTotal = context.getWeaponUpgradeTotal(rule.baseWeaponId);
    const passiveLevel = context.getPassiveLevel(rule.requiredPassiveId);

    if (
      upgradeId === rule.requiredPassiveId
      && weaponUpgradeTotal >= rule.requiredWeaponUpgradeTotal
      && passiveLevel < rule.requiredPassiveLevel
    ) {
      return weight * AutoUpgradeSelector.FOCUS_MISSING_PASSIVE_MULTIPLIER;
    }

    if (
      this.getWeaponIdForUpgrade(upgradeId) === rule.baseWeaponId
      && passiveLevel >= rule.requiredPassiveLevel
      && weaponUpgradeTotal < rule.requiredWeaponUpgradeTotal
    ) {
      return weight * AutoUpgradeSelector.FOCUS_MISSING_WEAPON_UPGRADE_MULTIPLIER;
    }

    return weight;
  }

  private isEvolutionRequirementComplete(
    rule: EvolutionRule,
    context?: AutoUpgradeSelectionContext,
  ): boolean {
    if (!context) {
      return false;
    }

    return (
      context.getWeaponUpgradeTotal(rule.baseWeaponId) >= rule.requiredWeaponUpgradeTotal
      && context.getPassiveLevel(rule.requiredPassiveId) >= rule.requiredPassiveLevel
    );
  }

  private getWeight(
    option: UpgradeOption,
    context?: AutoUpgradeSelectionContext,
  ): number {
    let weight = 1;

    if (this.isNewWeaponUpgrade(option.id)) {
      weight = AutoUpgradeSelector.NEW_WEAPON_WEIGHT;
    }

    const weaponId = this.getWeaponIdForUpgrade(option.id);

    if (weaponId && context?.weaponIds.includes(weaponId)) {
      weight = 1 + context.getWeaponUpgradeTotal(weaponId)
        * AutoUpgradeSelector.WEAPON_UPGRADE_TOTAL_WEIGHT;
    }

    if (this.isPassiveUpgrade(option.id)) {
      weight = 1 + (context?.getPassiveLevel(option.id) ?? 0)
        * AutoUpgradeSelector.PASSIVE_LEVEL_WEIGHT;
    }

    weight += this.getEvolutionWeightBonus(option.id, context);

    return Math.max(1, Math.min(weight, AutoUpgradeSelector.MAX_WEIGHT));
  }

  private getEvolutionWeightBonus(
    upgradeId: string,
    context?: AutoUpgradeSelectionContext,
  ): number {
    if (!context) {
      return 0;
    }

    let bonus = 0;
    const upgradedWeaponId = this.getWeaponIdForUpgrade(upgradeId);

    for (const rule of EVOLUTION_RULES) {
      const hasBaseWeapon = context.weaponIds.includes(rule.baseWeaponId);
      const hasEvolvedWeapon = context.weaponIds.includes(rule.evolvedWeaponId);

      if (!hasBaseWeapon || hasEvolvedWeapon) {
        continue;
      }

      const weaponUpgradeTotal = context.getWeaponUpgradeTotal(rule.baseWeaponId);
      const passiveLevel = context.getPassiveLevel(rule.requiredPassiveId);

      if (upgradeId === rule.requiredPassiveId) {
        if (weaponUpgradeTotal >= AutoUpgradeSelector.EVOLUTION_FIRST_BONUS_THRESHOLD) {
          bonus += AutoUpgradeSelector.EVOLUTION_PASSIVE_BONUS;
        }

        if (weaponUpgradeTotal >= AutoUpgradeSelector.EVOLUTION_SECOND_BONUS_THRESHOLD) {
          bonus += AutoUpgradeSelector.EVOLUTION_PASSIVE_BONUS;
        }

        if (
          weaponUpgradeTotal >= AutoUpgradeSelector.EVOLUTION_READY_WEAPON_THRESHOLD
          && passiveLevel < rule.requiredPassiveLevel
        ) {
          bonus += AutoUpgradeSelector.EVOLUTION_MISSING_PASSIVE_BONUS;
        }
      }

      if (
        upgradedWeaponId === rule.baseWeaponId
        && passiveLevel >= rule.requiredPassiveLevel
        && weaponUpgradeTotal < rule.requiredWeaponUpgradeTotal
      ) {
        bonus += AutoUpgradeSelector.EVOLUTION_MISSING_WEAPON_UPGRADE_BONUS;
      }
    }

    return bonus;
  }

  private isNewWeaponUpgrade(upgradeId: string): boolean {
    return (
      upgradeId === 'add_garlic'
      || upgradeId === 'add_bible'
      || upgradeId === 'add_magic_wand'
      || upgradeId === 'add_axe'
    );
  }

  private isPassiveUpgrade(upgradeId: string): boolean {
    return (
      upgradeId === 'spinach'
      || upgradeId === 'empty_tome'
      || upgradeId === 'bracer'
      || upgradeId === 'clover'
      || upgradeId === 'pummarola'
    );
  }

  private getWeaponIdForUpgrade(upgradeId: string): string | undefined {
    if (upgradeId === 'knife_damage_up' || upgradeId === 'knife_cooldown_up') {
      return 'knife';
    }

    if (upgradeId === 'garlic_damage_up' || upgradeId === 'garlic_radius_up') {
      return 'garlic';
    }

    if (
      upgradeId === 'bible_damage_up'
      || upgradeId === 'bible_orbit_speed_up'
      || upgradeId === 'bible_orbit_count_up'
    ) {
      return 'bible';
    }

    if (
      upgradeId === 'magic_wand_damage_up'
      || upgradeId === 'magic_wand_cooldown_up'
      || upgradeId === 'magic_wand_projectile_count_up'
    ) {
      return 'magic_wand';
    }

    if (
      upgradeId === 'axe_damage_up'
      || upgradeId === 'axe_cooldown_up'
      || upgradeId === 'axe_projectile_count_up'
    ) {
      return 'axe';
    }

    return undefined;
  }
}
