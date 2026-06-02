import { Enemy } from '../enemy/Enemy';
import { PlayerController } from '../player/PlayerController';
import { RunStats } from '../stats/RunStats';

import { Weapon } from './Weapon';
import { WeaponFactory } from './WeaponFactory';

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

export interface WeaponAutoContext {
  weaponIds: string[];
  garlicRadiusPx?: number;
  bibleRadiusPx?: number;
}

export class WeaponManager {
  private static readonly DEFAULT_WEAPON_UPGRADE_LIMIT = 8;
  private static readonly EVOLVED_WEAPON_IDS = new Set([
    'thousand_edge',
    'unholy_vespers',
    'holy_wand',
    'death_spiral',
    'soul_eater',
  ]);

  private readonly weapons: ManagedWeapon[] = [];
  private readonly retiredWeaponDamageStats = new Map<string, number>();
  private readonly weaponUpgradeCounts = new Map<string, Map<string, number>>();
  private readonly evolvedBaseWeapons = new Map<string, string>();
  private passiveModifiers = {
    damageMultiplier: 1,
    cooldownMultiplier: 1,
    projectileSpeedMultiplier: 1,
  };

  constructor(
    private readonly runStats?: RunStats,
    private readonly weaponFactory?: WeaponFactory,
  ) {}

  addWeapon(weapon: Weapon): void {
    if (this.runStats) {
      weapon.setRunStats(this.runStats);
    }

    weapon.setPassiveModifiers(this.passiveModifiers);
    this.weapons.push(weapon);
  }

  setPassiveModifiers(modifiers: {
    damageMultiplier: number;
    cooldownMultiplier: number;
    projectileSpeedMultiplier: number;
  }): void {
    this.passiveModifiers = modifiers;

    for (const weapon of this.weapons) {
      weapon.setPassiveModifiers(modifiers);
    }
  }

  hasWeapon(weaponId: string): boolean {
    return this.weapons.some((weapon) => weapon.id === weaponId);
  }

  hasWeaponOrEvolution(baseWeaponId: string): boolean {
    return this.hasWeapon(baseWeaponId) || this.isBaseWeaponEvolved(baseWeaponId);
  }

  isBaseWeaponEvolved(baseWeaponId: string): boolean {
    const evolvedWeaponId = this.evolvedBaseWeapons.get(baseWeaponId);

    return evolvedWeaponId === undefined ? false : this.hasWeapon(evolvedWeaponId);
  }

  getWeaponIds(): string[] {
    return this.weapons.map((weapon) => weapon.id);
  }

  getWeaponHudInfo(): WeaponHudInfo[] {
    return this.weapons.map((weapon) => ({
      weaponId: weapon.id,
      upgradeSummary: this.formatWeaponUpgradeSummary(weapon.id),
    }));
  }

  getWeaponUpgradeTotal(weaponId: string): number {
    const weaponCounts = this.weaponUpgradeCounts.get(weaponId);

    if (!weaponCounts) {
      return 0;
    }

    return Array.from(weaponCounts.values()).reduce(
      (total, count) => total + count,
      0,
    );
  }

  getWeaponUpgradeLimit(weaponId: string): number {
    if (WeaponManager.EVOLVED_WEAPON_IDS.has(weaponId)) {
      return 0;
    }

    return WeaponManager.DEFAULT_WEAPON_UPGRADE_LIMIT;
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
    const weapon = this.weapons.find((managedWeapon) => managedWeapon.id === weaponId);

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

    return undefined;
  }

  applyWeaponUpgrade(upgradeId: string): boolean {
    const weaponId = this.getWeaponIdForUpgrade(upgradeId);

    if (weaponId && this.isBaseWeaponEvolved(weaponId)) {
      console.warn(`Cannot upgrade evolved base weapon ${weaponId}: ${upgradeId}`);
      return false;
    }

    if (weaponId && this.isWeaponUpgradeLimitReached(weaponId)) {
      console.warn(
        `Weapon upgrade limit reached for ${weaponId}: ${upgradeId}`,
      );
      return false;
    }

    let applied = false;

    for (const weapon of this.weapons) {
      const didApply = weapon.applyUpgrade(upgradeId);

      if (didApply) {
        this.recordWeaponUpgrade(weapon.id, upgradeId);
      }

      applied = didApply || applied;
    }

    if (!applied) {
      console.warn(`No owned weapon supports upgrade: ${upgradeId}`);
    }

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
  }

  private recordWeaponUpgrade(weaponId: string, upgradeId: string): void {
    const category = this.getUpgradeCategory(weaponId, upgradeId);

    if (!category) {
      return;
    }

    const weaponCounts = this.weaponUpgradeCounts.get(weaponId) ?? new Map<string, number>();
    weaponCounts.set(category, (weaponCounts.get(category) ?? 0) + 1);
    this.weaponUpgradeCounts.set(weaponId, weaponCounts);
  }

  private formatWeaponUpgradeSummary(weaponId: string): string {
    if (WeaponManager.EVOLVED_WEAPON_IDS.has(weaponId)) {
      return 'Evolved';
    }

    const weaponCounts = this.weaponUpgradeCounts.get(weaponId);
    const total = this.getWeaponUpgradeTotal(weaponId);
    const limit = this.getWeaponUpgradeLimit(weaponId);

    if (!weaponCounts || weaponCounts.size === 0) {
      return `Total Lv.${total} / ${limit} / Base`;
    }

    const details = Array.from(weaponCounts.entries())
      .map(([category, count]) => `${category} Lv.${count}`)
      .join(' / ');

    return `Total Lv.${total} / ${limit} / ${details}`;
  }

  private getWeaponIdForUpgrade(upgradeId: string): string | undefined {
    return this.getWeaponIds().find((weaponId) => (
      this.getUpgradeCategory(weaponId, upgradeId) !== undefined
    ));
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
