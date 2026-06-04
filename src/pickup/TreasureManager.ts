import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';
import { EventBus } from '../core/EventBus';
import { GameEventMap, isEnemyKilledEvent } from '../enemy/Enemy';
import { GameEventBus } from '../events/GameEventBus';
import { UpgradeFlow } from '../progression/UpgradeFlow';
import { RandomSource } from '../random/RandomSource';
import { SeededRandom } from '../random/SeededRandom';
import { RunRuleSet } from '../rules/RunRuleSet';

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
    private readonly runRuleSet?: RunRuleSet,
    private readonly random: RandomSource = new SeededRandom('treasure-fallback'),
    private readonly gameEventBus?: GameEventBus,
    private readonly getGameTimeSeconds?: () => number,
    private readonly getRunId?: () => string | undefined,
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
          const openedX = chest.body.x;
          const openedY = chest.body.y;
          chest.open();
          this.emitTreasureOpened(openedX, openedY);
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

  getActiveCount(): number {
    return this.chests.filter((chest) => !chest.isOpened).length;
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

    const dropChance = this.runRuleSet?.applyTreasureDropChance(
      TreasureManager.NORMAL_DROP_CHANCE + this.bonusDropChance,
    ) ?? TreasureManager.NORMAL_DROP_CHANCE + this.bonusDropChance;

    if (!this.random.chance(dropChance)) {
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
    this.emitTreasureDropped(x, y);
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

  private emitTreasureDropped(x: number, y: number): void {
    const gameTimeSeconds = this.getGameTimeSeconds?.() ?? 0;

    this.gameEventBus?.emit('pickup.treasureDropped', {
      x,
      y,
      gameTimeSeconds,
    }, {
      gameTimeSeconds,
      runId: this.getRunId?.(),
    });
  }

  private emitTreasureOpened(x: number, y: number): void {
    const gameTimeSeconds = this.getGameTimeSeconds?.() ?? 0;

    this.gameEventBus?.emit('pickup.treasureOpened', {
      x,
      y,
      gameTimeSeconds,
    }, {
      gameTimeSeconds,
      runId: this.getRunId?.(),
    });
  }
}
