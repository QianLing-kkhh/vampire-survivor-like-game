import type { CharacterDamageReactionType } from '../character/CharacterDamageReactionSkill';
import type { CharacterBaseStats } from '../character/CharacterDefinition';
import { EVOLUTION_RULES, EvolutionRule } from '../evolution/EvolutionRule';
import { UpgradeOption } from '../progression/UpgradeOption';
import type { RandomSource } from '../random/RandomSource';
import type { AutoWeaponSnapshot } from './AutoPlayer';

export type AutoUpgradeSelectionMode = 'score_best';
export type AutoUpgradeSelectionSource = 'levelUp' | 'treasure';

export interface AutoUpgradeSelectionContext {
  source?: AutoUpgradeSelectionSource;
  weaponIds: readonly string[];
  weapons?: readonly AutoWeaponSnapshot[];
  player?: {
    currentHp: number;
    maxHp: number;
    shieldStacks?: number;
  };
  character?: {
    characterId?: string;
    damageReactionType?: CharacterDamageReactionType;
    baseStats?: Partial<CharacterBaseStats>;
  };
  battle?: {
    enemyPressure?: number;
    nearestEnemyDistance?: number;
    bossThreat?: boolean;
  };
  resources?: {
    pickupCount?: number;
    pickupExpTotal?: number;
    treasureCount?: number;
  };
  endless?: {
    started?: boolean;
    shieldStacks?: number;
    maxShieldStacks?: number;
    overdriveAvailable?: boolean;
    enemySlowAvailable?: boolean;
    vacuumAvailable?: boolean;
    vacuumCooldownRemainingSeconds?: number;
  };
  getWeaponUpgradeTotal(weaponId: string): number;
  getPassiveLevel(passiveId: string): number;
}

export class AutoUpgradeSelector {
  private static readonly LOW_HP_RATIO = 0.35;
  private static readonly HIGH_PRESSURE = 5;
  private static readonly NEAR_ENEMY_DISTANCE = 150;
  private static readonly VACUUM_PICKUP_COUNT_THRESHOLD = 70;
  private static readonly VACUUM_EXP_THRESHOLD = 180;
  private static readonly VACUUM_TREASURE_THRESHOLD = 2;

  readonly mode: AutoUpgradeSelectionMode = 'score_best';

  setRandomSource(_random: RandomSource): void {
    // Kept for the existing initializer contract. Selection is deterministic.
  }

  select(
    options: readonly UpgradeOption[],
    context?: AutoUpgradeSelectionContext,
  ): UpgradeOption | undefined {
    if (options.length === 0) {
      return undefined;
    }

    return [...options]
      .map((option) => ({
        option,
        score: this.getOptionScore(option, context),
      }))
      .sort((a, b) => (
        b.score - a.score
          || a.option.id.localeCompare(b.option.id)
      ))[0]?.option;
  }

  selectEvolutionRule(
    rules: readonly EvolutionRule[],
    context?: AutoUpgradeSelectionContext,
  ): EvolutionRule | undefined {
    if (rules.length === 0) {
      return undefined;
    }

    return [...rules]
      .map((rule) => ({
        rule,
        score: this.getEvolutionRuleScore(rule, context),
      }))
      .sort((a, b) => (
        b.score - a.score
          || a.rule.evolvedWeaponId.localeCompare(b.rule.evolvedWeaponId)
      ))[0]?.rule;
  }

  private getOptionScore(
    option: UpgradeOption,
    context?: AutoUpgradeSelectionContext,
  ): number {
    const source = context?.source ?? 'levelUp';
    let score = source === 'treasure' ? 12 : 8;

    score += this.getEvolutionProgressScore(option.id, context);
    score += this.getStateScore(option.id, context);
    score += this.getBuildScore(option.id, context);
    score += this.getCharacterSynergyScore(option.id, context);
    score += this.getEndlessRewardScore(option.id, context);

    if (source === 'treasure') {
      score += this.getTreasureImmediateScore(option.id, context);
    }

    return score;
  }

  private getEvolutionProgressScore(
    upgradeId: string,
    context?: AutoUpgradeSelectionContext,
  ): number {
    if (!context) {
      return 0;
    }

    let score = 0;
    const upgradedWeaponId = this.getWeaponIdForUpgrade(upgradeId);

    for (const rule of EVOLUTION_RULES) {
      if (
        !context.weaponIds.includes(rule.baseWeaponId)
        || context.weaponIds.includes(rule.evolvedWeaponId)
      ) {
        continue;
      }

      const weaponTotal = context.getWeaponUpgradeTotal(rule.baseWeaponId);
      const passiveLevel = context.getPassiveLevel(rule.requiredPassiveId);
      const weaponProgress = Math.min(1, weaponTotal / Math.max(1, rule.requiredWeaponUpgradeTotal));
      const passiveProgress = Math.min(1, passiveLevel / Math.max(1, rule.requiredPassiveLevel));

      if (upgradeId === rule.requiredPassiveId) {
        score += 80 + weaponProgress * 180;

        if (weaponTotal >= rule.requiredWeaponUpgradeTotal && passiveLevel < rule.requiredPassiveLevel) {
          score += 1200;
        }
      }

      if (upgradedWeaponId === rule.baseWeaponId) {
        score += 60 + passiveProgress * 160 + weaponTotal * 12;

        if (passiveLevel >= rule.requiredPassiveLevel && weaponTotal < rule.requiredWeaponUpgradeTotal) {
          score += 950;
        }
      }
    }

    return score;
  }

  private getEvolutionRuleScore(
    rule: EvolutionRule,
    context?: AutoUpgradeSelectionContext,
  ): number {
    const weaponTotal = context?.getWeaponUpgradeTotal(rule.baseWeaponId) ?? 0;
    const passiveLevel = context?.getPassiveLevel(rule.requiredPassiveId) ?? 0;

    return 2000
      + weaponTotal * 24
      + passiveLevel * 18
      + this.getWeaponSynergyScore(rule.baseWeaponId, context) * 5
      + (context?.source === 'treasure' ? 120 : 0);
  }

  private getStateScore(
    upgradeId: string,
    context?: AutoUpgradeSelectionContext,
  ): number {
    const hpRatio = this.getHpRatio(context);
    const pressure = context?.battle?.enemyPressure ?? 0;
    const nearestEnemyDistance = context?.battle?.nearestEnemyDistance ?? Infinity;
    const bossThreat = context?.battle?.bossThreat === true;
    const lowHp = hpRatio < AutoUpgradeSelector.LOW_HP_RATIO;
    const highPressure = pressure >= AutoUpgradeSelector.HIGH_PRESSURE
      || nearestEnemyDistance < AutoUpgradeSelector.NEAR_ENEMY_DISTANCE
      || bossThreat;
    let score = 0;

    if (lowHp || highPressure) {
      if (upgradeId === 'max_hp_up' || upgradeId === 'pummarola') {
        score += lowHp ? 180 : 90;
      }

      if (upgradeId === 'speed_up' || upgradeId === 'bracer') {
        score += highPressure ? 52 : 24;
      }

      if (this.isCooldownUpgrade(upgradeId) || upgradeId === 'empty_tome') {
        score += 42;
      }
    } else {
      if (this.isDamageUpgrade(upgradeId) || upgradeId === 'spinach') {
        score += 58;
      }

      if (this.isProjectileCountUpgrade(upgradeId)) {
        score += 50;
      }

      if (upgradeId === 'pickup_range_up' || upgradeId === 'clover') {
        score += 28;
      }
    }

    return score;
  }

  private getBuildScore(
    upgradeId: string,
    context?: AutoUpgradeSelectionContext,
  ): number {
    if (this.isNewWeaponUpgrade(upgradeId)) {
      return 34;
    }

    const weaponId = this.getWeaponIdForUpgrade(upgradeId);

    if (weaponId) {
      const total = context?.getWeaponUpgradeTotal(weaponId) ?? 0;
      return 34 + total * 14 + this.getWeaponSynergyScore(weaponId, context) * 4;
    }

    if (this.isPassiveUpgrade(upgradeId)) {
      return 26 + (context?.getPassiveLevel(upgradeId) ?? 0) * 16;
    }

    return 12;
  }

  private getTreasureImmediateScore(
    upgradeId: string,
    context?: AutoUpgradeSelectionContext,
  ): number {
    let score = 0;

    if (this.isDamageUpgrade(upgradeId) || this.isCooldownUpgrade(upgradeId)) {
      score += 34;
    }

    if (this.getEvolutionProgressScore(upgradeId, context) > 0) {
      score += 40;
    }

    if (upgradeId === 'endless_growth_damage') {
      score += 20;
    }

    return score;
  }

  private getCharacterSynergyScore(
    upgradeId: string,
    context?: AutoUpgradeSelectionContext,
  ): number {
    const reactionType = context?.character?.damageReactionType;
    let score = 0;

    if (reactionType === 'holySanctuary' || reactionType === 'ironCounter') {
      if (upgradeId === 'max_hp_up' || upgradeId === 'pummarola' || upgradeId === 'endless_shield') {
        score += 36;
      }
    }

    if (reactionType === 'slowTrail') {
      if (upgradeId === 'speed_up' || upgradeId === 'empty_tome' || upgradeId === 'endless_enemy_slow') {
        score += 34;
      }
    }

    if (reactionType === 'blinkForward') {
      if (upgradeId === 'speed_up' || upgradeId === 'bracer' || this.isCooldownUpgrade(upgradeId)) {
        score += 28;
      }
    }

    return score;
  }

  private getEndlessRewardScore(
    upgradeId: string,
    context?: AutoUpgradeSelectionContext,
  ): number {
    const hpRatio = this.getHpRatio(context);
    const pressure = context?.battle?.enemyPressure ?? 0;
    const bossThreat = context?.battle?.bossThreat === true;
    const shieldStacks = context?.endless?.shieldStacks ?? context?.player?.shieldStacks ?? 0;
    const maxShieldStacks = Math.max(1, context?.endless?.maxShieldStacks ?? 20);

    switch (upgradeId) {
      case 'endless_heal':
        return hpRatio < 0.35 ? 360 : hpRatio < 0.7 ? 90 : -80;
      case 'endless_shield':
        return shieldStacks >= maxShieldStacks
          ? -200
          : 120 + (1 - shieldStacks / maxShieldStacks) * 90 + (hpRatio < 0.5 ? 80 : 0);
      case 'endless_enemy_slow':
        return context?.endless?.enemySlowAvailable === false
          ? -200
          : 80 + pressure * 16 + (bossThreat ? 90 : 0);
      case 'endless_overdrive':
        return context?.endless?.overdriveAvailable === false
          ? -200
          : 95 + (bossThreat ? 120 : 0) + (hpRatio > 0.55 ? 40 : 0);
      case 'endless_growth_damage':
        return hpRatio > 0.45 && pressure < AutoUpgradeSelector.HIGH_PRESSURE ? 135 : 45;
      case 'vacuum_all_pickups':
        return this.getVacuumScore(context);
      default:
        return 0;
    }
  }

  private getVacuumScore(context?: AutoUpgradeSelectionContext): number {
    if (context?.source !== 'treasure') {
      return -300;
    }

    if (context.endless?.vacuumAvailable === false) {
      return -300;
    }

    if ((context.endless?.vacuumCooldownRemainingSeconds ?? 0) > 0) {
      return -500;
    }

    const hpRatio = this.getHpRatio(context);

    if (hpRatio < 0.35) {
      return 70;
    }

    const pickupCount = context.resources?.pickupCount ?? 0;
    const pickupExpTotal = context.resources?.pickupExpTotal ?? 0;
    const treasureCount = context.resources?.treasureCount ?? 0;
    const resourceReady = pickupCount >= AutoUpgradeSelector.VACUUM_PICKUP_COUNT_THRESHOLD
      || pickupExpTotal >= AutoUpgradeSelector.VACUUM_EXP_THRESHOLD
      || treasureCount >= AutoUpgradeSelector.VACUUM_TREASURE_THRESHOLD;

    return resourceReady
      ? 420 + pickupCount * 0.8 + pickupExpTotal * 0.25 + treasureCount * 35
      : 55 + pickupCount * 0.25 + pickupExpTotal * 0.08 + treasureCount * 10;
  }

  private getWeaponSynergyScore(
    weaponId: string,
    context?: AutoUpgradeSelectionContext,
  ): number {
    const weapon = context?.weapons?.find((candidate) => (
      candidate.baseWeaponId === weaponId || candidate.weaponId === weaponId
    ));

    if (!weapon) {
      return 0;
    }

    const levelRatio = weapon.level / Math.max(1, weapon.maxLevel);
    let score = 8 + levelRatio * 16;

    if (weapon.tags.includes('aura') || weapon.tags.includes('orbit')) {
      score += this.getHpRatio(context) > 0.45 ? 8 : -4;
    }

    if (weapon.tags.includes('homing') || weapon.tags.includes('magic')) {
      score += 6;
    }

    return score;
  }

  private getHpRatio(context?: AutoUpgradeSelectionContext): number {
    const currentHp = context?.player?.currentHp;
    const maxHp = context?.player?.maxHp;

    if (currentHp === undefined || maxHp === undefined || maxHp <= 0) {
      return 1;
    }

    return Math.max(0, Math.min(1, currentHp / maxHp));
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

  private isDamageUpgrade(upgradeId: string): boolean {
    return upgradeId.endsWith('_damage_up') || upgradeId === 'spinach';
  }

  private isCooldownUpgrade(upgradeId: string): boolean {
    return upgradeId.endsWith('_cooldown_up') || upgradeId === 'empty_tome';
  }

  private isProjectileCountUpgrade(upgradeId: string): boolean {
    return upgradeId.endsWith('_projectile_count_up')
      || upgradeId === 'bible_orbit_count_up';
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
