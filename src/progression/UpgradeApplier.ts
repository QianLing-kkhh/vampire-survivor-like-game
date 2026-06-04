import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { PassiveManager } from '../passive/PassiveManager';
import { WeaponFactory } from '../weapon/WeaponFactory';
import { WeaponManager } from '../weapon/WeaponManager';
import { RunStats } from '../stats/RunStats';
import { EvolutionManager } from '../evolution/EvolutionManager';
import { UpgradeOption } from './UpgradeOption';

export interface UpgradeDisplayRow {
  iconKey?: string;
  fallback: string;
  text: string;
}

export interface UpgradeDisplayInfo {
  rows: UpgradeDisplayRow[];
}

export class UpgradeApplier {
  constructor(
    private readonly playerStats: PlayerStats,
    private readonly playerHealth?: PlayerHealth,
    private readonly weaponManager?: WeaponManager,
    private readonly weaponFactory?: WeaponFactory,
    private readonly runStats?: RunStats,
    private readonly passiveManager?: PassiveManager,
  ) {}

  apply(option: UpgradeOption): boolean {
    let applied = false;
    switch (option.id) {
      case 'speed_up':
        applied = this.applyMoveSpeedUpgrade();
        break;
      case 'pickup_range_up':
        applied = this.applyPickupRangeUpgrade();
        break;
      case 'max_hp_up':
        applied = this.applyMaxHpUpgrade();
        break;
      case 'add_garlic':
        applied = this.addGarlic();
        break;
      case 'add_bible':
        applied = this.addBible();
        break;
      case 'add_magic_wand':
        applied = this.addMagicWand();
        break;
      case 'add_axe':
        applied = this.addAxe();
        break;
      case 'spinach':
      case 'empty_tome':
      case 'bracer':
      case 'clover':
      case 'pummarola':
        applied = this.applyPassiveUpgrade(option.id);
        break;
      case 'knife_damage_up':
      case 'knife_cooldown_up':
      case 'garlic_damage_up':
      case 'garlic_radius_up':
      case 'bible_damage_up':
      case 'bible_orbit_speed_up':
      case 'bible_orbit_count_up':
      case 'magic_wand_damage_up':
      case 'magic_wand_cooldown_up':
      case 'magic_wand_projectile_count_up':
      case 'axe_damage_up':
      case 'axe_cooldown_up':
      case 'axe_projectile_count_up':
        applied = this.applyWeaponUpgrade(option.id);
        break;
      default:
        console.warn(`Unsupported upgrade id: ${option.id}`);
        break;
    }

    if (applied) {
      this.runStats?.recordUpgrade(option.id);
    }

    return applied;
  }

  getUpgradePreview(option: UpgradeOption): string | undefined {
    switch (option.id) {
      case 'speed_up':
        return this.formatChange(
          'Move Speed',
          this.playerStats.moveSpeed,
          Math.min(this.playerStats.maxMoveSpeed, this.playerStats.moveSpeed * 1.1),
        );
      case 'pickup_range_up':
        return this.formatChange(
          'Pickup Range',
          this.playerStats.pickupRange,
          Math.min(this.playerStats.maxPickupRange, this.playerStats.pickupRange * 1.1),
        );
      case 'max_hp_up':
        return this.formatMaxHpPreview();
      case 'spinach':
      case 'empty_tome':
      case 'bracer':
      case 'clover':
      case 'pummarola':
        return this.getPassiveUpgradePreview(option.id);
      case 'knife_damage_up':
        return this.formatWeaponChange('knife', 'damage', 'Damage', 1.1);
      case 'knife_cooldown_up':
        return this.formatWeaponChange(
          'knife',
          'cooldown',
          'Cooldown',
          0.9,
          0.3,
          true,
        );
      case 'garlic_damage_up':
        return this.formatWeaponChange('garlic', 'damage', 'Damage', 1.1);
      case 'garlic_radius_up':
        return this.formatWeaponChange('garlic', 'radius', 'Radius', 1.1, 4.0);
      case 'bible_damage_up':
        return this.formatWeaponChange('bible', 'damage', 'Damage', 1.1);
      case 'bible_orbit_speed_up':
        return this.formatWeaponChange('bible', 'orbitSpeed', 'Orbit Speed', 1.1, 360);
      case 'bible_orbit_count_up':
        return this.formatWeaponChange('bible', 'orbitCount', 'Count', 1, 6, false, true);
      case 'magic_wand_damage_up':
        return this.formatWeaponChange('magic_wand', 'damage', 'Damage', 1.1);
      case 'magic_wand_cooldown_up':
        return this.formatWeaponChange(
          'magic_wand',
          'cooldown',
          'Cooldown',
          0.9,
          0.35,
          true,
        );
      case 'magic_wand_projectile_count_up':
        return this.formatWeaponChange(
          'magic_wand',
          'projectileCount',
          'Count',
          1,
          4,
          false,
          true,
        );
      case 'axe_damage_up':
        return this.formatWeaponChange('axe', 'damage', 'Damage', 1.1);
      case 'axe_cooldown_up':
        return this.formatWeaponChange(
          'axe',
          'cooldown',
          'Cooldown',
          0.9,
          0.6,
          true,
        );
      case 'axe_projectile_count_up':
        return this.formatWeaponChange(
          'axe',
          'projectileCount',
          'Count',
          1,
          4,
          false,
          true,
        );
      default:
        return undefined;
    }
  }

  applyEndlessHeal(amount: number): boolean {
    if (!this.playerHealth || this.playerHealth.isDead) {
      return false;
    }

    const previousHp = this.playerHealth.currentHp;
    this.playerHealth.setCurrentHp(previousHp + amount);

    return this.playerHealth.currentHp > previousHp;
  }

  getUpgradeDisplayInfo(
    option: UpgradeOption,
    evolutionManager?: EvolutionManager,
  ): UpgradeDisplayInfo | undefined {
    const weaponId = this.getWeaponIdForUpgradeId(option.id);

    if (weaponId) {
      return this.getWeaponUpgradeDisplayInfo(weaponId, evolutionManager);
    }

    if (this.isPassiveUpgrade(option.id)) {
      return this.getPassiveUpgradeDisplayInfo(option.id, evolutionManager);
    }

    return undefined;
  }

  private addGarlic(): boolean {
    if (!this.weaponManager || !this.weaponFactory) {
      console.warn('Cannot add garlic without weapon systems');
      return false;
    }

    if (this.weaponManager.hasWeaponOrEvolution('garlic')) {
      console.warn('Garlic already added');
      return false;
    }

    this.weaponManager.addWeapon(this.weaponFactory.create('garlic'));
    return true;
  }

  private applyMoveSpeedUpgrade(): boolean {
    if (!this.playerStats.increaseMoveSpeed(0.1)) {
      console.warn('Move speed is already at max cap');
      return false;
    }

    return true;
  }

  private applyPickupRangeUpgrade(): boolean {
    if (!this.playerStats.increasePickupRange(0.1)) {
      console.warn('Pickup range is already at max cap');
      return false;
    }

    return true;
  }

  private applyMaxHpUpgrade(): boolean {
    const previousMaxHp = this.playerStats.maxHp;

    this.playerStats.increaseMaxHp(0.1);
    const maxHpIncrease = this.playerStats.maxHp - previousMaxHp;

    if (maxHpIncrease <= 0) {
      console.warn('Max HP is already at max cap');
      return false;
    }

    this.playerHealth?.increaseMaxHp(maxHpIncrease, true, this.playerStats.maxHpLimit);
    return true;
  }

  private formatMaxHpPreview(): string {
    const nextMaxHp = Math.min(
      this.playerStats.maxHpLimit,
      Math.round(this.playerStats.maxHp * 1.1),
    );
    const maxHpIncrease = nextMaxHp - this.playerStats.maxHp;
    const currentHp = this.playerHealth?.currentHp ?? this.playerStats.maxHp;
    const nextHp = Math.min(currentHp + maxHpIncrease, nextMaxHp);

    return [
      this.formatChange('Max HP', this.playerStats.maxHp, nextMaxHp),
      this.formatChange('HP', currentHp, nextHp),
    ].join('\n');
  }

  private addBible(): boolean {
    if (!this.weaponManager || !this.weaponFactory) {
      console.warn('Cannot add bible without weapon systems');
      return false;
    }

    if (this.weaponManager.hasWeaponOrEvolution('bible')) {
      console.warn('Bible already added');
      return false;
    }

    this.weaponManager.addWeapon(this.weaponFactory.create('bible'));
    return true;
  }

  private addMagicWand(): boolean {
    if (!this.weaponManager || !this.weaponFactory) {
      console.warn('Cannot add magic wand without weapon systems');
      return false;
    }

    if (this.weaponManager.hasWeaponOrEvolution('magic_wand')) {
      console.warn('Magic Wand already added');
      return false;
    }

    this.weaponManager.addWeapon(this.weaponFactory.create('magic_wand'));
    return true;
  }

  private addAxe(): boolean {
    if (!this.weaponManager || !this.weaponFactory) {
      console.warn('Cannot add axe without weapon systems');
      return false;
    }

    if (this.weaponManager.hasWeaponOrEvolution('axe')) {
      console.warn('Axe already added');
      return false;
    }

    this.weaponManager.addWeapon(this.weaponFactory.create('axe'));
    return true;
  }

  private applyWeaponUpgrade(upgradeId: string): boolean {
    if (!this.weaponManager) {
      console.warn(`Cannot apply weapon upgrade without weapon manager: ${upgradeId}`);
      return false;
    }

    if (!this.weaponManager.applyWeaponUpgrade(upgradeId)) {
      console.warn(`Weapon upgrade was not applied: ${upgradeId}`);
      return false;
    }

    return true;
  }

  private applyPassiveUpgrade(passiveId: string): boolean {
    if (!this.passiveManager) {
      console.warn(`Cannot apply passive without passive manager: ${passiveId}`);
      return false;
    }

    if (!this.passiveManager.applyPassive(passiveId)) {
      console.warn(`Unsupported or maxed passive id: ${passiveId}`);
      return false;
    }

    return true;
  }

  private getPassiveUpgradePreview(passiveId: string): string | undefined {
    return this.passiveManager?.getPreview(passiveId);
  }

  private getWeaponUpgradeDisplayInfo(
    weaponId: string,
    evolutionManager?: EvolutionManager,
  ): UpgradeDisplayInfo | undefined {
    if (!this.weaponManager) {
      return undefined;
    }

    const displayWeaponId = this.weaponManager.getUpgradeTargetWeaponId(weaponId);
    const rows: UpgradeDisplayRow[] = [
      {
        iconKey: this.getWeaponIconKey(displayWeaponId),
        fallback: this.getInitials(displayWeaponId),
        text: `${this.formatName(displayWeaponId)} Lv.${this.weaponManager.getWeaponUpgradeTotal(weaponId)} / ${this.weaponManager.getWeaponUpgradeLimit(weaponId)}`,
      },
    ];
    const rule = evolutionManager?.getRequiredPassiveForWeapon(weaponId);

    if (rule) {
      rows.push({
        iconKey: this.getPassiveIconKey(rule.requiredPassiveId),
        fallback: this.getInitials(rule.requiredPassiveId),
        text: `${this.passiveManager?.getPassiveName(rule.requiredPassiveId) ?? this.formatName(rule.requiredPassiveId)} Lv.${this.passiveManager?.getPassiveLevel(rule.requiredPassiveId) ?? 0} / ${this.passiveManager?.getPassiveMaxLevel(rule.requiredPassiveId) ?? rule.requiredPassiveLevel}`,
      });
    }

    return { rows };
  }

  private getPassiveUpgradeDisplayInfo(
    passiveId: string,
    evolutionManager?: EvolutionManager,
  ): UpgradeDisplayInfo {
    const rows: UpgradeDisplayRow[] = [
      {
        iconKey: this.getPassiveIconKey(passiveId),
        fallback: this.getInitials(passiveId),
        text: `${this.passiveManager?.getPassiveName(passiveId) ?? this.formatName(passiveId)} Lv.${this.passiveManager?.getPassiveLevel(passiveId) ?? 0} / ${this.passiveManager?.getPassiveMaxLevel(passiveId) ?? 5}`,
      },
    ];
    const ownedWeaponRules = evolutionManager
      ?.getWeaponsForPassive(passiveId)
      .filter((rule) => this.weaponManager?.hasWeaponOrEvolution(rule.baseWeaponId)) ?? [];

    if (ownedWeaponRules.length === 0) {
      rows.push({
        fallback: '-',
        text: 'No matching weapon owned',
      });
      return { rows };
    }

    for (const rule of ownedWeaponRules) {
      const displayWeaponId = this.weaponManager?.getUpgradeTargetWeaponId(rule.baseWeaponId)
        ?? rule.baseWeaponId;
      rows.push({
        iconKey: this.getWeaponIconKey(displayWeaponId),
        fallback: this.getInitials(displayWeaponId),
        text: `${this.formatName(displayWeaponId)} Lv.${this.weaponManager?.getWeaponUpgradeTotal(rule.baseWeaponId) ?? 0} / ${this.weaponManager?.getWeaponUpgradeLimit(rule.baseWeaponId) ?? rule.requiredWeaponUpgradeTotal}`,
      });
    }

    return { rows };
  }

  private formatWeaponChange(
    weaponId: string,
    stat: 'damage'
      | 'cooldown'
      | 'radius'
      | 'orbitCount'
      | 'orbitSpeed'
      | 'projectileSpeed'
      | 'projectileCount',
    label: string,
    multiplier: number,
    cap?: number,
    isSeconds = false,
    isIncrement = false,
  ): string | undefined {
    const currentValue = this.weaponManager?.getWeaponStat(weaponId, stat);

    if (currentValue === undefined) {
      return undefined;
    }

    const nextValue = isIncrement
      ? currentValue + multiplier
      : currentValue * multiplier;
    const cappedNextValue = cap === undefined
      ? nextValue
      : isSeconds
        ? Math.max(nextValue, cap)
        : Math.min(nextValue, cap);

    return this.formatChange(label, currentValue, cappedNextValue, isSeconds);
  }

  private formatChange(
    label: string,
    currentValue: number,
    nextValue: number,
    isSeconds = false,
  ): string {
    const currentText = isSeconds
      ? `${currentValue.toFixed(2)}s`
      : this.formatNumber(currentValue);
    const nextText = isSeconds
      ? `${nextValue.toFixed(2)}s`
      : this.formatNumber(nextValue);

    return `${label}: ${currentText} \u2192 ${nextText}`;
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value)
      ? value.toString()
      : value.toFixed(2).replace(/\.?0+$/, '');
  }

  private getWeaponIdForUpgradeId(upgradeId: string): string | undefined {
    if (upgradeId.startsWith('knife_')) {
      return 'knife';
    }

    if (upgradeId.startsWith('garlic_')) {
      return 'garlic';
    }

    if (upgradeId.startsWith('bible_')) {
      return 'bible';
    }

    if (upgradeId.startsWith('magic_wand_')) {
      return 'magic_wand';
    }

    if (upgradeId.startsWith('axe_')) {
      return 'axe';
    }

    return undefined;
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

  private getInitials(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  private formatName(value: string): string {
    return value
      .split('_')
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
  }
}
