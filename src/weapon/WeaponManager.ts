import { Enemy } from '../enemy/Enemy';
import { PlayerController } from '../player/PlayerController';
import { RunStats } from '../stats/RunStats';

import { Weapon, WeaponConfig } from './Weapon';
import { WeaponFactory } from './WeaponFactory';
import { WeaponTag } from './tags/WeaponTag';
import { WeaponTagQuery } from './tags/WeaponTagQuery';

type ManagedWeapon = Weapon & {
  destroy?: () => void;
  clearProjectiles?: () => void;
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

export interface WeaponAutoContext {
  weaponIds: string[];
  garlicRadiusPx?: number;
  bibleRadiusPx?: number;
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
  cooldownMultiplier: number;
  projectileSpeedMultiplier: number;
}

export class WeaponManager {
  private static readonly DEFAULT_WEAPON_UPGRADE_LIMIT = 6;
  private static readonly EVOLVED_WEAPON_UPGRADE_LIMIT = 10;
  private static readonly BASE_TO_EVOLVED_WEAPON_IDS = new Map([
    ['knife', 'thousand_edge'],
    ['bible', 'unholy_vespers'],
    ['magic_wand', 'holy_wand'],
    ['axe', 'death_spiral'],
    ['garlic', 'soul_eater'],
  ]);
  private static readonly EVOLVED_TO_BASE_WEAPON_IDS = new Map(
    Array.from(WeaponManager.BASE_TO_EVOLVED_WEAPON_IDS.entries())
      .map(([baseWeaponId, evolvedWeaponId]) => [evolvedWeaponId, baseWeaponId]),
  );
  private static readonly EVOLVED_WEAPON_IDS = new Set(
    WeaponManager.BASE_TO_EVOLVED_WEAPON_IDS.values(),
  );

  private readonly weapons: ManagedWeapon[] = [];
  private readonly retiredWeaponDamageStats = new Map<string, number>();
  private readonly weaponUpgradeCounts = new Map<string, Map<string, number>>();
  private readonly evolvedBaseWeapons = new Map<string, string>();
  private passiveModifiers = {
    damageMultiplier: 1,
    cooldownMultiplier: 1,
    projectileSpeedMultiplier: 1,
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
    cooldownMultiplier: 1,
    projectileSpeedMultiplier: 1,
  };
  private endlessDamageMultiplierProvider?: () => number;
  private currentEndlessDamageMultiplier = 1;

  constructor(
    private readonly runStats?: RunStats,
    private readonly weaponFactory?: WeaponFactory,
  ) {}

  addWeapon(weapon: Weapon): void {
    if (this.runStats) {
      weapon.setRunStats(this.runStats);
    }

    weapon.setPassiveModifiers(this.getCombinedPassiveModifiers(weapon));
    this.weapons.push(weapon);
  }

  setPassiveModifiers(modifiers: {
    damageMultiplier: number;
    cooldownMultiplier: number;
    projectileSpeedMultiplier: number;
  }): void {
    this.passiveModifiers = modifiers;

    this.applyCurrentPassiveModifiers();
  }

  setCharacterStatModifiers(modifiers: Partial<WeaponCharacterStatModifiers>): void {
    this.characterStatModifiers = {
      damageMultiplier: modifiers.damageMultiplier ?? 1,
      physicalDamageMultiplier: modifiers.physicalDamageMultiplier ?? 1,
      magicDamageMultiplier: modifiers.magicDamageMultiplier ?? 1,
      projectileDamageMultiplier: modifiers.projectileDamageMultiplier ?? 1,
      auraDamageMultiplier: modifiers.auraDamageMultiplier ?? 1,
      orbitDamageMultiplier: modifiers.orbitDamageMultiplier ?? 1,
      areaDamageMultiplier: modifiers.areaDamageMultiplier ?? 1,
      explosionDamageMultiplier: modifiers.explosionDamageMultiplier ?? 1,
      cooldownMultiplier: modifiers.cooldownMultiplier ?? 1,
      projectileSpeedMultiplier: modifiers.projectileSpeedMultiplier ?? 1,
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
    const evolvedWeaponId = WeaponManager.BASE_TO_EVOLVED_WEAPON_IDS.get(baseWeaponId);

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
      const evolved = WeaponManager.EVOLVED_WEAPON_IDS.has(weapon.id);
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
        evolved: WeaponManager.EVOLVED_WEAPON_IDS.has(weapon.id),
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

    return {
      weaponIds: this.getWeaponIds(),
      garlicRadiusPx: garlicRadius === undefined ? undefined : garlicRadius * 48,
      bibleRadiusPx: bibleRadius === undefined ? undefined : bibleRadius * 48,
    };
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

  update(player: PlayerController, enemies: readonly Enemy[], deltaMs: number): void {
    this.refreshEndlessDamageMultiplier();
    const activeEnemies = enemies.filter((enemy) => !enemy.isDead);

    for (const weapon of this.weapons) {
      weapon.update({
        player: player.body,
        enemies: activeEnemies,
        deltaMs,
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
    cooldownMultiplier: number;
    projectileSpeedMultiplier: number;
  } {
    return {
      damageMultiplier: this.passiveModifiers.damageMultiplier
        * this.currentEndlessDamageMultiplier
        * this.getCharacterTagDamageMultiplier(weapon),
      cooldownMultiplier: this.passiveModifiers.cooldownMultiplier
        * this.characterStatModifiers.cooldownMultiplier,
      projectileSpeedMultiplier: this.passiveModifiers.projectileSpeedMultiplier
        * this.characterStatModifiers.projectileSpeedMultiplier,
    };
  }

  private getCharacterTagDamageMultiplier(weapon: ManagedWeapon): number {
    const config = (weapon as unknown as { config?: WeaponConfig } | undefined)?.config;
    const tags = config?.tags;
    let multiplier = this.characterStatModifiers.damageMultiplier;

    if (WeaponTagQuery.hasTag(tags, 'physical')) {
      multiplier *= this.characterStatModifiers.physicalDamageMultiplier;
    }

    if (WeaponTagQuery.hasTag(tags, 'magic')) {
      multiplier *= this.characterStatModifiers.magicDamageMultiplier;
    }

    if (WeaponTagQuery.hasTag(tags, 'projectile')) {
      multiplier *= this.characterStatModifiers.projectileDamageMultiplier;
    }

    if (WeaponTagQuery.hasTag(tags, 'aura')) {
      multiplier *= this.characterStatModifiers.auraDamageMultiplier;
    }

    if (WeaponTagQuery.hasTag(tags, 'orbit')) {
      multiplier *= this.characterStatModifiers.orbitDamageMultiplier;
    }

    if (WeaponTagQuery.hasTag(tags, 'area')) {
      multiplier *= this.characterStatModifiers.areaDamageMultiplier;
    }

    if (WeaponTagQuery.hasTag(tags, 'explosive')) {
      multiplier *= this.characterStatModifiers.explosionDamageMultiplier;
    }

    return multiplier;
  }

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
    const state = WeaponManager.EVOLVED_WEAPON_IDS.has(weaponId) ? 'Evolved' : 'Base';

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
    return Array.from(WeaponManager.BASE_TO_EVOLVED_WEAPON_IDS.keys()).find((weaponId) => (
      this.getUpgradeCategory(weaponId, upgradeId) !== undefined
    ));
  }

  getBaseWeaponId(weaponId: string): string {
    return WeaponManager.EVOLVED_TO_BASE_WEAPON_IDS.get(weaponId) ?? weaponId;
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
        return undefined;
    }
  }

  private getMaximumProjectileCountForWeapon(baseWeaponId: string): number | undefined {
    switch (baseWeaponId) {
      case 'magic_wand':
      case 'axe':
        return 4;
      default:
        return undefined;
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
