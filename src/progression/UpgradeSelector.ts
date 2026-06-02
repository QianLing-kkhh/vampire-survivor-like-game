import { UpgradeOption } from './UpgradeOption';

export interface UpgradeSelectionContext {
  hasWeapon(weaponId: string): boolean;
  getWeaponStat?(
    weaponId: string,
    stat: 'damage'
      | 'cooldown'
      | 'radius'
      | 'orbitCount'
      | 'orbitSpeed'
      | 'projectileSpeed'
      | 'projectileCount',
  ): number | undefined;
  getPassiveLevel?(passiveId: string): number;
  isWeaponUpgradeLimitReached?(weaponId: string): boolean;
  hasWeaponOrEvolution?(baseWeaponId: string): boolean;
  isBaseWeaponEvolved?(baseWeaponId: string): boolean;
}

export class UpgradeSelector {
  constructor(private readonly upgrades: readonly UpgradeOption[]) {}

  selectOptions(count = 3, context?: UpgradeSelectionContext): UpgradeOption[] {
    const availableUpgrades = this.getAvailableUpgrades(context);

    if (availableUpgrades.length <= count) {
      return [...availableUpgrades];
    }

    const guaranteedNewWeapon = this.selectGuaranteedNewWeaponUpgrade(
      availableUpgrades,
      context,
    );

    if (guaranteedNewWeapon) {
      const remainingUpgrades = availableUpgrades.filter((upgrade) => (
        upgrade.id !== guaranteedNewWeapon.id
      ));

      return [
        guaranteedNewWeapon,
        ...this.shuffleUpgrades(remainingUpgrades).slice(0, count - 1),
      ];
    }

    return this.shuffleUpgrades(availableUpgrades).slice(0, count);
  }

  private getAvailableUpgrades(context?: UpgradeSelectionContext): UpgradeOption[] {
    if (!context) {
      return [...this.upgrades];
    }

    const hasGarlic = context.hasWeapon('garlic');
    const hasBible = context.hasWeapon('bible');
    const hasMagicWand = context.hasWeapon('magic_wand');
    const hasAxe = context.hasWeapon('axe');
    const hasGarlicOrEvolution = context.hasWeaponOrEvolution?.('garlic') ?? hasGarlic;
    const hasBibleOrEvolution = context.hasWeaponOrEvolution?.('bible') ?? hasBible;
    const hasMagicWandOrEvolution = context.hasWeaponOrEvolution?.('magic_wand') ?? hasMagicWand;
    const hasAxeOrEvolution = context.hasWeaponOrEvolution?.('axe') ?? hasAxe;
    const isGarlicEvolved = context.isBaseWeaponEvolved?.('garlic') ?? false;
    const isBibleEvolved = context.isBaseWeaponEvolved?.('bible') ?? false;
    const isMagicWandEvolved = context.isBaseWeaponEvolved?.('magic_wand') ?? false;
    const isAxeEvolved = context.isBaseWeaponEvolved?.('axe') ?? false;
    const isKnifeEvolved = context.isBaseWeaponEvolved?.('knife') ?? false;

    return this.upgrades.filter((upgrade) => {
      if ((!hasGarlic || isGarlicEvolved) && this.isGarlicUpgrade(upgrade.id)) {
        return false;
      }

      if ((!hasBible || isBibleEvolved) && this.isBibleUpgrade(upgrade.id)) {
        return false;
      }

      if ((!hasMagicWand || isMagicWandEvolved) && this.isMagicWandUpgrade(upgrade.id)) {
        return false;
      }

      if ((!hasAxe || isAxeEvolved) && this.isAxeUpgrade(upgrade.id)) {
        return false;
      }

      if (isKnifeEvolved && this.isKnifeUpgrade(upgrade.id)) {
        return false;
      }

      if (hasGarlicOrEvolution && upgrade.id === 'add_garlic') {
        return false;
      }

      if (hasBibleOrEvolution && upgrade.id === 'add_bible') {
        return false;
      }

      if (hasMagicWandOrEvolution && upgrade.id === 'add_magic_wand') {
        return false;
      }

      if (hasAxeOrEvolution && upgrade.id === 'add_axe') {
        return false;
      }

      if (
        hasBible
        && upgrade.id === 'bible_orbit_count_up'
        && (context.getWeaponStat?.('bible', 'orbitCount') ?? 0) >= 6
      ) {
        return false;
      }

      if (
        hasMagicWand
        && upgrade.id === 'magic_wand_projectile_count_up'
        && (context.getWeaponStat?.('magic_wand', 'projectileCount') ?? 0) >= 4
      ) {
        return false;
      }

      if (
        hasAxe
        && upgrade.id === 'axe_projectile_count_up'
        && (context.getWeaponStat?.('axe', 'projectileCount') ?? 0) >= 4
      ) {
        return false;
      }

      const weaponUpgradeId = this.getWeaponIdForUpgrade(upgrade.id);

      if (
        weaponUpgradeId
        && context.hasWeapon(weaponUpgradeId)
        && context.isWeaponUpgradeLimitReached?.(weaponUpgradeId)
      ) {
        return false;
      }

      if (
        this.isPassiveUpgrade(upgrade.id)
        && (context.getPassiveLevel?.(upgrade.id) ?? 0) >= 5
      ) {
        return false;
      }

      return true;
    });
  }

  private isGarlicUpgrade(upgradeId: string): boolean {
    return upgradeId === 'garlic_damage_up' || upgradeId === 'garlic_radius_up';
  }

  private isBibleUpgrade(upgradeId: string): boolean {
    return (
      upgradeId === 'bible_damage_up'
      || upgradeId === 'bible_orbit_speed_up'
      || upgradeId === 'bible_orbit_count_up'
    );
  }

  private isMagicWandUpgrade(upgradeId: string): boolean {
    return (
      upgradeId === 'magic_wand_damage_up'
      || upgradeId === 'magic_wand_cooldown_up'
      || upgradeId === 'magic_wand_projectile_count_up'
    );
  }

  private isAxeUpgrade(upgradeId: string): boolean {
    return (
      upgradeId === 'axe_damage_up'
      || upgradeId === 'axe_cooldown_up'
      || upgradeId === 'axe_projectile_count_up'
    );
  }

  private selectGuaranteedNewWeaponUpgrade(
    availableUpgrades: readonly UpgradeOption[],
    context?: UpgradeSelectionContext,
  ): UpgradeOption | undefined {
    if (!context) {
      return undefined;
    }

    const availableNewWeaponUpgrades = availableUpgrades.filter((upgrade) => (
      this.isNewWeaponUpgrade(upgrade.id)
    ));

    if (availableNewWeaponUpgrades.length === 0) {
      return undefined;
    }

    const randomIndex = Math.floor(Math.random() * availableNewWeaponUpgrades.length);

    return availableNewWeaponUpgrades[randomIndex];
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
    if (this.isGarlicUpgrade(upgradeId)) {
      return 'garlic';
    }

    if (this.isBibleUpgrade(upgradeId)) {
      return 'bible';
    }

    if (this.isMagicWandUpgrade(upgradeId)) {
      return 'magic_wand';
    }

    if (this.isAxeUpgrade(upgradeId)) {
      return 'axe';
    }

    if (this.isKnifeUpgrade(upgradeId)) {
      return 'knife';
    }

    return undefined;
  }

  private isKnifeUpgrade(upgradeId: string): boolean {
    return upgradeId === 'knife_damage_up' || upgradeId === 'knife_cooldown_up';
  }

  private shuffleUpgrades(upgrades: readonly UpgradeOption[]): UpgradeOption[] {
    const shuffled = [...upgrades];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
  }
}
