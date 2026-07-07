import {
  getTieredUpgradeDisplayPassiveIconKey,
  getTieredUpgradeDisplayWeaponIconKey,
  getUpgradeDisplayPassiveIconKey,
  getUpgradeDisplayWeaponIconKey,
} from '../assets/AssetKeyMap';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerStats } from '../player/PlayerStats';
import { PassiveManager } from '../passive/PassiveManager';
import { WeaponFactory } from '../weapon/WeaponFactory';
import { WeaponManager } from '../weapon/WeaponManager';
import { RunStats } from '../stats/RunStats';
import { EvolutionManager } from '../evolution/EvolutionManager';
import {
  formatContentId,
  getPassiveDisplayName,
  getStatDisplayName,
  getWeaponDisplayName,
} from '../i18n/ContentText';
import { I18n } from '../i18n/I18n';
import { UpgradeOption } from './UpgradeOption';

export interface UpgradeDisplayRow {
  iconKey?: string;
  iconFallbackKeys?: string[];
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
    const genericApplied = this.applyGenericOption(option);

    if (genericApplied !== undefined) {
      if (genericApplied) {
        this.runStats?.recordUpgrade(option.id);
      }

      return genericApplied;
    }

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
    const genericPreview = this.getGenericUpgradePreview(option);

    if (genericPreview !== undefined) {
      return genericPreview;
    }

    switch (option.id) {
      case 'speed_up':
        return this.formatChange(
          getStatDisplayName('moveSpeed', 'Move Speed'),
          this.playerStats.moveSpeed,
          Math.min(this.playerStats.maxMoveSpeed, this.playerStats.moveSpeed * 1.1),
        );
      case 'pickup_range_up':
        return this.formatChange(
          getStatDisplayName('pickupRange', 'Pickup Range'),
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
        return this.formatWeaponChange('knife', 'damage', getStatDisplayName('damage', 'Damage'), 1.1);
      case 'knife_cooldown_up':
        return this.formatWeaponChange(
          'knife',
          'cooldown',
          getStatDisplayName('cooldown', 'Cooldown'),
          0.9,
          0.3,
          true,
        );
      case 'garlic_damage_up':
        return this.formatWeaponChange('garlic', 'damage', getStatDisplayName('damage', 'Damage'), 1.1);
      case 'garlic_radius_up':
        return this.formatWeaponChange('garlic', 'radius', getStatDisplayName('radius', 'Radius'), 1.1, 4.0);
      case 'bible_damage_up':
        return this.formatWeaponChange('bible', 'damage', getStatDisplayName('damage', 'Damage'), 1.1);
      case 'bible_orbit_speed_up':
        return this.formatWeaponChange('bible', 'orbitSpeed', getStatDisplayName('orbitSpeed', 'Orbit Speed'), 1.1, 360);
      case 'bible_orbit_count_up':
        return this.formatWeaponChange('bible', 'orbitCount', getStatDisplayName('orbitCount', 'Count'), 1, 6, false, true);
      case 'magic_wand_damage_up':
        return this.formatWeaponChange('magic_wand', 'damage', getStatDisplayName('damage', 'Damage'), 1.1);
      case 'magic_wand_cooldown_up':
        return this.formatWeaponChange(
          'magic_wand',
          'cooldown',
          getStatDisplayName('cooldown', 'Cooldown'),
          0.9,
          0.35,
          true,
        );
      case 'magic_wand_projectile_count_up':
        return this.formatWeaponChange(
          'magic_wand',
          'projectileCount',
          getStatDisplayName('projectileCount', 'Count'),
          1,
          4,
          false,
          true,
        );
      case 'axe_damage_up':
        return this.formatWeaponChange('axe', 'damage', getStatDisplayName('damage', 'Damage'), 1.1);
      case 'axe_cooldown_up':
        return this.formatWeaponChange(
          'axe',
          'cooldown',
          getStatDisplayName('cooldown', 'Cooldown'),
          0.9,
          0.6,
          true,
        );
      case 'axe_projectile_count_up':
        return this.formatWeaponChange(
          'axe',
          'projectileCount',
          getStatDisplayName('projectileCount', 'Count'),
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
    const weaponId = option.kind === 'weaponStat'
      ? option.weaponId
      : this.getWeaponIdForUpgradeId(option.id);

    if (weaponId) {
      return this.getWeaponUpgradeDisplayInfo(weaponId, evolutionManager);
    }

    if (option.kind === 'passive' || this.isPassiveUpgrade(option.id)) {
      return this.getPassiveUpgradeDisplayInfo(option.passiveId ?? option.id, evolutionManager);
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
      this.formatChange(getStatDisplayName('maxHp', 'Max HP'), this.playerStats.maxHp, nextMaxHp),
      this.formatChange(I18n.t('statsBuild.hp'), currentHp, nextHp),
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

  private applyGenericOption(option: UpgradeOption): boolean | undefined {
    switch (option.kind) {
      case 'addWeapon':
        return option.weaponId ? this.addWeaponById(option.weaponId) : false;
      case 'passive':
        return this.applyPassiveUpgrade(option.passiveId ?? option.id);
      case 'weaponStat':
        return this.applyWeaponUpgrade(option.id);
      case 'playerStat':
        return undefined;
      default:
        return undefined;
    }
  }

  private addWeaponById(weaponId: string): boolean {
    if (!this.weaponManager || !this.weaponFactory) {
      console.warn(`Cannot add ${weaponId} without weapon systems`);
      return false;
    }

    if (this.weaponManager.hasWeaponOrEvolution(weaponId)) {
      console.warn(`${weaponId} already added`);
      return false;
    }

    this.weaponManager.addWeapon(this.weaponFactory.create(weaponId));
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

  private getGenericUpgradePreview(option: UpgradeOption): string | undefined {
    if (option.kind === 'passive') {
      return this.getPassiveUpgradePreview(option.passiveId ?? option.id);
    }

    if (option.kind === 'addWeapon') {
      return `${I18n.t('ui.new')} ${getWeaponDisplayName(option.weaponId ?? option.id)}`;
    }

    if (option.kind !== 'weaponStat' || !option.weaponId || !this.isWeaponStat(option.stat)) {
      return undefined;
    }

    const label = this.formatStatLabel(option.stat);
    const multiplier = option.operation === 'add'
      ? option.value ?? 1
      : option.value ?? this.getDefaultWeaponUpgradeMultiplier(option.stat);

    return this.formatWeaponChange(
      option.weaponId,
      option.stat,
      label,
      multiplier,
      option.cap,
      option.stat === 'cooldown',
      option.operation === 'add',
    );
  }

  private getWeaponUpgradeDisplayInfo(
    weaponId: string,
    evolutionManager?: EvolutionManager,
  ): UpgradeDisplayInfo | undefined {
    if (!this.weaponManager) {
      return undefined;
    }

    const displayWeaponId = this.weaponManager.getUpgradeTargetWeaponId(weaponId);
    const level = this.weaponManager.getWeaponUpgradeTotal(weaponId);
    const maxLevel = this.weaponManager.getWeaponUpgradeLimit(weaponId);
    const displayLevel = Math.min(maxLevel, level + 1);
    const rows: UpgradeDisplayRow[] = [
      {
        iconKey: this.getTieredWeaponIconKey(displayWeaponId, displayLevel, maxLevel),
        iconFallbackKeys: [this.getWeaponIconKey(displayWeaponId)],
        fallback: this.getInitials(displayWeaponId),
        text: `${getWeaponDisplayName(displayWeaponId)} Lv.${displayLevel} / ${maxLevel}`,
      },
    ];
    const rule = evolutionManager?.getRequiredPassiveForWeapon(weaponId);

    if (rule) {
      rows.push({
        iconKey: this.getTieredPassiveIconKey(
          rule.requiredPassiveId,
          this.passiveManager?.getPassiveLevel(rule.requiredPassiveId) ?? 0,
          this.passiveManager?.getPassiveMaxLevel(rule.requiredPassiveId) ?? rule.requiredPassiveLevel,
        ),
        iconFallbackKeys: [this.getPassiveIconKey(rule.requiredPassiveId)],
        fallback: this.getInitials(rule.requiredPassiveId),
        text: `${this.passiveManager?.getPassiveName(rule.requiredPassiveId) ?? getPassiveDisplayName(rule.requiredPassiveId)} Lv.${this.passiveManager?.getPassiveLevel(rule.requiredPassiveId) ?? 0} / ${this.passiveManager?.getPassiveMaxLevel(rule.requiredPassiveId) ?? rule.requiredPassiveLevel}`,
      });
    }

    return { rows };
  }

  private getPassiveUpgradeDisplayInfo(
    passiveId: string,
    evolutionManager?: EvolutionManager,
  ): UpgradeDisplayInfo {
    const level = this.passiveManager?.getPassiveLevel(passiveId) ?? 0;
    const maxLevel = this.passiveManager?.getPassiveMaxLevel(passiveId) ?? 5;
    const displayLevel = Math.min(maxLevel, level + 1);
    const rows: UpgradeDisplayRow[] = [
      {
        iconKey: this.getTieredPassiveIconKey(passiveId, displayLevel, maxLevel),
        iconFallbackKeys: [this.getPassiveIconKey(passiveId)],
        fallback: this.getInitials(passiveId),
        text: `${this.passiveManager?.getPassiveName(passiveId) ?? getPassiveDisplayName(passiveId)} Lv.${displayLevel} / ${maxLevel}`,
      },
    ];
    const ownedWeaponRules = evolutionManager
      ?.getWeaponsForPassive(passiveId)
      .filter((rule) => this.weaponManager?.hasWeaponOrEvolution(rule.baseWeaponId)) ?? [];

    if (ownedWeaponRules.length === 0) {
      rows.push({
        fallback: '-',
        text: I18n.t('levelUp.noMatchingWeaponOwned'),
      });
      return { rows };
    }

    for (const rule of ownedWeaponRules) {
      const displayWeaponId = this.weaponManager?.getUpgradeTargetWeaponId(rule.baseWeaponId)
        ?? rule.baseWeaponId;
      rows.push({
        iconKey: this.getTieredWeaponIconKey(
          displayWeaponId,
          this.weaponManager?.getWeaponUpgradeTotal(rule.baseWeaponId) ?? 0,
          this.weaponManager?.getWeaponUpgradeLimit(rule.baseWeaponId) ?? rule.requiredWeaponUpgradeTotal,
        ),
        iconFallbackKeys: [this.getWeaponIconKey(displayWeaponId)],
        fallback: this.getInitials(displayWeaponId),
        text: `${getWeaponDisplayName(displayWeaponId)} Lv.${this.weaponManager?.getWeaponUpgradeTotal(rule.baseWeaponId) ?? 0} / ${this.weaponManager?.getWeaponUpgradeLimit(rule.baseWeaponId) ?? rule.requiredWeaponUpgradeTotal}`,
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

  private formatStatLabel(stat: NonNullable<UpgradeOption['stat']>): string {
    switch (stat) {
      case 'moveSpeed':
        return getStatDisplayName('moveSpeed', 'Move Speed');
      case 'pickupRange':
        return getStatDisplayName('pickupRange', 'Pickup Range');
      case 'maxHp':
        return getStatDisplayName('maxHp', 'Max HP');
      case 'orbitCount':
      case 'projectileCount':
        return getStatDisplayName(stat, 'Count');
      case 'orbitSpeed':
        return getStatDisplayName('orbitSpeed', 'Orbit Speed');
      case 'projectileSpeed':
        return getStatDisplayName('projectileSpeed', 'Projectile Speed');
      default:
        return getStatDisplayName(stat, formatContentId(stat));
    }
  }

  private getDefaultWeaponUpgradeMultiplier(stat: NonNullable<UpgradeOption['stat']>): number {
    return stat === 'cooldown' ? 0.9 : 1.1;
  }

  private isWeaponStat(
    stat: UpgradeOption['stat'],
  ): stat is 'damage'
    | 'cooldown'
    | 'radius'
    | 'orbitCount'
    | 'orbitSpeed'
    | 'projectileSpeed'
    | 'projectileCount' {
    return stat === 'damage'
      || stat === 'cooldown'
      || stat === 'radius'
      || stat === 'orbitCount'
      || stat === 'orbitSpeed'
      || stat === 'projectileSpeed'
      || stat === 'projectileCount';
  }

  private getWeaponIconKey(weaponId: string): string {
    return getUpgradeDisplayWeaponIconKey(weaponId);
  }

  private getPassiveIconKey(passiveId: string): string {
    return getUpgradeDisplayPassiveIconKey(passiveId);
  }

  private getTieredWeaponIconKey(weaponId: string, level: number, maxLevel: number): string {
    return getTieredUpgradeDisplayWeaponIconKey(weaponId, this.getVisualTier(level, maxLevel));
  }

  private getTieredPassiveIconKey(passiveId: string, level: number, maxLevel: number): string {
    return getTieredUpgradeDisplayPassiveIconKey(passiveId, this.getVisualTier(level, maxLevel));
  }

  private getVisualTier(level: number, maxLevel: number): 1 | 2 | 3 {
    const safeLevel = Math.max(0, Math.floor(level));
    const safeMax = Math.max(1, Math.floor(maxLevel));
    const ratio = safeLevel / safeMax;

    if (ratio >= 0.8 || safeLevel >= safeMax) {
      return 3;
    }

    if (ratio >= 0.4) {
      return 2;
    }

    return 1;
  }

  private getInitials(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }
}
