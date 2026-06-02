import Phaser from 'phaser';

import { Pickup } from './Pickup';

export interface Position {
  x: number;
  y: number;
}

export class MagnetSystem {
  findPickupsInRange(
    playerPosition: Position,
    pickups: readonly Pickup[],
    pickupRange: number,
  ): Pickup[] {
    return pickups.filter((pickup) => (
      Phaser.Math.Distance.Between(
        playerPosition.x,
        playerPosition.y,
        pickup.body.x,
        pickup.body.y,
      ) <= pickupRange
    ));
  }
}
