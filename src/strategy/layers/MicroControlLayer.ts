import { createMoveIntent } from '../../input/PlayerIntent';
import type { PlayerIntent } from '../../input/PlayerIntent';

export class MicroControlLayer {
  toAutoStrategyIntent(direction: { x: number; y: number }): PlayerIntent {
    return createMoveIntent(direction.x, direction.y, 'autoStrategy');
  }
}
