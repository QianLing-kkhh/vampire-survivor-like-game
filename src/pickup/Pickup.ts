import Phaser from 'phaser';

import { VisualScale } from '../visual/VisualScale';

type PickupBody = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  destroy: () => void;
  setAlpha?: (value: number) => PickupBody;
  setDepth?: (value: number) => PickupBody;
  setRotation?: (value: number) => PickupBody;
  setScale?: (value: number) => PickupBody;
  rotation?: number;
};

export class Pickup {
  private static readonly INITIAL_MAGNET_SPEED = 260;
  private static readonly MAX_MAGNET_SPEED = 900;
  private static readonly COLLECT_DISTANCE = 18;
  private static readonly MAGNET_ACCELERATION_FACTOR = 60000;

  readonly body: PickupBody;
  isMagnetizing = false;
  isCollected = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    readonly exp: number,
  ) {
    this.body = this.createBody(scene, x, y);
  }

  startMagnet(): void {
    if (this.isCollected || this.isMagnetizing) {
      return;
    }

    this.isMagnetizing = true;
    this.body.setDepth?.(18);
  }

  updateMagnet(playerX: number, playerY: number, deltaMs: number): void {
    if (!this.isMagnetizing || this.isCollected) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.body.x, this.body.y, playerX, playerY);

    if (distance <= 0) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    const speed = Math.min(
      Pickup.MAX_MAGNET_SPEED,
      Pickup.INITIAL_MAGNET_SPEED + Pickup.MAGNET_ACCELERATION_FACTOR / Math.max(distance, 1),
    );
    const step = Math.min(distance, speed * deltaSeconds);

    this.body.x += ((playerX - this.body.x) / distance) * step;
    this.body.y += ((playerY - this.body.y) / distance) * step;

    const scale = Phaser.Math.Clamp(distance / 140, 0.6, 1);
    this.body.setScale?.(scale);
    this.body.setAlpha?.(Phaser.Math.Clamp(1.15 - distance / 500, 0.85, 1));

    if (this.body.rotation !== undefined) {
      this.body.setRotation?.(this.body.rotation + deltaSeconds * 5);
    }
  }

  canFinalizeCollect(playerX: number, playerY: number): boolean {
    return this.isMagnetizing
      && !this.isCollected
      && Phaser.Math.Distance.Between(this.body.x, this.body.y, playerX, playerY)
        <= Pickup.COLLECT_DISTANCE;
  }

  collect(): number {
    if (this.isCollected) {
      return 0;
    }

    this.isCollected = true;
    this.createCollectFlash();
    this.body.destroy();
    return this.exp;
  }

  destroy(): void {
    if (this.isCollected) {
      return;
    }

    this.isCollected = true;
    this.body.destroy();
  }

  private createCollectFlash(): void {
    const flash = this.scene.add.circle(this.body.x, this.body.y, 16, 0x7dd3fc, 0.45);
    flash.setDepth(19);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.8,
      duration: 160,
      onComplete: () => flash.destroy(),
    });
  }

  private createBody(scene: Phaser.Scene, x: number, y: number): PickupBody {
    if (scene.textures.exists('art_pickups_exp_gem')) {
      const body = scene.add.image(x, y, 'art_pickups_exp_gem');
      body.setDisplaySize(VisualScale.pickupDisplaySize, VisualScale.pickupDisplaySize);

      return body;
    }

    if (!scene.textures.exists('exp_gem')) {
      return scene.add.circle(x, y, VisualScale.pickupDisplaySize / 2, 0x38bdf8);
    }

    const body = scene.add.image(x, y, 'exp_gem');
    body.setDisplaySize(VisualScale.pickupDisplaySize, VisualScale.pickupDisplaySize);

    return body;
  }
}
