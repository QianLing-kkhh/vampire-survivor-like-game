import { createMoveIntent } from './PlayerIntent';
import type { PlayerIntent } from './PlayerIntent';

export class ReplayIntentProvider {
  getIntent(): PlayerIntent {
    return createMoveIntent(0, 0, 'replay');
  }
}
