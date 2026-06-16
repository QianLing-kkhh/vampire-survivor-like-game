import type { Vector2Like } from '../core/domain/Vector2';

export type PlayerMovementSource = 'manual' | 'auto' | 'virtualJoystick' | 'external';

export type PlayerFacingDirection8 =
  | 'right'
  | 'down_right'
  | 'down'
  | 'down_left'
  | 'left'
  | 'up_left'
  | 'up'
  | 'up_right';

export interface PlayerMovementStats {
  moveSpeed: number;
  acceleration: number;
  deceleration: number;
}

export interface PlayerWorldBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlayerMovementInput {
  direction: Vector2Like;
  deltaMs: number;
  source: PlayerMovementSource;
  worldBounds: PlayerWorldBounds;
  maxMovementStep: number;
}

export interface PlayerMovementAnomaly {
  phase: 'before-move' | 'after-move';
  previousPosition: Vector2Like;
  currentPosition: Vector2Like;
  inputDirection: Vector2Like;
  source: PlayerMovementSource;
}
