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

  update(playerPosition: Position, pickupRange: number, deltaMs = 16): void {
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
