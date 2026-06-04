import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { EventBus } from '../core/EventBus';
import { GameEventMap, isEnemyKilledEvent } from '../enemy/Enemy';
import { UpgradeFlow } from '../progression/UpgradeFlow';

import { TreasureChest } from './TreasureChest';

interface Position {
  x: number;
  y: number;
}

export class TreasureManager {
  private static readonly NORMAL_DROP_CHANCE = 0.03;
  private static readonly ENDLESS_DROP_WINDOW_SECONDS = 60;
  private static readonly ENDLESS_MAX_DROPS_PER_WINDOW = 10;

  private readonly chests: TreasureChest[] = [];
  private readonly unsubscribeEnemyKilled: () => void;
  private bonusDropChance = 0;
  private endlessDropWindow = -1;
  private endlessDropsInWindow = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    eventBus: EventBus<GameEventMap>,
    private readonly upgradeFlow: UpgradeFlow,
    private readonly onChestDropped?: () => void,
    private readonly onChestOpened?: () => void,
    private readonly getEndlessTimeSeconds?: () => number | null,
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

  static getTreasureConfig(): {
    normalDropChance: number;
    endlessDropWindowSeconds: number;
    endlessMaxDropsPerWindow: number;
  } {
    return {
      normalDropChance: TreasureManager.NORMAL_DROP_CHANCE,
      endlessDropWindowSeconds: TreasureManager.ENDLESS_DROP_WINDOW_SECONDS,
      endlessMaxDropsPerWindow: TreasureManager.ENDLESS_MAX_DROPS_PER_WINDOW,
    };
  }

  update(playerPosition: Position, pickupRange: number, deltaMs = 16): void {
    for (let index = this.chests.length - 1; index >= 0; index -= 1) {
      const chest = this.chests[index];

      if (chest.isOpened) {
        this.chests.splice(index, 1);
        continue;
      }

      if (chest.isMagnetizing) {
        chest.updateMagnet(playerPosition.x, playerPosition.y, deltaMs);

        if (chest.canFinalizeOpen(playerPosition.x, playerPosition.y)) {
          chest.open();
          this.applyRandomUpgrade();
          this.chests.splice(index, 1);
        }

        continue;
      }

      if (this.isChestInRange(chest, playerPosition, pickupRange)) {
        chest.startMagnet();
      }
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
    if (isBoss) {
      return true;
    }

    if (Math.random() >= TreasureManager.NORMAL_DROP_CHANCE + this.bonusDropChance) {
      return false;
    }

    const endlessTimeSeconds = this.getEndlessTimeSeconds?.();

    if (endlessTimeSeconds === null || endlessTimeSeconds === undefined) {
      return true;
    }

    this.updateEndlessDropWindow(endlessTimeSeconds);

    if (this.endlessDropsInWindow >= TreasureManager.ENDLESS_MAX_DROPS_PER_WINDOW) {
      return false;
    }

    this.endlessDropsInWindow += 1;
    return true;
  }

  private updateEndlessDropWindow(endlessTimeSeconds: number): void {
    const windowIndex = Math.floor(
      Math.max(0, endlessTimeSeconds) / TreasureManager.ENDLESS_DROP_WINDOW_SECONDS,
    );

    if (windowIndex === this.endlessDropWindow) {
      return;
    }

    this.endlessDropWindow = windowIndex;
    this.endlessDropsInWindow = 0;
  }

  private spawnChest(x: number, y: number): void {
    this.chests.push(new TreasureChest(this.scene, x, y));
    this.onChestDropped?.();
  }

  private isChestInRange(
    chest: TreasureChest,
    playerPosition: Position,
    pickupRange: number,
  ): boolean {
    return !chest.isOpened
      && Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        chest.body.x,
        chest.body.y,
      ) <= pickupRange;
  }

  private applyRandomUpgrade(): void {
    this.onChestOpened?.();
    AudioManager.playSfx(this.scene, 'treasure_open');
    const result = this.upgradeFlow.applyTreasureReward();

    if (result.type === 'none') {
      console.warn('Treasure chest opened, but no reward was applied');
    }
  }
}
