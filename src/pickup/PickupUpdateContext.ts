import type { PlayerQuery } from '../player/PlayerQuery';

export interface PickupUpdateContext {
  player: PlayerQuery;
  pickupRange: number;
  deltaMs: number;
}
