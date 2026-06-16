import type { PlayerQuery } from '../player/PlayerQuery';

export interface TreasureUpdateContext {
  player: PlayerQuery;
  pickupRange: number;
  deltaMs: number;
}
