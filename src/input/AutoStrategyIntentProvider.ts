import type { AutoPlayerContext } from '../auto/AutoPlayer';
import type { AutoPlayer } from '../auto/AutoPlayer';
import type { PlayerIntent } from './PlayerIntent';

export class AutoStrategyIntentProvider {
  constructor(private readonly autoPlayer: AutoPlayer) {}

  getIntent(context: AutoPlayerContext): PlayerIntent {
    return this.autoPlayer.getMoveIntent(context);
  }
}
