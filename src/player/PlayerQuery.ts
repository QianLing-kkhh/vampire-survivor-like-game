import type { Vector2Like } from '../core/domain/Vector2';

import type { PlayerState } from './PlayerState';

export interface PlayerQuery {
  getPositionLike(): Vector2Like;
  getVelocityLike(): Vector2Like;
  getAimDirectionLike(): Vector2Like;
  getFacingDirectionLike(): Vector2Like;
  getCollisionRadius(): number;
  isAlive(): boolean;
  getPlayerState(): PlayerState | undefined;
}
