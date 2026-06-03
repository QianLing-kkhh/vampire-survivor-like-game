import Phaser from 'phaser';

export interface FloatingTextConfig {
  color: string;
  fontSize: string;
  lifetimeMs?: number;
}

export class FloatingText {
  private static readonly DEFAULT_LIFETIME_MS = 700;
  private static readonly RISE_DISTANCE = 34;

  readonly text: Phaser.GameObjects.Text;
  private readonly lifetimeMs: number;
  private elapsedMs = 0;
  private readonly startY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    value: string,
    config: FloatingTextConfig,
  ) {
    this.lifetimeMs = config.lifetimeMs ?? FloatingText.DEFAULT_LIFETIME_MS;
    this.startY = y;
    this.text = scene.add.text(x, y, value, {
      color: config.color,
      fontSize: config.fontSize,
      fontStyle: 'bold',
      stroke: '#111827',
      strokeThickness: 3,
    });
    this.text.setOrigin(0.5);
    this.text.setDepth(1300);
  }

  update(deltaMs: number): boolean {
    this.elapsedMs += deltaMs;
    const progress = Phaser.Math.Clamp(this.elapsedMs / this.lifetimeMs, 0, 1);

    this.text.y = this.startY - FloatingText.RISE_DISTANCE * progress;
    this.text.setAlpha(1 - progress);

    if (progress < 1) {
      return true;
    }

    this.destroy();
    return false;
  }

  destroy(): void {
    if (this.text.active) {
      this.text.destroy();
    }
  }
}
