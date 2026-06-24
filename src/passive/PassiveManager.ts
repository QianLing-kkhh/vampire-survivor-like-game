import { PlayerHealth } from '../player/PlayerHealth';
import { ContentBootstrap } from '../content/ContentBootstrap';
import { ContentRegistry } from '../content/ContentRegistry';
import { getPassiveDisplayName, getStatDisplayName } from '../i18n/ContentText';
import { I18n } from '../i18n/I18n';

import {
  PassiveEffectDefinition,
  PassiveEffects,
  PassiveItem,
  PassiveLevel,
  PassiveWeaponModifier,
} from './PassiveItem';

export interface PassiveDetailInfo {
  passiveId: string;
  displayName: string;
  iconKey: string;
  level: number;
  maxLevel: number;
  effectLabel: string;
  effectValue: string;
  relatedWeaponIds: string[];
}

export class PassiveManager {
  private static readonly DEFAULT_MAX_LEVEL = 5;
  private static readonly PUMMAROLA_HEAL_INTERVAL_MS = 5000;

  private readonly levels = new Map<string, number>();
  private pummarolaElapsedMs = 0;

  constructor(passives?: readonly PassiveItem[]) {
    ContentBootstrap.ensureInitialized();
    this.passives = passives ?? ContentRegistry.listPassives();
  }

  private readonly passives: readonly PassiveItem[];

  applyPassive(passiveId: string): boolean {
    const passive = this.getPassive(passiveId);

    if (!passive) {
      return false;
    }

    const currentLevel = this.getLevel(passiveId);
    const maxLevel = this.getMaxLevel(passive);

    if (currentLevel >= maxLevel) {
      console.warn(`Passive is already at max level: ${passiveId}`);
      return false;
    }

    this.levels.set(passiveId, currentLevel + 1);
    return true;
  }

  update(deltaMs: number, playerHealth?: PlayerHealth): void {
    const pummarolaLevel = this.getLevel('pummarola');

    if (pummarolaLevel <= 0 || !playerHealth || playerHealth.isDead) {
      return;
    }

    this.pummarolaElapsedMs += deltaMs;

    while (this.pummarolaElapsedMs >= PassiveManager.PUMMAROLA_HEAL_INTERVAL_MS) {
      this.pummarolaElapsedMs -= PassiveManager.PUMMAROLA_HEAL_INTERVAL_MS;
      playerHealth.setCurrentHp(playerHealth.currentHp + pummarolaLevel);
    }
  }

  getLevel(passiveId: string): number {
    return this.levels.get(passiveId) ?? 0;
  }

  getPassiveLevel(passiveId: string): number {
    return this.getLevel(passiveId);
  }

  getPassiveName(passiveId: string): string {
    return getPassiveDisplayName(passiveId, this.getPassive(passiveId)?.name);
  }

  getPassiveMaxLevel(passiveId: string): number {
    const passive = this.getPassive(passiveId);

    return passive ? this.getMaxLevel(passive) : PassiveManager.DEFAULT_MAX_LEVEL;
  }

  isPassive(passiveId: string): boolean {
    return this.passives.some((passive) => passive.id === passiveId);
  }

  isMaxLevel(passiveId: string): boolean {
    const passive = this.getPassive(passiveId);

    if (!passive) {
      return false;
    }

    return this.getLevel(passiveId) >= this.getMaxLevel(passive);
  }

  getPassiveLevels(): PassiveLevel[] {
    return this.passives
      .map((passive) => ({
        id: passive.id,
        name: this.getPassiveName(passive.id),
        level: this.getLevel(passive.id),
      }))
      .filter((passive) => passive.level > 0);
  }

  getPassiveHudInfo(): PassiveLevel[] {
    return this.getPassiveLevels();
  }

  getPassiveDetailInfo(params: {
    getRelatedWeaponIds(passiveId: string): string[];
  }): PassiveDetailInfo[] {
    return this.passives
      .map((passive) => ({
        passive,
        level: this.getLevel(passive.id),
      }))
      .filter(({ level }) => level > 0)
      .map(({ passive, level }) => ({
        passiveId: passive.id,
        displayName: this.getPassiveName(passive.id),
        iconKey: this.getPassiveIconKey(passive.id),
        level,
        maxLevel: this.getMaxLevel(passive),
        ...this.getEffectDetail(passive.id, level),
        relatedWeaponIds: params.getRelatedWeaponIds(passive.id),
      }));
  }

  getEffects(): PassiveEffects {
    const effects: PassiveEffects = {
      damageMultiplier: 1 + this.getLevel('spinach') * 0.10,
      cooldownMultiplier: Math.max(0.1, 1 - this.getLevel('empty_tome') * 0.08),
      projectileSpeedMultiplier: 1 + this.getLevel('bracer') * 0.15,
      knockbackPowerMultiplier: 1,
      treasureDropBonus: this.getLevel('clover') * 0.01,
      scopedWeaponModifiers: [],
    };

    for (const passive of this.passives) {
      const level = this.getLevel(passive.id);

      if (level <= 0 || !passive.effects) {
        continue;
      }

      for (const effect of passive.effects) {
        this.applyDataDrivenEffect(effects, effect, level);
      }
    }

    return effects;
  }

  getPreview(passiveId: string): string | undefined {
    const passive = this.getPassive(passiveId);

    if (!passive) {
      return undefined;
    }

    const currentLevel = this.getLevel(passiveId);
    const nextLevel = Math.min(currentLevel + 1, this.getMaxLevel(passive));

    return [
      `${this.getPassiveName(passiveId)} Lv.${currentLevel} \u2192 Lv.${nextLevel}`,
      this.getEffectPreview(passiveId, currentLevel, nextLevel),
    ].join('\n');
  }

  private getEffectPreview(
    passiveId: string,
    currentLevel: number,
    nextLevel: number,
  ): string {
    switch (passiveId) {
      case 'spinach':
        return `${this.formatEffectStat('damageMultiplier')} ${this.formatMultiplier(
          this.getDamageMultiplier(currentLevel),
        )} \u2192 ${this.formatMultiplier(this.getDamageMultiplier(nextLevel))}`;
      case 'empty_tome':
        return `${this.formatEffectStat('cooldownMultiplier')} ${this.formatMultiplier(
          this.getCooldownMultiplier(currentLevel),
        )} \u2192 ${this.formatMultiplier(this.getCooldownMultiplier(nextLevel))}`;
      case 'bracer':
        return `${this.formatEffectStat('projectileSpeedMultiplier')} ${this.formatMultiplier(
          this.getProjectileSpeedMultiplier(currentLevel),
        )} \u2192 ${this.formatMultiplier(this.getProjectileSpeedMultiplier(nextLevel))}`;
      case 'clover':
        return `${this.formatEffectStat('treasureDropBonus')} ${this.formatPercent(
          this.getTreasureDropBonus(currentLevel),
        )} \u2192 ${this.formatPercent(this.getTreasureDropBonus(nextLevel))}`;
      case 'pummarola':
        return `${I18n.t('statsBuild.passiveEffect.heal')} ${currentLevel} \u2192 ${nextLevel} HP / 5s`;
      default:
        return this.getDataDrivenEffectPreview(passiveId, currentLevel, nextLevel);
    }
  }

  private getEffectDetail(
    passiveId: string,
    level: number,
  ): { effectLabel: string; effectValue: string } {
    switch (passiveId) {
      case 'spinach':
        return {
          effectLabel: this.formatEffectStat('damageMultiplier'),
          effectValue: this.formatMultiplier(this.getDamageMultiplier(level)),
        };
      case 'empty_tome':
        return {
          effectLabel: this.formatEffectStat('cooldownMultiplier'),
          effectValue: this.formatMultiplier(this.getCooldownMultiplier(level)),
        };
      case 'bracer':
        return {
          effectLabel: this.formatEffectStat('projectileSpeedMultiplier'),
          effectValue: this.formatMultiplier(this.getProjectileSpeedMultiplier(level)),
        };
      case 'clover':
        return {
          effectLabel: this.formatEffectStat('treasureDropBonus'),
          effectValue: this.formatPercent(this.getTreasureDropBonus(level)),
        };
      case 'pummarola':
        return {
          effectLabel: I18n.t('statsBuild.passiveEffect.heal'),
          effectValue: `${level} HP / 5s`,
        };
      default:
        return this.getDataDrivenEffectDetail(passiveId, level);
    }
  }

  private applyDataDrivenEffect(
    effects: PassiveEffects,
    effect: PassiveEffectDefinition,
    level: number,
  ): void {
    const effectValue = this.getEffectValue(effect, level);
    const scope = effect.scope;

    if (scope && !scope.all && ((scope.tags?.length ?? 0) > 0 || (scope.weaponIds?.length ?? 0) > 0)) {
      const scopedModifier: PassiveWeaponModifier = {
        scope,
      };

      this.assignMultiplier(scopedModifier, effect.stat, effectValue);
      effects.scopedWeaponModifiers.push(scopedModifier);
      return;
    }

    switch (effect.stat) {
      case 'damageMultiplier':
        effects.damageMultiplier *= effectValue;
        break;
      case 'cooldownMultiplier':
        effects.cooldownMultiplier = Math.max(0.1, effects.cooldownMultiplier * effectValue);
        break;
      case 'projectileSpeedMultiplier':
        effects.projectileSpeedMultiplier *= effectValue;
        break;
      case 'knockbackPowerMultiplier':
        effects.knockbackPowerMultiplier *= effectValue;
        break;
      case 'treasureDropBonus':
        effects.treasureDropBonus += effect.valuePerLevel * level;
        break;
      default:
        break;
    }
  }

  private assignMultiplier(
    target: PassiveWeaponModifier,
    stat: PassiveEffectDefinition['stat'],
    value: number,
  ): void {
    switch (stat) {
      case 'damageMultiplier':
        target.damageMultiplier = value;
        break;
      case 'cooldownMultiplier':
        target.cooldownMultiplier = value;
        break;
      case 'projectileSpeedMultiplier':
        target.projectileSpeedMultiplier = value;
        break;
      case 'knockbackPowerMultiplier':
        target.knockbackPowerMultiplier = value;
        break;
      default:
        break;
    }
  }

  private getEffectValue(effect: PassiveEffectDefinition, level: number): number {
    if (effect.operation === 'multiply') {
      return Math.pow(1 + effect.valuePerLevel, level);
    }

    return 1 + effect.valuePerLevel * level;
  }

  private getDataDrivenEffectPreview(
    passiveId: string,
    currentLevel: number,
    nextLevel: number,
  ): string {
    const passive = this.getPassive(passiveId);
    const effect = passive?.effects?.[0];

    if (!effect) {
      return '';
    }

    return `${this.formatEffectStat(effect.stat)} ${this.formatEffectForLevel(effect, currentLevel)} \u2192 ${this.formatEffectForLevel(effect, nextLevel)}`;
  }

  private getDataDrivenEffectDetail(
    passiveId: string,
    level: number,
  ): { effectLabel: string; effectValue: string } {
    const passive = this.getPassive(passiveId);
    const effect = passive?.effects?.[0];

    if (!effect) {
      return {
        effectLabel: I18n.t('statsBuild.effect'),
        effectValue: '',
      };
    }

    return {
      effectLabel: this.formatEffectStat(effect.stat),
      effectValue: this.formatEffectForLevel(effect, level),
    };
  }

  private formatEffectStat(stat: PassiveEffectDefinition['stat']): string {
    switch (stat) {
      case 'damageMultiplier':
        return getStatDisplayName('damageMultiplier', 'Damage Multiplier');
      case 'cooldownMultiplier':
        return getStatDisplayName('cooldownMultiplier', 'Cooldown Multiplier');
      case 'projectileSpeedMultiplier':
        return getStatDisplayName('projectileSpeedMultiplier', 'Projectile Speed');
      case 'knockbackPowerMultiplier':
        return getStatDisplayName('knockbackPowerMultiplier', 'Knockback Power');
      case 'treasureDropBonus':
        return getStatDisplayName('treasureDrop', 'Chest Drop Bonus');
      default:
        return I18n.t('statsBuild.effect');
    }
  }

  private formatEffectForLevel(effect: PassiveEffectDefinition, level: number): string {
    if (effect.stat === 'treasureDropBonus') {
      return this.formatPercent(effect.valuePerLevel * level);
    }

    return this.formatMultiplier(this.getEffectValue(effect, level));
  }

  private getPassiveIconKey(passiveId: string): string {
    switch (passiveId) {
      case 'spinach':
        return 'art_passives_spinach_icon';
      case 'empty_tome':
        return 'art_passives_empty_tome_icon';
      case 'bracer':
        return 'art_passives_bracer_icon';
      case 'clover':
        return 'art_passives_clover_icon';
      case 'pummarola':
        return 'art_passives_pummarola_icon';
      default:
        return passiveId;
    }
  }

  private getDamageMultiplier(level: number): number {
    return 1 + level * 0.10;
  }

  private getCooldownMultiplier(level: number): number {
    return Math.max(0.1, 1 - level * 0.08);
  }

  private getProjectileSpeedMultiplier(level: number): number {
    return 1 + level * 0.15;
  }

  private getTreasureDropBonus(level: number): number {
    return level * 0.01;
  }

  private formatMultiplier(value: number): string {
    return value.toFixed(2);
  }

  private formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  private getPassive(passiveId: string): PassiveItem | undefined {
    return this.passives.find((passive) => passive.id === passiveId);
  }

  private getMaxLevel(passive: PassiveItem): number {
    return passive.maxLevel ?? PassiveManager.DEFAULT_MAX_LEVEL;
  }
}
