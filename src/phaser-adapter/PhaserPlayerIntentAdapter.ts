import Phaser from 'phaser';

import type { PlayerIntent } from '../input/PlayerIntent';

export class PhaserPlayerIntentAdapter {
  static toVector(intent: PlayerIntent): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(intent.moveX, intent.moveY);
  }
}
