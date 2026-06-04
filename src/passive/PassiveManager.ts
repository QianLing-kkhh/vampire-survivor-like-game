import { PlayerHealth } from '../player/PlayerHealth';
import { ContentBootstrap } from '../content/ContentBootstrap';
import { ContentRegistry } from '../content/ContentRegistry';

import { PassiveEffects, PassiveItem, PassiveLevel } from './PassiveItem';

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
    return this.getPassive(passiveId)?.name ?? this.formatName(passiveId);
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
        name: passive.name,
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
        displayName: passive.name,
        iconKey: this.getPassiveIconKey(passive.id),
        level,
        maxLevel: this.getMaxLevel(passive),
        ...this.getEffectDetail(passive.id, level),
        relatedWeaponIds: params.getRelatedWeaponIds(passive.id),
      }));
  }

  getEffects(): PassiveEffects {
    return {
      damageMultiplier: 1 + this.getLevel('spinach') * 0.10,
      cooldownMultiplier: Math.max(0.1, 1 - this.getLevel('empty_tome') * 0.08),
      projectileSpeedMultiplier: 1 + this.getLevel('bracer') * 0.15,
      treasureDropBonus: this.getLevel('clover') * 0.01,
    };
  }

  getPreview(passiveId: string): string | undefined {
    const passive = this.getPassive(passiveId);

    if (!passive) {
      return undefined;
    }

    const currentLevel = this.getLevel(passiveId);
    const nextLevel = Math.min(currentLevel + 1, this.getMaxLevel(passive));

    return [
      `${passive.name} Lv.${currentLevel} \u2192 Lv.${nextLevel}`,
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
        return `Damage Multiplier ${this.formatMultiplier(
          this.getDamageMultiplier(currentLevel),
        )} \u2192 ${this.formatMultiplier(this.getDamageMultiplier(nextLevel))}`;
      case 'empty_tome':
        return `Cooldown Multiplier ${this.formatMultiplier(
          this.getCooldownMultiplier(currentLevel),
        )} \u2192 ${this.formatMultiplier(this.getCooldownMultiplier(nextLevel))}`;
      case 'bracer':
        return `Projectile Speed ${this.formatMultiplier(
          this.getProjectileSpeedMultiplier(currentLevel),
        )} \u2192 ${this.formatMultiplier(this.getProjectileSpeedMultiplier(nextLevel))}`;
      case 'clover':
        return `Chest Drop Bonus ${this.formatPercent(
          this.getTreasureDropBonus(currentLevel),
        )} \u2192 ${this.formatPercent(this.getTreasureDropBonus(nextLevel))}`;
      case 'pummarola':
        return `Heal ${currentLevel} \u2192 ${nextLevel} HP / 5s`;
      default:
        return '';
    }
  }

  private getEffectDetail(
    passiveId: string,
    level: number,
  ): { effectLabel: string; effectValue: string } {
    switch (passiveId) {
      case 'spinach':
        return {
          effectLabel: 'Damage Multiplier',
          effectValue: this.formatMultiplier(this.getDamageMultiplier(level)),
        };
      case 'empty_tome':
        return {
          effectLabel: 'Cooldown Multiplier',
          effectValue: this.formatMultiplier(this.getCooldownMultiplier(level)),
        };
      case 'bracer':
        return {
          effectLabel: 'Projectile Speed',
          effectValue: this.formatMultiplier(this.getProjectileSpeedMultiplier(level)),
        };
      case 'clover':
        return {
          effectLabel: 'Chest Drop Bonus',
          effectValue: this.formatPercent(this.getTreasureDropBonus(level)),
        };
      case 'pummarola':
        return {
          effectLabel: 'Heal',
          effectValue: `${level} HP / 5s`,
        };
      default:
        return {
          effectLabel: 'Effect',
          effectValue: '',
        };
    }
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

  private formatName(passiveId: string): string {
    return passiveId
      .split('_')
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }
}
