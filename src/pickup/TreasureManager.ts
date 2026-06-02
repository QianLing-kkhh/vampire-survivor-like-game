import Phaser from 'phaser';

import { EventBus } from '../core/EventBus';
import { GameEventMap, isEnemyKilledEvent } from '../enemy/Enemy';
import { EvolutionManager } from '../evolution/EvolutionManager';
import { EVOLUTION_RULES, EvolutionResult } from '../evolution/EvolutionRule';
import { UpgradeApplier } from '../progression/UpgradeApplier';
import { UpgradeOption } from '../progression/UpgradeOption';
import { UpgradeSelectionContext, UpgradeSelector } from '../progression/UpgradeSelector';
import { WeaponManager } from '../weapon/WeaponManager';

import { TreasureChest } from './TreasureChest';

interface Position {
  x: number;
  y: number;
}

export class TreasureManager {
  private static readonly NORMAL_DROP_CHANCE = 0.03;

  private readonly chests: TreasureChest[] = [];
  private readonly unsubscribeEnemyKilled: () => void;
  private bonusDropChance = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    eventBus: EventBus<GameEventMap>,
    private readonly upgradeSelector: UpgradeSelector,
    private readonly upgradeApplier: UpgradeApplier,
    private readonly upgradeSelectionContext: UpgradeSelectionContext,
    private readonly weaponManager: WeaponManager,
    private readonly onChestUpgradeApplied: (option: UpgradeOption) => void,
    private readonly onChestDropped?: () => void,
    private readonly onChestOpened?: () => void,
    private readonly evolutionManager?: EvolutionManager,
    private readonly onEvolutionApplied?: (result: EvolutionResult) => void,
    private readonly onInvalidUpgradeSelected?: (option: UpgradeOption) => void,
  ) {
    this.unsubscribeEnemyKilled = eventBus.subscribe('EnemyKilled', (event) => {
      if (!isEnemyKilledEvent(event)) {
        return;
      }

      if (!this.shouldDropChest(event.isBoss === true)) {
        return;
      }

      this.spawnChest(event.x, event.y);
    });
  }

  update(playerPosition: Position, pickupRange: number): void {
    const openedChests = this.findChestsInRange(playerPosition, pickupRange);

    if (openedChests.length === 0) {
      return;
    }

    this.removeOpenedChests(openedChests);

    for (const chest of openedChests) {
      chest.open();
      this.applyRandomUpgrade();
    }
  }

  getChests(): Position[] {
    return this.chests
      .filter((chest) => !chest.isOpened)
      .map((chest) => ({
        x: chest.body.x,
        y: chest.body.y,
      }));
  }

  setBonusDropChance(bonusDropChance: number): void {
    this.bonusDropChance = Math.max(0, bonusDropChance);
  }

  destroy(): void {
    this.unsubscribeEnemyKilled();

    for (const chest of this.chests) {
      chest.destroy();
    }

    this.chests.length = 0;
  }

  private shouldDropChest(isBoss: boolean): boolean {
    return (
      isBoss
      || Math.random() < TreasureManager.NORMAL_DROP_CHANCE + this.bonusDropChance
    );
  }

  private spawnChest(x: number, y: number): void {
    this.chests.push(new TreasureChest(this.scene, x, y));
    this.onChestDropped?.();
  }

  private findChestsInRange(
    playerPosition: Position,
    pickupRange: number,
  ): TreasureChest[] {
    return this.chests.filter((chest) => (
      !chest.isOpened
      && Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        chest.body.x,
        chest.body.y,
      ) <= pickupRange
    ));
  }

  private removeOpenedChests(openedChests: readonly TreasureChest[]): void {
    const openedSet = new Set(openedChests);

    for (let index = this.chests.length - 1; index >= 0; index -= 1) {
      if (!openedSet.has(this.chests[index])) {
        continue;
      }

      this.chests.splice(index, 1);
    }
  }

  private applyRandomUpgrade(): void {
    this.onChestOpened?.();

    const evolutionResult = this.evolutionManager?.tryEvolve({
      weaponManager: this.weaponManager,
      getPassiveLevel: (passiveId) => (
        this.upgradeSelectionContext.getPassiveLevel?.(passiveId) ?? 0
      ),
    });

    if (evolutionResult) {
      this.onEvolutionApplied?.(evolutionResult);
      console.log(
        `Treasure chest evolution: ${evolutionResult.baseWeaponId} -> ${evolutionResult.evolvedWeaponId}`,
      );
      return;
    }

    const options = this.getFilteredTreasureUpgradeOptions();

    if (options.length === 0) {
      console.warn('Treasure chest opened, but no upgrade options were available');
      return;
    }

    const option = options[Math.floor(Math.random() * options.length)];

    if (!this.upgradeApplier.apply(option)) {
      this.onInvalidUpgradeSelected?.(option);
      console.warn(`Treasure chest selected invalid upgrade: ${option.id}`);
      return;
    }

    this.onChestUpgradeApplied(option);
    console.log('Treasure chest upgrade:', option.id);
  }

  private getFilteredTreasureUpgradeOptions(): UpgradeOption[] {
    return this.upgradeSelector
      .selectOptions(3, this.upgradeSelectionContext)
      .filter((option) => !this.isDuplicateAddWeaponAfterEvolution(option.id));
  }

  private isDuplicateAddWeaponAfterEvolution(upgradeId: string): boolean {
    const baseWeaponId = this.getBaseWeaponIdForAddUpgrade(upgradeId);

    if (!baseWeaponId) {
      return false;
    }

    const evolutionRule = EVOLUTION_RULES.find((rule) => rule.baseWeaponId === baseWeaponId);

    return evolutionRule === undefined
      ? false
      : this.weaponManager.hasWeapon(evolutionRule.evolvedWeaponId);
  }

  private getBaseWeaponIdForAddUpgrade(upgradeId: string): string | undefined {
    switch (upgradeId) {
      case 'add_garlic':
        return 'garlic';
      case 'add_bible':
        return 'bible';
      case 'add_magic_wand':
        return 'magic_wand';
      case 'add_axe':
        return 'axe';
      default:
        return undefined;
    }
  }
}
