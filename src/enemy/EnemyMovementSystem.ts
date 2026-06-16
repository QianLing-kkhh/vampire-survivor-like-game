import type { Vector2Like } from '../core/domain/Vector2';

export interface EnemyMoveTowardInput {
  position: Vector2Like;
  target: Vector2Like;
  moveSpeed: number;
  deltaMs: number;
  speedMultiplier?: number;
}

export class EnemyMovementSystem {
  moveToward(input: EnemyMoveTowardInput): Vector2Like {
    const directionX = input.target.x - input.position.x;
    const directionY = input.target.y - input.position.y;
    const directionLengthSq = directionX * directionX + directionY * directionY;

    if (directionLengthSq === 0) {
      return input.position;
    }

    const directionLength = Math.sqrt(directionLengthSq);
    const effectiveSpeedMultiplier = Math.max(0, input.speedMultiplier ?? 1);
    const distance = input.moveSpeed * effectiveSpeedMultiplier * (input.deltaMs / 1000);

    return {
      x: input.position.x + (directionX / directionLength) * distance,
      y: input.position.y + (directionY / directionLength) * distance,
    };
  }
}
