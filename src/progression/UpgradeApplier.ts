import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { PassiveManager } from '../passive/PassiveManager';
import { WeaponFactory } from '../weapon/WeaponFactory';
import { WeaponManager } from '../weapon/WeaponManager';
import { RunStats } from '../stats/RunStats';
import { UpgradeOption } from './UpgradeOption';

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
        this.playerStats.increaseMoveSpeed(0.1);
        applied = true;
        break;
      case 'pickup_range_up':
        this.playerStats.increasePickupRange(0.1);
        applied = true;
        break;
      case 'max_hp_up':
        this.applyMaxHpUpgrade();
        applied = true;
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
          this.playerStats.moveSpeed * 1.1,
        );
      case 'pickup_range_up':
        return this.formatChange(
          'Pickup Range',
          this.playerStats.pickupRange,
          this.playerStats.pickupRange * 1.1,
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
        return this.formatWeaponChange('knife', 'damage', 'Knife Damage', 1.1);
      case 'knife_cooldown_up':
        return this.formatWeaponChange(
          'knife',
          'cooldown',
          'Knife Cooldown',
          0.9,
          0.3,
          true,
        );
      case 'garlic_damage_up':
        return this.formatWeaponChange('garlic', 'damage', 'Garlic Damage', 1.1);
      case 'garlic_radius_up':
        return this.formatWeaponChange('garlic', 'radius', 'Garlic Radius', 1.1, 4.0);
      case 'bible_damage_up':
        return this.formatWeaponChange('bible', 'damage', 'Bible Damage', 1.1);
      case 'bible_orbit_speed_up':
        return this.formatWeaponChange('bible', 'orbitSpeed', 'Bible Orbit Speed', 1.1, 360);
      case 'bible_orbit_count_up':
        return this.formatWeaponChange('bible', 'orbitCount', 'Bible Count', 1, 6, false, true);
      case 'magic_wand_damage_up':
        return this.formatWeaponChange('magic_wand', 'damage', 'Magic Wand Damage', 1.1);
      case 'magic_wand_cooldown_up':
        return this.formatWeaponChange(
          'magic_wand',
          'cooldown',
          'Magic Wand Cooldown',
          0.9,
          0.35,
          true,
        );
      case 'magic_wand_projectile_count_up':
        return this.formatWeaponChange(
          'magic_wand',
          'projectileCount',
          'Magic Wand Count',
          1,
          4,
          false,
          true,
        );
      case 'axe_damage_up':
        return this.formatWeaponChange('axe', 'damage', 'Axe Damage', 1.1);
      case 'axe_cooldown_up':
        return this.formatWeaponChange(
          'axe',
          'cooldown',
          'Axe Cooldown',
          0.9,
          0.6,
          true,
        );
      case 'axe_projectile_count_up':
        return this.formatWeaponChange(
          'axe',
          'projectileCount',
          'Axe Count',
          1,
          4,
          false,
          true,
        );
      default:
        return undefined;
    }
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

  private applyMaxHpUpgrade(): void {
    const previousMaxHp = this.playerStats.maxHp;

    this.playerStats.increaseMaxHp(0.1);
    this.playerHealth?.increaseMaxHp(this.playerStats.maxHp - previousMaxHp, true);
  }

  private formatMaxHpPreview(): string {
    const nextMaxHp = Math.round(this.playerStats.maxHp * 1.1);
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
}
