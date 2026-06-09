import Phaser from 'phaser';

import { createMoveIntent } from './PlayerIntent';
import type { PlayerIntent } from './PlayerIntent';

export class ManualIntentProvider {
  static fromDirection(direction: Phaser.Math.Vector2): PlayerIntent {
    return createMoveIntent(direction.x, direction.y, 'manual');
  }
}
