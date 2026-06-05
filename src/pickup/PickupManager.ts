import Phaser from 'phaser';

import { EventBus } from '../core/EventBus';
import { GameEventMap, isEnemyKilledEvent } from '../enemy/Enemy';
import { ExpManager } from '../progression/ExpManager';

import { Pickup } from './Pickup';

interface Position {
  x: number;
  y: number;
}

export class PickupManager {
  private static readonly SOFT_PICKUP_CAP = 650;
  private static readonly HARD_PICKUP_CAP = 900;
  private static readonly MERGE_MIN_DISTANCE_FROM_PLAYER = 900;
  private static readonly MAX_MERGE_BATCH_SIZE = 24;

  private readonly pickups: Pickup[] = [];
  private readonly unsubscribeEnemyKilled: () => void;
  private mergedPickupCount = 0;
  private lastMergedPickupCount = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    eventBus: EventBus<GameEventMap>,
    private readonly expManager: ExpManager,
  ) {
    this.unsubscribeEnemyKilled = eventBus.subscribe('EnemyKilled', (event) => {
      if (!isEnemyKilledEvent(event)) {
        return;
      }

      this.spawnExpGem(event.x, event.y, event.exp);
    });
  }

  get totalExp(): number {
    return this.expManager.totalExp;
  }

  getActiveCount(): number {
    return this.pickups.filter((pickup) => !pickup.isCollected).length;
  }

  getDebugStats(): {
    activeCount: number;
    mergedPickupCount: number;
    lastMergedPickupCount: number;
  } {
    return {
      activeCount: this.getActiveCount(),
      mergedPickupCount: this.mergedPickupCount,
      lastMergedPickupCount: this.lastMergedPickupCount,
    };
  }

  update(playerPosition: Position, pickupRange: number, deltaMs = 16): void {
    this.lastMergedPickupCount = 0;

    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];

      if (pickup.isCollected) {
        this.pickups.splice(index, 1);
        continue;
      }

      if (pickup.isMagnetizing) {
        pickup.updateMagnet(playerPosition.x, playerPosition.y, deltaMs);

        if (pickup.canFinalizeCollect(playerPosition.x, playerPosition.y)) {
          const gainedExp = pickup.collect();

          if (gainedExp > 0) {
            this.expManager.addExp(gainedExp);
          }

          this.pickups.splice(index, 1);
        }

        continue;
      }

      if (this.isPickupInRange(pickup, playerPosition, pickupRange)) {
        pickup.startMagnet();
      }
    }

    this.enforceSoftCap(playerPosition);
  }

  destroy(): void {
    this.unsubscribeEnemyKilled();

    for (const pickup of this.pickups) {
      pickup.destroy();
    }

    this.pickups.length = 0;
  }

  private spawnExpGem(x: number, y: number, exp: number): void {
    this.pickups.push(new Pickup(this.scene, x, y, exp));
  }

  private enforceSoftCap(playerPosition: Position): void {
    const activePickups = this.pickups.filter((pickup) => (
      !pickup.isCollected && !pickup.isMagnetizing
    ));

    if (activePickups.length <= PickupManager.SOFT_PICKUP_CAP) {
      return;
    }

    const overflow = Math.max(
      activePickups.length - PickupManager.SOFT_PICKUP_CAP,
      activePickups.length > PickupManager.HARD_PICKUP_CAP ? 2 : 0,
    );
    const candidates = activePickups
      .map((pickup) => ({
        pickup,
        distanceSq: Phaser.Math.Distance.Squared(
          playerPosition.x,
          playerPosition.y,
          pickup.body.x,
          pickup.body.y,
        ),
      }))
      .filter(({ distanceSq }) => (
        distanceSq >= PickupManager.MERGE_MIN_DISTANCE_FROM_PLAYER
          * PickupManager.MERGE_MIN_DISTANCE_FROM_PLAYER
      ))
      .sort((a, b) => b.distanceSq - a.distanceSq);
    const mergeCount = Math.min(
      PickupManager.MAX_MERGE_BATCH_SIZE,
      Math.max(2, overflow + 1),
      candidates.length,
    );

    if (mergeCount < 2) {
      return;
    }

    const selectedPickups = new Set(
      candidates.slice(0, mergeCount).map(({ pickup }) => pickup),
    );
    let mergedExp = 0;
    let mergedX = 0;
    let mergedY = 0;

    for (const pickup of selectedPickups) {
      mergedExp += pickup.exp;
      mergedX += pickup.body.x;
      mergedY += pickup.body.y;
    }

    mergedX /= selectedPickups.size;
    mergedY /= selectedPickups.size;

    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];

      if (!selectedPickups.has(pickup)) {
        continue;
      }

      pickup.destroy();
      this.pickups.splice(index, 1);
    }

    this.pickups.push(new Pickup(this.scene, mergedX, mergedY, mergedExp));
    this.lastMergedPickupCount = selectedPickups.size;
    this.mergedPickupCount += selectedPickups.size - 1;
  }

  private isPickupInRange(
    pickup: Pickup,
    playerPosition: Position,
    pickupRange: number,
  ): boolean {
    return Phaser.Math.Distance.Between(
      playerPosition.x,
      playerPosition.y,
      pickup.body.x,
      pickup.body.y,
    ) <= pickupRange;
  }
}
