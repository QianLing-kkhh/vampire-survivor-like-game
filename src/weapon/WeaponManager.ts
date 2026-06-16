import { Enemy } from '../enemy/Enemy';
import { CharacterRuntime } from '../character/CharacterRuntime';
import type { AutoWeaponSnapshot, WeaponAutoContext } from '../auto/AutoPlayerTypes';
import type { PlayerQuery } from '../player/PlayerQuery';
import { PlayerCombatModifierSnapshot } from '../player/PlayerStats';
import { RunStats } from '../stats/RunStats';
import type { WeaponTarget } from './WeaponTarget';

import { DamageCalculator } from '../combat/DamageCalculator';
import { EvolutionRule } from '../evolution/EvolutionRule';
import { PassiveWeaponModifier } from '../passive/PassiveItem';
import { Weapon, WeaponConfig, WeaponCooldownStatus, WeaponUpdateContext } from './Weapon';
import { WeaponFactory } from './WeaponFactory';
import { WeaponTag } from './tags/WeaponTag';

type ManagedWeapon = Weapon & {
  destroy?: () => void;
  clearProjectiles?: () => void;
  getActiveProjectileCount?: () => number;
  setRuntimeDamageMultiplierProvider?: (provider: ((weaponId: string) => number) | undefined) => void;
  setVisualTierProvider?: (provider: ((weaponId: string) => {
    level?: number;
    maxLevel?: number;
    evolved?: boolean;
  }) | undefined) => void;
};

type WeaponStat = 'damage'
  | 'cooldown'
  | 'radius'
  | 'orbitCount'
  | 'orbitSpeed'
  | 'projectileSpeed'
  | 'projectileCount';

export interface WeaponDamageStat {
  weaponId: string;
  totalDamage: number;
}

export interface WeaponHudInfo {
  weaponId: string;
  upgradeSummary: string;
}

export interface WeaponBuildHudInfo {
  weaponId: string;
  baseWeaponId: string;
  evolvedWeaponId?: string;
  weaponName: string;
  weaponIconKey: string;
  weaponLevel: number;
  weaponLevelMax: number;
  evolved: boolean;
  evolutionReady?: boolean;
  passiveId?: string;
  passiveName?: string;
  passiveIconKey?: string;
  passiveLevel?: number;
  passiveLevelMax?: number;
  cooldown?: WeaponCooldownStatus;
  showCooldownInHud?: boolean;
}

export interface WeaponDetailInfo {
  baseWeaponId: string;
  displayWeaponId: string;
  displayName: string;
  iconKey: string;
  evolved: boolean;
  level: number;
  maxLevel: number;
  requiredPassiveId?: string;
  requiredPassiveName?: string;
  requiredPassiveIconKey?: string;
  requiredPassiveLevel?: number;
  passiveLevel?: number;
  stats: Record<string, number>;
  runtimeStats: {
    damageDealt: number;
    hits: number;
    kills: number;
  };
}

export interface WeaponCharacterStatModifiers {
  damageMultiplier: number;
  physicalDamageMultiplier: number;
  magicDamageMultiplier: number;
  projectileDamageMultiplier: number;
  auraDamageMultiplier: number;
  orbitDamageMultiplier: number;
  areaDamageMultiplier: number;
  explosionDamageMultiplier: number;
  bossDamageMultiplier: number;
  eliteDamageMultiplier: number;
  cooldownMultiplier: number;
  projectileSpeedMultiplier: number;
  knockbackPowerMultiplier: number;
}

export class WeaponManager {
  private static readonly DEFAULT_WEAPON_UPGRADE_LIMIT = 6;
  private static readonly EVOLVED_WEAPON_UPGRADE_LIMIT = 10;

  private readonly weapons: ManagedWeapon[] = [];
  private readonly baseToEvolvedWeaponIds: Map<string, string>;
  private readonly evolvedToBaseWeaponIds: Map<string, string>;
  private readonly evolvedWeaponIds: Set<string>;
  private readonly retiredWeaponDamageStats = new Map<string, number>();
  private readonly weaponUpgradeCounts = new Map<string, Map<string, number>>();
  private readonly evolvedBaseWeapons = new Map<string, string>();
  private passiveModifiers = {
    damageMultiplier: 1,
    cooldownMultiplier: 1,
    projectileSpeedMultiplier: 1,
    knockbackPowerMultiplier: 1,
    scopedWeaponModifiers: [] as PassiveWeaponModifier[],
  };
  private characterStatModifiers: WeaponCharacterStatModifiers = {
    damageMultiplier: 1,
    physicalDamageMultiplier: 1,
    magicDamageMultiplier: 1,
    projectileDamageMultiplier: 1,
    auraDamageMultiplier: 1,
    orbitDamageMultiplier: 1,
    areaDamageMultiplier: 1,
    explosionDamageMultiplier: 1,
    bossDamageMultiplier: 1,
    eliteDamageMultiplier: 1,
    cooldownMultiplier: 1,
    projectileSpeedMultiplier: 1,
    knockbackPowerMultiplier: 1,
  };
  private readonly damageCalculator = new DamageCalculator();
  private endlessDamageMultiplierProvider?: () => number;
  private relicDamageMultiplierProvider?: (weaponId: string) => number;
  private currentEndlessDamageMultiplier = 1;

  constructor(
    private readonly runStats?: RunStats,
    private readonly weaponFactory?: WeaponFactory,
    evolutionRules: readonly EvolutionRule[] = [],
  ) {
    this.baseToEvolvedWeaponIds = new Map(
      evolutionRules.map((rule) => [rule.baseWeaponId, rule.evolvedWeaponId]),
    );
    this.evolvedToBaseWeaponIds = new Map(
      evolutionRules.map((rule) => [rule.evolvedWeaponId, rule.baseWeaponId]),
    );
    this.evolvedWeaponIds = new Set(evolutionRules.map((rule) => rule.evolvedWeaponId));
  }

  addWeapon(weapon: Weapon): void {
    if (this.runStats) {
      weapon.setRunStats(this.runStats);
    }

    weapon.setRuntimeDamageMultiplierProvider?.(this.relicDamageMultiplierProvider);
    weapon.setVisualTierProvider?.(this.getVisualTierInput);
    weapon.setPassiveModifiers(this.getCombinedPassiveModifiers(weapon));
    this.weapons.push(weapon);
  }

  setRelicDamageMultiplierProvider(provider: ((weaponId: string) => number) | undefined): void {
    this.relicDamageMultiplierProvider = provider;

    for (const weapon of this.weapons) {
      weapon.setRuntimeDamageMultiplierProvider?.(provider);
    }
  }

  setPassiveModifiers(modifiers: {
    damageMultiplier: number;
    bossDamageMultiplier?: number;
    eliteDamageMultiplier?: number;
    cooldownMultiplier: number;
    projectileSpeedMultiplier: number;
    knockbackPowerMultiplier?: number;
    scopedWeaponModifiers?: PassiveWeaponModifier[];
  }): void {
    this.passiveModifiers = {
      damageMultiplier: modifiers.damageMultiplier,
      cooldownMultiplier: modifiers.cooldownMultiplier,
      projectileSpeedMultiplier: modifiers.projectileSpeedMultiplier,
      knockbackPowerMultiplier: modifiers.knockbackPowerMultiplier ?? 1,
      scopedWeaponModifiers: modifiers.scopedWeaponModifiers ?? [],
    };

    this.applyCurrentPassiveModifiers();
  }

  setCharacterStatModifiers(
    modifiers: Partial<WeaponCharacterStatModifiers> | PlayerCombatModifierSnapshot,
  ): void {
    this.characterStatModifiers = {
      damageMultiplier: modifiers.damageMultiplier ?? 1,
      physicalDamageMultiplier: modifiers.physicalDamageMultiplier ?? 1,
      magicDamageMultiplier: modifiers.magicDamageMultiplier ?? 1,
      projectileDamageMultiplier: modifiers.projectileDamageMultiplier ?? 1,
      auraDamageMultiplier: modifiers.auraDamageMultiplier ?? 1,
      orbitDamageMultiplier: modifiers.orbitDamageMultiplier ?? 1,
      areaDamageMultiplier: modifiers.areaDamageMultiplier ?? 1,
      explosionDamageMultiplier: modifiers.explosionDamageMultiplier ?? 1,
      bossDamageMultiplier: modifiers.bossDamageMultiplier ?? 1,
      eliteDamageMultiplier: modifiers.eliteDamageMultiplier ?? 1,
      cooldownMultiplier: modifiers.cooldownMultiplier ?? 1,
      projectileSpeedMultiplier: modifiers.projectileSpeedMultiplier ?? 1,
      knockbackPowerMultiplier: modifiers.knockbackPowerMultiplier ?? 1,
    };

    this.applyCurrentPassiveModifiers();
  }

  setEndlessDamageMultiplierProvider(provider: () => number): void {
    this.endlessDamageMultiplierProvider = provider;
    this.refreshEndlessDamageMultiplier();
  }

  hasWeapon(weaponId: string): boolean {
    return this.weapons.some((weapon) => weapon.id === weaponId);
  }

  hasWeaponOrEvolution(baseWeaponId: string): boolean {
    const evolvedWeaponId = this.baseToEvolvedWeaponIds.get(baseWeaponId);

    return this.hasWeapon(baseWeaponId)
      || this.isBaseWeaponEvolved(baseWeaponId)
      || (evolvedWeaponId === undefined ? false : this.hasWeapon(evolvedWeaponId));
  }

  isBaseWeaponEvolved(baseWeaponId: string): boolean {
    const evolvedWeaponId = this.evolvedBaseWeapons.get(baseWeaponId);

    return evolvedWeaponId === undefined ? false : this.hasWeapon(evolvedWeaponId);
  }

  getWeaponIds(): string[] {
    return this.weapons.map((weapon) => weapon.id);
  }

  getWeaponTags(weaponId: string): WeaponTag[] {
    const weapon = this.weapons.find((managedWeapon) => managedWeapon.id === weaponId);
    const config = (weapon as unknown as { config?: WeaponConfig } | undefined)?.config;

    return [...(config?.tags ?? [])];
  }

  getUpgradeTargetWeaponId(baseWeaponId: string): string {
    const evolvedWeaponId = this.evolvedBaseWeapons.get(baseWeaponId);

    if (evolvedWeaponId && this.hasWeapon(evolvedWeaponId)) {
      return evolvedWeaponId;
    }

    return baseWeaponId;
  }

  getActualUpgradeTargetWeaponId(upgradeId: string): string | undefined {
    const baseWeaponId = this.getBaseWeaponIdForUpgrade(upgradeId);

    return baseWeaponId ? this.getUpgradeTargetWeaponId(baseWeaponId) : undefined;
  }

  getWeaponHudInfo(): WeaponHudInfo[] {
    return this.weapons.map((weapon) => ({
      weaponId: weapon.id,
      upgradeSummary: this.formatWeaponUpgradeSummary(weapon.id),
    }));
  }

  getWeaponBuildHudInfo(params: {
    getPassiveLevel(passiveId: string): number;
    getPassiveName(passiveId: string): string;
    getPassiveMaxLevel(passiveId: string): number;
    getRequiredPassiveForWeapon(weaponId: string): {
      requiredPassiveId: string;
      requiredPassiveLevel: number;
      requiredWeaponUpgradeTotal: number;
    } | undefined;
  }): WeaponBuildHudInfo[] {
    return this.weapons.map((weapon) => {
      const baseWeaponId = this.getBaseWeaponId(weapon.id);
      const evolutionRule = params.getRequiredPassiveForWeapon(baseWeaponId);
      const evolved = this.evolvedWeaponIds.has(weapon.id);
      const weaponLevel = this.getWeaponUpgradeTotal(baseWeaponId);
      const passiveLevel = evolutionRule
        ? params.getPassiveLevel(evolutionRule.requiredPassiveId)
        : undefined;

      return {
        weaponId: weapon.id,
        baseWeaponId,
        evolvedWeaponId: evolved ? weapon.id : undefined,
        weaponName: this.formatWeaponName(weapon.id),
        weaponIconKey: this.getWeaponIconKey(weapon.id),
        weaponLevel,
        weaponLevelMax: this.getWeaponUpgradeLimit(baseWeaponId),
        evolved,
        evolutionReady: evolutionRule
          ? !evolved
            && weaponLevel >= evolutionRule.requiredWeaponUpgradeTotal
            && (passiveLevel ?? 0) >= evolutionRule.requiredPassiveLevel
          : false,
        passiveId: evolutionRule?.requiredPassiveId,
        passiveName: evolutionRule
          ? params.getPassiveName(evolutionRule.requiredPassiveId)
          : undefined,
        passiveIconKey: evolutionRule
          ? this.getPassiveIconKey(evolutionRule.requiredPassiveId)
          : undefined,
        passiveLevel,
        passiveLevelMax: evolutionRule
          ? params.getPassiveMaxLevel(evolutionRule.requiredPassiveId)
          : undefined,
        cooldown: weapon.getCooldownStatus(),
        showCooldownInHud: weapon.shouldShowCooldownInHud(),
      };
    });
  }

  getWeaponDetailInfo(params: {
    getPassiveLevel(passiveId: string): number;
    getPassiveName(passiveId: string): string;
    getRequiredPassiveForWeapon(weaponId: string): {
      requiredPassiveId: string;
      requiredPassiveLevel: number;
    } | undefined;
  }): WeaponDetailInfo[] {
    const runStatsSummary = this.runStats?.getSummary();
    const damageStats = new Map(
      this.getWeaponDamageStats().map((stat) => [stat.weaponId, stat.totalDamage]),
    );
    const hitStats = new Map(
      runStatsSummary?.weaponHitStats.map((stat) => [stat.key, stat.value]) ?? [],
    );
    const killStats = new Map(
      runStatsSummary?.weaponKillStats.map((stat) => [stat.key, stat.value]) ?? [],
    );

    return this.weapons.map((weapon) => {
      const baseWeaponId = this.getBaseWeaponId(weapon.id);
      const rule = params.getRequiredPassiveForWeapon(baseWeaponId);

      return {
        baseWeaponId,
        displayWeaponId: weapon.id,
        displayName: this.formatWeaponName(weapon.id),
        iconKey: this.getWeaponIconKey(weapon.id),
        evolved: this.evolvedWeaponIds.has(weapon.id),
        level: this.getWeaponUpgradeTotal(baseWeaponId),
        maxLevel: this.getWeaponUpgradeLimit(baseWeaponId),
        requiredPassiveId: rule?.requiredPassiveId,
        requiredPassiveName: rule
          ? params.getPassiveName(rule.requiredPassiveId)
          : undefined,
        requiredPassiveIconKey: rule
          ? this.getPassiveIconKey(rule.requiredPassiveId)
          : undefined,
        requiredPassiveLevel: rule?.requiredPassiveLevel,
        passiveLevel: rule
          ? params.getPassiveLevel(rule.requiredPassiveId)
          : undefined,
        stats: this.getWeaponDetailStats(weapon),
        runtimeStats: {
          damageDealt: damageStats.get(weapon.id) ?? 0,
          hits: hitStats.get(weapon.id) ?? 0,
          kills: killStats.get(weapon.id) ?? 0,
        },
      };
    });
  }

  getWeaponUpgradeTotal(weaponId: string): number {
    const weaponCounts = this.weaponUpgradeCounts.get(this.getBaseWeaponId(weaponId));

    if (!weaponCounts) {
      return 0;
    }

    return Array.from(weaponCounts.values()).reduce(
      (total, count) => total + count,
      0,
    );
  }

  getWeaponRouteLevel(baseWeaponId: string): number {
    return this.getWeaponUpgradeTotal(baseWeaponId);
  }

  getWeaponUpgradeLimit(weaponId: string): number {
    const baseWeaponId = this.getBaseWeaponId(weaponId);

    return this.isBaseWeaponEvolved(baseWeaponId)
      ? WeaponManager.EVOLVED_WEAPON_UPGRADE_LIMIT
      : WeaponManager.DEFAULT_WEAPON_UPGRADE_LIMIT;
  }

  getWeaponRouteMaxLevel(baseWeaponId: string): number {
    return this.getWeaponUpgradeLimit(baseWeaponId);
  }

  isWeaponUpgradeLimitReached(weaponId: string): boolean {
    return this.getWeaponUpgradeTotal(weaponId) >= this.getWeaponUpgradeLimit(weaponId);
  }

  getWeaponDamageStats(): WeaponDamageStat[] {
    const mergedStats = new Map<string, number>();

    for (const [weaponId, totalDamage] of this.retiredWeaponDamageStats) {
      mergedStats.set(weaponId, (mergedStats.get(weaponId) ?? 0) + totalDamage);
    }

    for (const weapon of this.weapons) {
      mergedStats.set(
        weapon.id,
        (mergedStats.get(weapon.id) ?? 0) + weapon.totalDamageDealt,
      );
    }

    return Array.from(mergedStats.entries()).map(([weaponId, totalDamage]) => ({
      weaponId,
      totalDamage,
    }));
  }

  getAutoWeaponContext(): WeaponAutoContext {
    const garlicRadius = this.getWeaponStat('garlic', 'radius');
    const bibleRadius = this.getWeaponStat('bible', 'radius');
    const weapons: AutoWeaponSnapshot[] = this.weapons.map((weapon) => {
      const baseWeaponId = this.getBaseWeaponId(weapon.id);
      const radius = this.getWeaponStat(baseWeaponId, 'radius');
      const projectileSpeed = this.getWeaponStat(baseWeaponId, 'projectileSpeed');

      return {
        weaponId: weapon.id,
        baseWeaponId,
        level: this.getWeaponUpgradeTotal(baseWeaponId),
        maxLevel: this.getWeaponUpgradeLimit(baseWeaponId),
        tags: this.getWeaponTags(weapon.id),
        radiusPx: radius === undefined ? undefined : radius * 48,
        rangePx: projectileSpeed === undefined ? undefined : projectileSpeed * 48,
      };
    });

    return {
      weaponIds: this.getWeaponIds(),
      garlicRadiusPx: garlicRadius === undefined ? undefined : garlicRadius * 48,
      bibleRadiusPx: bibleRadius === undefined ? undefined : bibleRadius * 48,
      weapons,
    };
  }

  getProjectileCount(): number {
    return this.weapons.reduce(
      (total, weapon) => total + (weapon.getActiveProjectileCount?.() ?? 0),
      0,
    );
  }

  getWeaponStat(weaponId: string, stat: WeaponStat): number | undefined {
    const targetWeaponId = this.getUpgradeTargetWeaponId(this.getBaseWeaponId(weaponId));
    const weapon = this.weapons.find((managedWeapon) => managedWeapon.id === targetWeaponId);

    if (!weapon) {
      return undefined;
    }

    if (stat === 'orbitCount' && this.hasOrbitCount(weapon)) {
      return weapon.getOrbitCount();
    }

    if (stat === 'orbitSpeed' && this.hasOrbitSpeed(weapon)) {
      return weapon.getOrbitSpeed();
    }

    if (stat === 'projectileCount' && this.hasProjectileCount(weapon)) {
      return weapon.getProjectileCount();
    }

    const runtimeWeapon = weapon as unknown as {
      damage?: number;
      cooldownSeconds?: number;
      radius?: number;
      projectileSpeed?: number;
      config?: {
        projectileCount?: number;
      };
    };

    if (stat === 'damage') {
      return runtimeWeapon.damage;
    }

    if (stat === 'cooldown') {
      return runtimeWeapon.cooldownSeconds;
    }

    if (stat === 'radius') {
      return runtimeWeapon.radius;
    }

    if (stat === 'projectileSpeed') {
      return runtimeWeapon.projectileSpeed;
    }

    if (stat === 'projectileCount') {
      return runtimeWeapon.config?.projectileCount;
    }

    return undefined;
  }

  applyWeaponUpgrade(upgradeId: string): boolean {
    const baseWeaponId = this.getBaseWeaponIdForUpgrade(upgradeId);

    if (!baseWeaponId) {
      console.warn(`No weapon upgrade category found: ${upgradeId}`);
      return false;
    }

    if (!this.hasWeaponOrEvolution(baseWeaponId)) {
      console.warn(`Cannot upgrade missing weapon ${baseWeaponId}: ${upgradeId}`);
      return false;
    }

    if (this.isWeaponUpgradeLimitReached(baseWeaponId)) {
      console.warn(
        `Weapon upgrade limit reached for ${baseWeaponId}: ${upgradeId}`,
      );
      return false;
    }

    const targetWeaponId = this.getUpgradeTargetWeaponId(baseWeaponId);
    const targetWeapon = this.weapons.find((weapon) => weapon.id === targetWeaponId);

    if (!targetWeapon) {
      console.warn(`No active weapon supports upgrade target: ${upgradeId}`);
      return false;
    }

    const applied = this.applyUpgradeToTarget(targetWeapon, baseWeaponId, upgradeId)
      || this.applyGenericBaseWeaponUpgrade(targetWeapon, baseWeaponId, upgradeId);

    if (!applied) {
      console.warn(`No owned weapon supports upgrade: ${upgradeId}`);
      return false;
    }

    this.recordWeaponUpgrade(baseWeaponId, upgradeId);
    return applied;
  }

  evolveWeapon(baseWeaponId: string, evolvedWeaponId: string): boolean {
    if (!this.weaponFactory) {
      console.warn('Cannot evolve weapon without weapon factory');
      return false;
    }

    if (this.hasWeapon(evolvedWeaponId)) {
      console.warn(`Evolved weapon already exists: ${evolvedWeaponId}`);
      return false;
    }

    const baseWeapons = this.weapons.filter((weapon) => weapon.id === baseWeaponId);

    if (baseWeapons.length === 0) {
      console.warn(`Cannot evolve missing weapon: ${baseWeaponId}`);
      return false;
    }

    for (let index = this.weapons.length - 1; index >= 0; index -= 1) {
      if (this.weapons[index].id !== baseWeaponId) {
        continue;
      }

      const [baseWeapon] = this.weapons.splice(index, 1);
      const previousDamage = this.retiredWeaponDamageStats.get(baseWeapon.id) ?? 0;
      this.retiredWeaponDamageStats.set(
        baseWeapon.id,
        previousDamage + baseWeapon.totalDamageDealt,
      );

      if (baseWeapon.destroy) {
        baseWeapon.destroy();
      } else {
        baseWeapon.clearProjectiles?.();
      }
    }

    this.addWeapon(this.weaponFactory.create(evolvedWeaponId));
    this.evolvedBaseWeapons.set(baseWeaponId, evolvedWeaponId);
    return true;
  }

  update(
    player: PlayerQuery,
    enemies: readonly Enemy[],
    deltaMs: number,
    characterRuntime?: CharacterRuntime,
    isProjectilePathBlocked?: WeaponUpdateContext['isProjectilePathBlocked'],
  ): void {
    this.refreshEndlessDamageMultiplier();
    const activeEnemies = enemies.filter((enemy) => enemy.isAlive());
    const enemyTargets: readonly WeaponTarget[] = activeEnemies;

    for (const weapon of this.weapons) {
      weapon.update({
        player,
        enemies: activeEnemies,
        enemyTargets,
        deltaMs,
        characterRuntime,
        isProjectilePathBlocked,
      });
    }
  }

  destroy(): void {
    for (const weapon of this.weapons) {
      if (weapon.destroy) {
        weapon.destroy();
        continue;
      }

      weapon.clearProjectiles?.();
    }

    this.weapons.length = 0;
    this.retiredWeaponDamageStats.clear();
    this.weaponUpgradeCounts.clear();
    this.evolvedBaseWeapons.clear();
    this.endlessDamageMultiplierProvider = undefined;
    this.currentEndlessDamageMultiplier = 1;
  }

  private refreshEndlessDamageMultiplier(): void {
    const nextMultiplier = this.endlessDamageMultiplierProvider?.() ?? 1;

    if (Math.abs(nextMultiplier - this.currentEndlessDamageMultiplier) < 0.0001) {
      return;
    }

    this.currentEndlessDamageMultiplier = nextMultiplier;
    this.applyCurrentPassiveModifiers();
  }

  private applyCurrentPassiveModifiers(): void {
    for (const weapon of this.weapons) {
      weapon.setPassiveModifiers(this.getCombinedPassiveModifiers(weapon));
    }
  }

  private getCombinedPassiveModifiers(weapon: ManagedWeapon): {
    damageMultiplier: number;
    bossDamageMultiplier: number;
    eliteDamageMultiplier: number;
    cooldownMultiplier: number;
    projectileSpeedMultiplier: number;
    knockbackPowerMultiplier: number;
  } {
    return {
      damageMultiplier: this.passiveModifiers.damageMultiplier
        * this.currentEndlessDamageMultiplier
        * this.getCharacterTagDamageMultiplier(weapon)
        * this.getScopedPassiveMultiplier(weapon, 'damageMultiplier'),
      bossDamageMultiplier: this.characterStatModifiers.bossDamageMultiplier,
      eliteDamageMultiplier: this.characterStatModifiers.eliteDamageMultiplier,
      cooldownMultiplier: this.passiveModifiers.cooldownMultiplier
        * this.characterStatModifiers.cooldownMultiplier
        * this.getScopedPassiveMultiplier(weapon, 'cooldownMultiplier'),
      projectileSpeedMultiplier: this.passiveModifiers.projectileSpeedMultiplier
        * this.characterStatModifiers.projectileSpeedMultiplier
        * this.getScopedPassiveMultiplier(weapon, 'projectileSpeedMultiplier'),
      knockbackPowerMultiplier: this.characterStatModifiers.knockbackPowerMultiplier
        * this.passiveModifiers.knockbackPowerMultiplier
        * this.getScopedPassiveMultiplier(weapon, 'knockbackPowerMultiplier'),
    };
  }

  private getScopedPassiveMultiplier(
    weapon: ManagedWeapon,
    field: 'damageMultiplier'
      | 'cooldownMultiplier'
      | 'projectileSpeedMultiplier'
      | 'knockbackPowerMultiplier',
  ): number {
    const config = (weapon as unknown as { config?: WeaponConfig } | undefined)?.config;
    const baseWeaponId = this.getBaseWeaponId(weapon.id);
    let multiplier = 1;

    for (const modifier of this.passiveModifiers.scopedWeaponModifiers) {
      if (!this.isPassiveScopeMatch(modifier, baseWeaponId, config?.tags ?? [])) {
        continue;
      }

      multiplier *= modifier[field] ?? 1;
    }

    return multiplier;
  }

  private isPassiveScopeMatch(
    modifier: PassiveWeaponModifier,
    baseWeaponId: string,
    tags: readonly WeaponTag[],
  ): boolean {
    if (modifier.scope.all) {
      return true;
    }

    if (modifier.scope.weaponIds?.includes(baseWeaponId)) {
      return true;
    }

    return modifier.scope.tags?.some((tag) => tags.includes(tag as WeaponTag)) ?? false;
  }

  private getCharacterTagDamageMultiplier(weapon: ManagedWeapon): number {
    const config = (weapon as unknown as { config?: WeaponConfig } | undefined)?.config;

    return this.damageCalculator.getTagDamageMultiplier(
      config?.tags,
      this.characterStatModifiers,
    );
  }

  private getVisualTierInput = (
    weaponId: string,
  ): { level?: number; maxLevel?: number; evolved?: boolean } => {
    const baseWeaponId = this.getBaseWeaponId(weaponId);

    return {
      level: this.getWeaponUpgradeTotal(baseWeaponId),
      maxLevel: this.getWeaponUpgradeLimit(baseWeaponId),
      evolved: this.evolvedWeaponIds.has(weaponId),
    };
  };

  private recordWeaponUpgrade(weaponId: string, upgradeId: string): void {
    const baseWeaponId = this.getBaseWeaponId(weaponId);
    const category = this.getUpgradeCategory(baseWeaponId, upgradeId);

    if (!category) {
      return;
    }

    const weaponCounts = this.weaponUpgradeCounts.get(baseWeaponId) ?? new Map<string, number>();
    weaponCounts.set(category, (weaponCounts.get(category) ?? 0) + 1);
    this.weaponUpgradeCounts.set(baseWeaponId, weaponCounts);
  }

  private formatWeaponUpgradeSummary(weaponId: string): string {
    const baseWeaponId = this.getBaseWeaponId(weaponId);
    const weaponCounts = this.weaponUpgradeCounts.get(baseWeaponId);
    const total = this.getWeaponUpgradeTotal(baseWeaponId);
    const limit = this.getWeaponUpgradeLimit(baseWeaponId);
    const state = this.evolvedWeaponIds.has(weaponId) ? 'Evolved' : 'Base';

    if (!weaponCounts || weaponCounts.size === 0) {
      return `Total Lv.${total} / ${limit} / ${state}`;
    }

    const details = Array.from(weaponCounts.entries())
      .map(([category, count]) => `${category} Lv.${count}`)
      .join(' / ');

    return `Total Lv.${total} / ${limit} / ${state} / ${details}`;
  }

  private formatWeaponName(weaponId: string): string {
    return weaponId
      .split('_')
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }

  private getWeaponIconKey(weaponId: string): string {
    switch (weaponId) {
      case 'knife':
        return 'knife_icon';
      case 'garlic':
        return 'art_weapons_garlic_core_sheet';
      case 'bible':
        return 'art_weapons_bible_orbit_book_sheet';
      case 'axe':
        return 'art_weapons_axe_icon';
      case 'magic_wand':
        return 'art_weapons_magic_wand_icon';
      case 'thousand_edge':
        return 'art_weapons_thousand_edge_icon';
      case 'holy_wand':
        return 'art_weapons_holy_wand_icon';
      case 'death_spiral':
        return 'art_weapons_death_spiral_icon';
      case 'unholy_vespers':
        return 'art_weapons_unholy_vespers_icon';
      case 'soul_eater':
        return 'art_weapons_soul_eater_icon';
      default:
        return weaponId;
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

  getBaseWeaponIdForUpgrade(upgradeId: string): string | undefined {
    return this.getKnownBaseWeaponIds().find((weaponId) => (
      this.getUpgradeCategory(weaponId, upgradeId) !== undefined
    ));
  }

  getBaseWeaponId(weaponId: string): string {
    return this.evolvedToBaseWeaponIds.get(weaponId) ?? weaponId;
  }

  private applyUpgradeToTarget(
    weapon: ManagedWeapon,
    baseWeaponId: string,
    upgradeId: string,
  ): boolean {
    if (weapon.id === baseWeaponId) {
      return weapon.applyUpgrade(upgradeId);
    }

    const originalWeaponId = weapon.id;
    const mutableWeapon = weapon as ManagedWeapon & { id: string };

    Object.defineProperty(mutableWeapon, 'id', {
      value: baseWeaponId,
      configurable: true,
      writable: true,
    });

    try {
      return weapon.applyUpgrade(upgradeId);
    } finally {
      Object.defineProperty(mutableWeapon, 'id', {
        value: originalWeaponId,
        configurable: true,
        writable: true,
      });
    }
  }

  private applyGenericBaseWeaponUpgrade(
    weapon: ManagedWeapon,
    baseWeaponId: string,
    upgradeId: string,
  ): boolean {
    const mutableWeapon = weapon as unknown as {
      increaseDamage?: (percent: number) => void;
      reduceCooldown?: (percent: number, minimumCooldown: number) => void;
      increaseRadius?: (percent: number) => void;
      radius?: number;
      auraBody?: { setRadius: (radius: number) => void };
      radiusPixels?: number;
      orbitProjectileCount?: number;
      orbitSpeedDegreesPerSecond?: number;
      rebuildProjectiles?: () => void;
      config?: {
        projectileCount?: number;
      };
    };

    if (upgradeId === `${baseWeaponId}_damage_up` && mutableWeapon.increaseDamage) {
      mutableWeapon.increaseDamage(0.1);
      return true;
    }

    if (upgradeId === `${baseWeaponId}_cooldown_up` && mutableWeapon.reduceCooldown) {
      const minimumCooldown = this.getMinimumCooldownForWeapon(baseWeaponId);

      if (minimumCooldown === undefined) {
        return false;
      }

      mutableWeapon.reduceCooldown(0.1, minimumCooldown);
      return true;
    }

    if (upgradeId === `${baseWeaponId}_radius_up` && mutableWeapon.increaseRadius) {
      mutableWeapon.increaseRadius(0.1);
      mutableWeapon.radius = Math.min(mutableWeapon.radius ?? 0, 6.2);
      if (mutableWeapon.radiusPixels) {
        mutableWeapon.auraBody?.setRadius(mutableWeapon.radiusPixels);
      }
      return true;
    }

    if (
      upgradeId === `${baseWeaponId}_orbit_speed_up`
      && typeof mutableWeapon.orbitSpeedDegreesPerSecond === 'number'
    ) {
      mutableWeapon.orbitSpeedDegreesPerSecond = Math.min(
        mutableWeapon.orbitSpeedDegreesPerSecond * 1.1,
        420,
      );
      return true;
    }

    if (
      upgradeId === `${baseWeaponId}_orbit_count_up`
      && typeof mutableWeapon.orbitProjectileCount === 'number'
    ) {
      const maximumOrbitCount = this.getMaximumProjectileCountForWeapon(baseWeaponId) ?? 6;

      if (mutableWeapon.orbitProjectileCount >= maximumOrbitCount) {
        console.warn(`${this.formatWeaponName(baseWeaponId)} orbit count is already at the maximum`);
        return false;
      }

      mutableWeapon.orbitProjectileCount = Math.min(
        mutableWeapon.orbitProjectileCount + 1,
        maximumOrbitCount,
      );
      mutableWeapon.rebuildProjectiles?.();
      return true;
    }

    if (
      upgradeId === `${baseWeaponId}_projectile_count_up`
      && mutableWeapon.config
      && typeof mutableWeapon.config.projectileCount === 'number'
    ) {
      const maximumProjectileCount = this.getMaximumProjectileCountForWeapon(baseWeaponId);

      if (maximumProjectileCount === undefined) {
        return false;
      }

      if (mutableWeapon.config.projectileCount >= maximumProjectileCount) {
        console.warn(`${this.formatWeaponName(baseWeaponId)} projectile count is already at the maximum`);
        return false;
      }

      mutableWeapon.config.projectileCount = Math.min(
        mutableWeapon.config.projectileCount + 1,
        maximumProjectileCount,
      );
      return true;
    }

    return false;
  }

  private getMinimumCooldownForWeapon(baseWeaponId: string): number | undefined {
    switch (baseWeaponId) {
      case 'knife':
        return 0.3;
      case 'magic_wand':
        return 0.35;
      case 'axe':
        return 0.6;
      default:
        return 0.25;
    }
  }

  private getMaximumProjectileCountForWeapon(baseWeaponId: string): number | undefined {
    switch (baseWeaponId) {
      case 'magic_wand':
      case 'axe':
        return 4;
      default:
        return 6;
    }
  }

  private getWeaponDetailStats(weapon: ManagedWeapon): Record<string, number> {
    const detailWeapon = weapon as unknown as {
      damage?: number;
      cooldownSeconds?: number;
      radius?: number;
      projectileSpeed?: number;
      config?: {
        projectileCount?: number;
        pierce?: number;
      };
    };
    const stats: Record<string, number> = {};

    this.addDetailStat(stats, 'Damage', detailWeapon.damage);
    this.addDetailStat(stats, 'Cooldown', detailWeapon.cooldownSeconds);
    this.addDetailStat(stats, 'Projectile Speed', detailWeapon.projectileSpeed);
    this.addDetailStat(stats, 'Projectile Count', this.hasProjectileCount(weapon)
      ? weapon.getProjectileCount()
      : detailWeapon.config?.projectileCount);
    this.addDetailStat(stats, 'Pierce', detailWeapon.config?.pierce);
    this.addDetailStat(stats, 'Radius', detailWeapon.radius);
    this.addDetailStat(stats, 'Orbit Count', this.hasOrbitCount(weapon)
      ? weapon.getOrbitCount()
      : undefined);
    this.addDetailStat(stats, 'Orbit Speed', this.hasOrbitSpeed(weapon)
      ? weapon.getOrbitSpeed()
      : undefined);

    return stats;
  }

  private addDetailStat(
    stats: Record<string, number>,
    label: string,
    value: number | undefined,
  ): void {
    if (value === undefined || value <= 0) {
      return;
    }

    stats[label] = value;
  }

  private getUpgradeCategory(weaponId: string, upgradeId: string): string | undefined {
    const prefix = `${weaponId}_`;

    if (!upgradeId.startsWith(prefix)) {
      return undefined;
    }

    const suffix = upgradeId.slice(prefix.length);

    switch (suffix) {
      case 'damage_up':
        return 'Damage';
      case 'cooldown_up':
        return 'Cooldown';
      case 'radius_up':
        return 'Radius';
      case 'orbit_count_up':
      case 'projectile_count_up':
        return 'Count';
      case 'orbit_speed_up':
      case 'projectile_speed_up':
        return 'Speed';
      default:
        return undefined;
    }
  }

  private getKnownBaseWeaponIds(): string[] {
    const weaponIds = new Set<string>();

    for (const weapon of this.weapons) {
      weaponIds.add(this.getBaseWeaponId(weapon.id));
    }

    for (const baseWeaponId of this.baseToEvolvedWeaponIds.keys()) {
      weaponIds.add(baseWeaponId);
    }

    return [...weaponIds];
  }

  private hasOrbitCount(
    weapon: ManagedWeapon,
  ): weapon is ManagedWeapon & { getOrbitCount: () => number } {
    return 'getOrbitCount' in weapon && typeof weapon.getOrbitCount === 'function';
  }

  private hasOrbitSpeed(
    weapon: ManagedWeapon,
  ): weapon is ManagedWeapon & { getOrbitSpeed: () => number } {
    return 'getOrbitSpeed' in weapon && typeof weapon.getOrbitSpeed === 'function';
  }

  private hasProjectileCount(
    weapon: ManagedWeapon,
  ): weapon is ManagedWeapon & { getProjectileCount: () => number } {
    return 'getProjectileCount' in weapon && typeof weapon.getProjectileCount === 'function';
  }
}
