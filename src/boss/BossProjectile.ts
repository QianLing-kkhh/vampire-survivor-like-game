import Phaser from 'phaser';

interface Position {
  x: number;
  y: number;
  radius?: number;
}

export class BossProjectile {
  readonly body: Phaser.GameObjects.Arc;

  private remainingLifetimeMs: number;
  private hasHit = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly direction: Phaser.Math.Vector2,
    private readonly speed: number,
    readonly damage: number,
    lifetimeMs: number,
    private readonly hitRadius: number,
  ) {
    this.remainingLifetimeMs = lifetimeMs;
    this.body = scene.add.circle(x, y, hitRadius, 0xdc2626, 0.9);
    this.body.setStrokeStyle(1, 0xfca5a5, 0.85);
    this.body.setDepth(35);
  }

  update(deltaMs: number): void {
    if (!this.body.active || this.hasHit) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;

    this.body.x += this.direction.x * this.speed * deltaSeconds;
    this.body.y += this.direction.y * this.speed * deltaSeconds;
    this.remainingLifetimeMs -= deltaMs;

    if (this.remainingLifetimeMs <= 0) {
      this.destroy();
    }
  }

  canHit(playerPosition: Position): boolean {
    return (
      this.body.active
      && !this.hasHit
      && Phaser.Math.Distance.Between(
        this.body.x,
        this.body.y,
        playerPosition.x,
        playerPosition.y,
      ) <= this.hitRadius + (playerPosition.radius ?? 0)
    );
  }

  consumeHit(): number {
    if (this.hasHit) {
      return 0;
    }

    this.hasHit = true;
    this.destroy();
    return this.damage;
  }

  destroy(): void {
    if (this.body.active) {
      this.body.destroy();
    }
  }
}
