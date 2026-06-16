import { Vector2, type Vector2Like } from '../core/domain/Vector2';

import type { PlayerFacingDirection8, PlayerMovementStats } from './PlayerTypes';

export interface PlayerModelConfig extends PlayerMovementStats {
  x: number;
  y: number;
  collisionRadius: number;
  facingDirection?: PlayerFacingDirection8;
  alive?: boolean;
}

export class PlayerModel {
  readonly position: Vector2;
  readonly velocity = new Vector2(0, 0);
  readonly previousPosition: Vector2;
  readonly lastFramePosition: Vector2;
  readonly aimDirection = new Vector2(1, 0);
  collisionRadius: number;
  moveSpeed: number;
  acceleration: number;
  deceleration: number;
  facingDirection: PlayerFacingDirection8;
  alive: boolean;
  temporaryMoveSpeedMultiplier = 1;
  mapMoveSpeedMultiplier = 1;
  temporaryMoveSpeedRemainingMs = 0;

  constructor(config: PlayerModelConfig) {
    this.position = new Vector2(config.x, config.y);
    this.previousPosition = this.position.clone();
    this.lastFramePosition = this.position.clone();
    this.collisionRadius = config.collisionRadius;
    this.moveSpeed = config.moveSpeed;
    this.acceleration = config.acceleration;
    this.deceleration = config.deceleration;
    this.facingDirection = config.facingDirection ?? 'right';
    this.alive = config.alive ?? true;
  }

  syncMovementStats(stats: PlayerMovementStats): void {
    this.moveSpeed = stats.moveSpeed;
    this.acceleration = stats.acceleration;
    this.deceleration = stats.deceleration;
  }

  getEffectiveMoveSpeed(): number {
    return this.moveSpeed
      * this.temporaryMoveSpeedMultiplier
      * this.mapMoveSpeedMultiplier;
  }

  syncPosition(position: Vector2Like): void {
    this.position.copy(position);
  }

  stopMovement(): void {
    this.velocity.set(0, 0);
  }
}
