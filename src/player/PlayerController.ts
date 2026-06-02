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

export class PlayerController {
  readonly body: PlayerBody;

  private readonly keys: MovementKeys;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly stats: PlayerStats,
    x: number,
    y: number,
  ) {
    this.body = this.createBody(x, y);

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
    const direction = new Phaser.Math.Vector2(
      this.getHorizontalDirection(),
      this.getVerticalDirection(),
    );
    const mouseDirection = this.getMouseDirection();

    direction.add(mouseDirection);

    if (direction.lengthSq() === 0) {
      return;
    }

    direction.normalize();

    const distance = this.stats.moveSpeed * (deltaMs / 1000);
    this.body.x += direction.x * distance;
    this.body.y += direction.y * distance;
    this.clampToWorldBounds();
  }

  private clampToWorldBounds(): void {
    const bounds = this.scene.physics.world.bounds;
    const radius = this.body.radius;

    this.body.x = Phaser.Math.Clamp(
      this.body.x,
      bounds.x + radius,
      bounds.right - radius,
    );
    this.body.y = Phaser.Math.Clamp(
      this.body.y,
      bounds.y + radius,
      bounds.bottom - radius,
    );
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
    if (!this.scene.textures.exists('player')) {
      return this.scene.add.circle(x, y, 14, 0x4ade80);
    }

    const body = this.scene.add.image(x, y, 'player');
    body.setDisplaySize(28, 28);

    return Object.assign(body, { radius: 14 });
  }
}
