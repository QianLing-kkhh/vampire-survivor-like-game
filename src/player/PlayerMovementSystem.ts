import { Math2D } from '../core/domain/Math2D';
import { Vector2, type Vector2Like } from '../core/domain/Vector2';

import { PlayerModel } from './PlayerModel';
import type {
  PlayerFacingDirection8,
  PlayerMovementAnomaly,
  PlayerMovementInput,
  PlayerWorldBounds,
} from './PlayerTypes';

export class PlayerMovementSystem {
  moveWithDirection(model: PlayerModel, input: PlayerMovementInput): PlayerMovementAnomaly[] {
    const deltaSeconds = Math.max(0, input.deltaMs / 1000);
    const direction = Vector2.from(input.direction);
    const anomalies: PlayerMovementAnomaly[] = [];

    this.updateTemporaryMoveSpeed(model, input.deltaMs);
    this.rollbackAbnormalExternalJump(model, direction, deltaSeconds, input, anomalies);
    model.previousPosition.copy(model.position);
    this.updateFacingFromInput(model, direction);
    this.updateVelocity(model, direction, deltaSeconds);
    this.moveByVelocity(model, input.worldBounds, input.maxMovementStep, deltaSeconds);
    this.rollbackAbnormalMovement(model, direction, deltaSeconds, input, anomalies);
    model.lastFramePosition.copy(model.position);

    return anomalies;
  }

  applyExternalDisplacement(
    model: PlayerModel,
    displacement: Vector2Like,
    worldBounds: PlayerWorldBounds,
  ): void {
    const displacementVector = Vector2.from(displacement);

    if (displacementVector.lengthSq() === 0) {
      return;
    }

    model.previousPosition.copy(model.position);
    model.position.add(displacementVector);
    this.clampToWorldBounds(model, worldBounds);
    model.lastFramePosition.copy(model.position);
  }

  setPosition(
    model: PlayerModel,
    x: number,
    y: number,
    worldBounds: PlayerWorldBounds,
  ): void {
    model.previousPosition.copy(model.position);
    model.position.set(x, y);
    this.clampToWorldBounds(model, worldBounds);
    model.lastFramePosition.copy(model.position);
  }

  setTemporaryMoveSpeedMultiplier(model: PlayerModel, multiplier: number, durationMs: number): void {
    const nextDurationMs = Math.max(0, durationMs);

    if (nextDurationMs <= 0) {
      model.temporaryMoveSpeedMultiplier = 1;
      model.temporaryMoveSpeedRemainingMs = 0;
      return;
    }

    model.temporaryMoveSpeedMultiplier = Math.max(0.1, multiplier);
    model.temporaryMoveSpeedRemainingMs = nextDurationMs;
  }

  setMapMoveSpeedMultiplier(model: PlayerModel, multiplier: number): void {
    model.mapMoveSpeedMultiplier = Math.max(0.1, multiplier);
  }

  getVectorFromDirection8(direction: PlayerFacingDirection8): Vector2 {
    switch (direction) {
      case 'down_right':
        return new Vector2(1, 1).normalize();
      case 'down':
        return new Vector2(0, 1);
      case 'down_left':
        return new Vector2(-1, 1).normalize();
      case 'left':
        return new Vector2(-1, 0);
      case 'up_left':
        return new Vector2(-1, -1).normalize();
      case 'up':
        return new Vector2(0, -1);
      case 'up_right':
        return new Vector2(1, -1).normalize();
      case 'right':
      default:
        return new Vector2(1, 0);
    }
  }

  getDirection8FromVector(vx: number, vy: number): PlayerFacingDirection8 {
    const angle = Math2D.normalizeAngle(Math.atan2(vy, vx));
    const degrees = Math2D.radToDeg(angle);

    if (degrees < 22.5 || degrees >= 337.5) {
      return 'right';
    }

    if (degrees < 67.5) {
      return 'down_right';
    }

    if (degrees < 112.5) {
      return 'down';
    }

    if (degrees < 157.5) {
      return 'down_left';
    }

    if (degrees < 202.5) {
      return 'left';
    }

    if (degrees < 247.5) {
      return 'up_left';
    }

    if (degrees < 292.5) {
      return 'up';
    }

    return 'up_right';
  }

  private updateVelocity(model: PlayerModel, direction: Vector2, deltaSeconds: number): void {
    const hasInput = direction.lengthSq() > 0;
    const moveSpeed = model.getEffectiveMoveSpeed();
    const desiredVelocity = hasInput
      ? direction.clone().normalize().scale(moveSpeed)
      : new Vector2(0, 0);
    const maxVelocityDelta = (hasInput ? model.acceleration : model.deceleration)
      * deltaSeconds;

    this.moveVelocityToward(model, desiredVelocity, maxVelocityDelta);

    if (model.velocity.length() > moveSpeed) {
      model.velocity.normalize().scale(moveSpeed);
    }
  }

  private moveVelocityToward(model: PlayerModel, targetVelocity: Vector2, maxDelta: number): void {
    const deltaVelocity = targetVelocity.clone().subtract(model.velocity);

    if (deltaVelocity.lengthSq() === 0) {
      return;
    }

    if (deltaVelocity.length() <= maxDelta) {
      model.velocity.copy(targetVelocity);
      return;
    }

    model.velocity.add(deltaVelocity.normalize().scale(maxDelta));
  }

  private moveByVelocity(
    model: PlayerModel,
    worldBounds: PlayerWorldBounds,
    maxMovementStep: number,
    deltaSeconds: number,
  ): void {
    const distance = model.velocity.length() * deltaSeconds;

    if (distance <= 0) {
      return;
    }

    this.moveBy(model, model.velocity.clone().normalize(), distance, worldBounds, maxMovementStep);
  }

  private moveBy(
    model: PlayerModel,
    direction: Vector2,
    distance: number,
    worldBounds: PlayerWorldBounds,
    maxMovementStep: number,
  ): void {
    const steps = Math.max(1, Math.ceil(distance / maxMovementStep));
    const stepDistance = distance / steps;

    for (let step = 0; step < steps; step += 1) {
      model.position.x += direction.x * stepDistance;
      model.position.y += direction.y * stepDistance;
      this.clampToWorldBounds(model, worldBounds);
    }
  }

  private rollbackAbnormalExternalJump(
    model: PlayerModel,
    inputDirection: Vector2,
    deltaSeconds: number,
    input: PlayerMovementInput,
    anomalies: PlayerMovementAnomaly[],
  ): void {
    const currentPosition = model.position.clone();
    const distance = currentPosition.distance(model.lastFramePosition);

    if (distance <= this.getMaxExpectedMove(model, deltaSeconds)) {
      return;
    }

    anomalies.push({
      phase: 'before-move',
      previousPosition: model.lastFramePosition.clone(),
      currentPosition,
      inputDirection: inputDirection.clone(),
      source: input.source,
    });
    model.position.copy(model.lastFramePosition);
    model.velocity.set(0, 0);
  }

  private rollbackAbnormalMovement(
    model: PlayerModel,
    inputDirection: Vector2,
    deltaSeconds: number,
    input: PlayerMovementInput,
    anomalies: PlayerMovementAnomaly[],
  ): void {
    const currentPosition = model.position.clone();
    const distance = currentPosition.distance(model.previousPosition);

    if (distance <= this.getMaxExpectedMove(model, deltaSeconds)) {
      return;
    }

    anomalies.push({
      phase: 'after-move',
      previousPosition: model.previousPosition.clone(),
      currentPosition,
      inputDirection: inputDirection.clone(),
      source: input.source,
    });
    model.position.copy(model.previousPosition);
    model.velocity.set(0, 0);
  }

  private getMaxExpectedMove(model: PlayerModel, deltaSeconds: number): number {
    return Math.max(300, model.getEffectiveMoveSpeed() * deltaSeconds + 50);
  }

  private updateTemporaryMoveSpeed(model: PlayerModel, deltaMs: number): void {
    if (model.temporaryMoveSpeedRemainingMs <= 0) {
      return;
    }

    model.temporaryMoveSpeedRemainingMs = Math.max(
      0,
      model.temporaryMoveSpeedRemainingMs - Math.max(0, deltaMs),
    );

    if (model.temporaryMoveSpeedRemainingMs === 0) {
      model.temporaryMoveSpeedMultiplier = 1;
    }
  }

  private clampToWorldBounds(model: PlayerModel, worldBounds: PlayerWorldBounds): void {
    const radius = model.collisionRadius;
    const minX = worldBounds.x + radius;
    const maxX = worldBounds.x + worldBounds.width - radius;
    const minY = worldBounds.y + radius;
    const maxY = worldBounds.y + worldBounds.height - radius;
    const clampedX = Math2D.clamp(model.position.x, minX, maxX);
    const clampedY = Math2D.clamp(model.position.y, minY, maxY);

    if ((clampedX <= minX && model.velocity.x < 0) || (clampedX >= maxX && model.velocity.x > 0)) {
      model.velocity.x = 0;
    }

    if ((clampedY <= minY && model.velocity.y < 0) || (clampedY >= maxY && model.velocity.y > 0)) {
      model.velocity.y = 0;
    }

    model.position.set(clampedX, clampedY);
  }

  private updateFacingFromInput(model: PlayerModel, direction: Vector2): void {
    if (direction.lengthSq() === 0) {
      return;
    }

    model.aimDirection.copy(direction);
    model.facingDirection = this.getDirection8FromVector(direction.x, direction.y);
  }
}
