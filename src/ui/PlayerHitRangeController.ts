import Phaser from 'phaser';

export class PlayerHitRangeController {
  private hitRange?: Phaser.GameObjects.Arc;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly radiusPx: number,
  ) {}

  create(position: { x: number; y: number }): void {
    this.destroy();

    this.hitRange = this.scene.add.circle(
      position.x,
      position.y,
      this.radiusPx,
      0xffffff,
      0.08,
    );
    this.hitRange.setStrokeStyle(1, 0xffffff, 0.45);
    this.hitRange.setDepth(20);
  }

  update(position: { x: number; y: number } | undefined): void {
    if (!position || !this.hitRange) {
      return;
    }

    this.hitRange.setPosition(position.x, position.y);
  }

  destroy(): void {
    this.hitRange?.destroy();
    this.hitRange = undefined;
  }
}
