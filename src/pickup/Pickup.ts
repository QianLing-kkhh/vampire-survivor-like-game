import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { ShadowFactory } from '../visual/ShadowFactory';
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
  private static readonly INITIAL_MAGNET_SPEED = 78;
  private static readonly MAX_MAGNET_SPEED = 270;
  private static readonly COLLECT_DISTANCE = 18;
  private static readonly MAGNET_ACCELERATION_FACTOR = 18000;
  private static readonly MIN_EXP_VISUAL_SCALE = 0.72;
  private static readonly MAX_EXP_VISUAL_SCALE = 1.85;
  private static readonly EXP_VISUAL_SCALE_STEP = 0.24;

  readonly body: PickupBody;
  isMagnetizing = false;
  isCollected = false;
  private shadow?: Phaser.GameObjects.Ellipse;
  private readonly expVisualScale: number;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    readonly exp: number,
  ) {
    this.expVisualScale = Pickup.getExpVisualScale(exp);
    this.body = this.createBody(scene, x, y);
    this.shadow = ShadowFactory.createShadow(scene, this.body, 'pickup');
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
    this.updateShadow();

    const magnetScale = Phaser.Math.Clamp(distance / 140, 0.6, 1);
    this.body.setScale?.(magnetScale);
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
    ShadowFactory.destroyShadow(this.shadow);
    this.shadow = undefined;
    this.body.destroy();
    return this.exp;
  }

  destroy(): void {
    if (this.isCollected) {
      return;
    }

    this.isCollected = true;
    ShadowFactory.destroyShadow(this.shadow);
    this.shadow = undefined;
    this.body.destroy();
  }

  private updateShadow(): void {
    this.shadow = this.shadow
      ? ShadowFactory.updateShadow(this.shadow, this.body, 'pickup')
      : ShadowFactory.createShadow(this.scene, this.body, 'pickup');
  }

  private createCollectFlash(): void {
    const flash = this.scene.add.circle(
      this.body.x,
      this.body.y,
      16 * this.expVisualScale,
      0x7dd3fc,
      0.45,
    );
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
    const textureKey = AssetKeyResolver.getPickupTextureKey(scene, 'exp_gem');
    const displaySize = VisualScale.getPickupDisplaySize() * this.expVisualScale;

    if (textureKey) {
      const body = scene.add.image(x, y, textureKey);
      body.setDisplaySize(displaySize, displaySize);

      return body;
    }

    return scene.add.circle(x, y, displaySize / 2, 0x38bdf8);
  }

  private static getExpVisualScale(exp: number): number {
    const safeExp = Math.max(1, exp);
    const scale = Pickup.MIN_EXP_VISUAL_SCALE
      + Math.log2(safeExp + 1) * Pickup.EXP_VISUAL_SCALE_STEP;

    return Phaser.Math.Clamp(
      scale,
      Pickup.MIN_EXP_VISUAL_SCALE,
      Pickup.MAX_EXP_VISUAL_SCALE,
    );
  }
}
