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
  private readonly pickups: Pickup[] = [];
  private readonly unsubscribeEnemyKilled: () => void;

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

  update(playerPosition: Position, pickupRange: number): void {
    const collectedPickups = this.findPickupsInRange(playerPosition, pickupRange);

    if (collectedPickups.length === 0) {
      return;
    }

    this.removeCollectedPickups(collectedPickups);

    for (const pickup of collectedPickups) {
      this.expManager.addExp(pickup.collect());
    }
  }

  destroy(): void {
    this.unsubscribeEnemyKilled();

    for (const pickup of this.pickups) {
      pickup.body.destroy();
    }

    this.pickups.length = 0;
  }

  private spawnExpGem(x: number, y: number, exp: number): void {
    this.pickups.push(new Pickup(this.scene, x, y, exp));
  }

  private findPickupsInRange(playerPosition: Position, pickupRange: number): Pickup[] {
    return this.pickups.filter((pickup) => (
      Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        pickup.body.x,
        pickup.body.y,
      ) <= pickupRange
    ));
  }

  private removeCollectedPickups(collectedPickups: readonly Pickup[]): void {
    const collectedSet = new Set(collectedPickups);

    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      if (!collectedSet.has(this.pickups[index])) {
        continue;
      }

      this.pickups.splice(index, 1);
    }
  }
}
