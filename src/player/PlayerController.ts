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

export class PlayerController {
  readonly body: Phaser.GameObjects.Arc;

  private readonly keys: MovementKeys;

  constructor(
    scene: Phaser.Scene,
    private readonly stats: PlayerStats,
    x: number,
    y: number,
  ) {
    this.body = scene.add.circle(x, y, 14, 0x4ade80);

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

    if (direction.lengthSq() === 0) {
      return;
    }

    direction.normalize();

    const distance = this.stats.moveSpeed * (deltaMs / (1000 / 60));
    this.body.x += direction.x * distance;
    this.body.y += direction.y * distance;
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
}
