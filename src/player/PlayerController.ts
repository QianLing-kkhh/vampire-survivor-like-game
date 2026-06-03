import Phaser from 'phaser';

import { PlayerStats } from './PlayerStats';

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
};

type PlayerBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  radius: number;
};

type MovementSource = 'manual' | 'auto' | 'virtualJoystick' | 'external';

export class PlayerController {
  private static readonly MAX_MOVEMENT_STEP = 24;

  readonly body: PlayerBody;

  private readonly keys: MovementKeys;
  private readonly previousPosition: Phaser.Math.Vector2;
  private readonly lastFramePosition: Phaser.Math.Vector2;
  private readonly velocity = new Phaser.Math.Vector2(0, 0);
  private externalMoveDirection?: Phaser.Math.Vector2;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly stats: PlayerStats,
    x: number,
    y: number,
  ) {
    this.body = this.createBody(x, y);
    this.previousPosition = new Phaser.Math.Vector2(x, y);
    this.lastFramePosition = new Phaser.Math.Vector2(x, y);

    this.keys = scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys;
  }

  update(deltaMs: number): void {
    const direction = this.externalMoveDirection?.clone() ?? new Phaser.Math.Vector2(
      this.getHorizontalDirection(),
      this.getVerticalDirection(),
    );

    if (!this.externalMoveDirection) {
      direction.add(this.getMouseDirection());
    }

    this.moveWithDirection(direction, deltaMs, 'manual');
  }

  moveWithDirection(
    direction: Phaser.Math.Vector2,
    deltaMs: number,
    source: MovementSource = 'external',
  ): void {
    const deltaSeconds = Math.max(0, deltaMs / 1000);

    this.rollbackAbnormalExternalJump(deltaSeconds, direction, source);
    this.previousPosition.set(this.body.x, this.body.y);
    this.updateVelocity(direction, deltaSeconds);
    this.moveByVelocity(deltaSeconds);
    this.rollbackAbnormalMovement(deltaSeconds, direction, source);
    this.lastFramePosition.set(this.body.x, this.body.y);
  }

  applyExternalDisplacement(displacement: Phaser.Math.Vector2): void {
    if (displacement.lengthSq() === 0) {
      return;
    }

    this.previousPosition.set(this.body.x, this.body.y);
    this.body.x += displacement.x;
    this.body.y += displacement.y;
    this.clampToWorldBounds();
    this.lastFramePosition.set(this.body.x, this.body.y);
  }

  setExternalMoveDirection(direction?: Phaser.Math.Vector2): void {
    this.externalMoveDirection = direction?.clone();
  }

  clearExternalMoveDirection(): void {
    this.externalMoveDirection = undefined;
  }

  getPreviousPosition(): Phaser.Math.Vector2 {
    return this.previousPosition.clone();
  }

  private moveBy(direction: Phaser.Math.Vector2, distance: number): void {
    const steps = Math.max(1, Math.ceil(distance / PlayerController.MAX_MOVEMENT_STEP));
    const stepDistance = distance / steps;

    for (let step = 0; step < steps; step += 1) {
      this.body.x += direction.x * stepDistance;
      this.body.y += direction.y * stepDistance;
      this.clampToWorldBounds();
    }
  }

  private updateVelocity(direction: Phaser.Math.Vector2, deltaSeconds: number): void {
    const hasInput = direction.lengthSq() > 0;
    const desiredVelocity = hasInput
      ? direction.clone().normalize().scale(this.stats.moveSpeed)
      : new Phaser.Math.Vector2(0, 0);
    const maxVelocityDelta = (hasInput ? this.stats.acceleration : this.stats.deceleration)
      * deltaSeconds;

    this.moveVelocityToward(desiredVelocity, maxVelocityDelta);

    if (this.velocity.length() > this.stats.moveSpeed) {
      this.velocity.normalize().scale(this.stats.moveSpeed);
    }
  }

  private moveVelocityToward(targetVelocity: Phaser.Math.Vector2, maxDelta: number): void {
    const deltaVelocity = targetVelocity.clone().subtract(this.velocity);

    if (deltaVelocity.lengthSq() === 0) {
      return;
    }

    if (deltaVelocity.length() <= maxDelta) {
      this.velocity.copy(targetVelocity);
      return;
    }

    this.velocity.add(deltaVelocity.normalize().scale(maxDelta));
  }

  private moveByVelocity(deltaSeconds: number): void {
    const distance = this.velocity.length() * deltaSeconds;

    if (distance <= 0) {
      return;
    }

    this.moveBy(this.velocity.clone().normalize(), distance);
  }

  private rollbackAbnormalExternalJump(
    deltaSeconds: number,
    inputDirection: Phaser.Math.Vector2,
    source: MovementSource,
  ): void {
    const currentPosition = new Phaser.Math.Vector2(this.body.x, this.body.y);
    const distance = currentPosition.distance(this.lastFramePosition);

    if (distance <= this.getMaxExpectedMove(deltaSeconds)) {
      return;
    }

    this.warnAbnormalJump('before-move', this.lastFramePosition, currentPosition, inputDirection, source);
    this.body.x = this.lastFramePosition.x;
    this.body.y = this.lastFramePosition.y;
    this.velocity.set(0, 0);
  }

  private rollbackAbnormalMovement(
    deltaSeconds: number,
    inputDirection: Phaser.Math.Vector2,
    source: MovementSource,
  ): void {
    const currentPosition = new Phaser.Math.Vector2(this.body.x, this.body.y);
    const distance = currentPosition.distance(this.previousPosition);

    if (distance <= this.getMaxExpectedMove(deltaSeconds)) {
      return;
    }

    this.warnAbnormalJump('after-move', this.previousPosition, currentPosition, inputDirection, source);
    this.body.x = this.previousPosition.x;
    this.body.y = this.previousPosition.y;
    this.velocity.set(0, 0);
  }

  private getMaxExpectedMove(deltaSeconds: number): number {
    return Math.max(300, this.stats.moveSpeed * deltaSeconds + 50);
  }

  private warnAbnormalJump(
    phase: string,
    previousPosition: Phaser.Math.Vector2,
    currentPosition: Phaser.Math.Vector2,
    inputDirection: Phaser.Math.Vector2,
    source: MovementSource,
  ): void {
    console.warn('Abnormal player jump prevented', {
      phase,
      previous: { x: previousPosition.x, y: previousPosition.y },
      current: { x: currentPosition.x, y: currentPosition.y },
      delta: {
        x: currentPosition.x - previousPosition.x,
        y: currentPosition.y - previousPosition.y,
        distance: currentPosition.distance(previousPosition),
      },
      velocity: { x: this.velocity.x, y: this.velocity.y },
      inputDirection: { x: inputDirection.x, y: inputDirection.y },
      source,
      autoMode: source === 'auto',
    });
  }

  private clampToWorldBounds(): void {
    const bounds = this.scene.physics.world.bounds;
    const radius = this.body.radius;
    const minX = bounds.x + radius;
    const maxX = bounds.right - radius;
    const minY = bounds.y + radius;
    const maxY = bounds.bottom - radius;
    const clampedX = Phaser.Math.Clamp(this.body.x, minX, maxX);
    const clampedY = Phaser.Math.Clamp(this.body.y, minY, maxY);

    if ((clampedX <= minX && this.velocity.x < 0) || (clampedX >= maxX && this.velocity.x > 0)) {
      this.velocity.x = 0;
    }

    if ((clampedY <= minY && this.velocity.y < 0) || (clampedY >= maxY && this.velocity.y > 0)) {
      this.velocity.y = 0;
    }

    this.body.x = clampedX;
    this.body.y = clampedY;
  }

  private getHorizontalDirection(): number {
    const movingLeft = this.keys.left.isDown || this.keys.a.isDown;
    const movingRight = this.keys.right.isDown || this.keys.d.isDown;

    return Number(movingRight) - Number(movingLeft);
  }

  private getVerticalDirection(): number {
    const movingUp = this.keys.up.isDown || this.keys.w.isDown;
    const movingDown = this.keys.down.isDown || this.keys.s.isDown;

    return Number(movingDown) - Number(movingUp);
  }

  private getMouseDirection(): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;

    if (!pointer.isDown || !pointer.leftButtonDown()) {
      return new Phaser.Math.Vector2(0, 0);
    }

    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const direction = new Phaser.Math.Vector2(
      worldPoint.x - this.body.x,
      worldPoint.y - this.body.y,
    );

    if (direction.lengthSq() < 1) {
      return new Phaser.Math.Vector2(0, 0);
    }

    return direction.normalize();
  }

  private createBody(x: number, y: number): PlayerBody {
    if (this.scene.textures.exists('art_player_player_walk_sheet')) {
      const body = this.scene.add.sprite(x, y, 'art_player_player_walk_sheet');
      body.setDisplaySize(28, 28);
      body.play('art_player_walk');

      return Object.assign(body, { radius: 14 });
    }

    if (!this.scene.textures.exists('player')) {
      return this.scene.add.circle(x, y, 14, 0x4ade80);
    }

    const body = this.scene.add.image(x, y, 'player');
    body.setDisplaySize(28, 28);

    return Object.assign(body, { radius: 14 });
  }
}
