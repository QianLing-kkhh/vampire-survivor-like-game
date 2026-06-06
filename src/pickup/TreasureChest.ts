import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { ShadowFactory } from '../visual/ShadowFactory';
import { VisualScale } from '../visual/VisualScale';

export class TreasureChest {
  private static readonly INITIAL_MAGNET_SPEED = 66;
  private static readonly MAX_MAGNET_SPEED = 210;
  private static readonly COLLECT_DISTANCE = 26;
  private static readonly MAGNET_ACCELERATION_FACTOR = 12600;

  readonly body: Phaser.GameObjects.GameObject & {
    x: number;
    y: number;
    destroy: () => void;
    getData: (key: string) => unknown;
    setData: (key: string, value: unknown) => void;
    setAlpha?: (value: number) => void;
    setDepth: (value: number) => void;
    setScale?: (value: number) => void;
  };
  isMagnetizing = false;
  isOpened = false;
  private shadow?: Phaser.GameObjects.Ellipse;

  constructor(private readonly scene: Phaser.Scene, x: number, y: number) {
    this.body = this.createBody(scene, x, y);
    this.body.setDepth(12);
    this.shadow = ShadowFactory.createShadow(scene, this.body, 'treasure');

    if (!AssetKeyResolver.getPickupTextureKey(scene, 'treasure_chest')) {
      const displayWidth = VisualScale.getTreasureDisplayWidth();
      const displayHeight = VisualScale.getTreasureDisplayHeight();
      const lid = scene.add.rectangle(
        x,
        y - displayHeight * 0.28,
        displayWidth,
        displayHeight * 0.24,
        0xb45309,
        0.95,
      );
      lid.setStrokeStyle(1, 0xfef3c7, 0.8);
      lid.setDepth(13);
      this.body.setData('lid', lid);
    }
  }

  open(): void {
    if (this.isOpened) {
      return;
    }

    this.isOpened = true;
    this.playOpenAnimation();
  }

  startMagnet(): void {
    if (this.isOpened || this.isMagnetizing) {
      return;
    }

    this.isMagnetizing = true;
    this.body.setDepth(18);
    this.getLid()?.setDepth(19);
  }

  updateMagnet(playerX: number, playerY: number, deltaMs: number): void {
    if (!this.isMagnetizing || this.isOpened) {
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.body.x, this.body.y, playerX, playerY);

    if (distance <= 0) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    const speed = Math.min(
      TreasureChest.MAX_MAGNET_SPEED,
      TreasureChest.INITIAL_MAGNET_SPEED
        + TreasureChest.MAGNET_ACCELERATION_FACTOR / Math.max(distance, 1),
    );
    const step = Math.min(distance, speed * deltaSeconds);
    const previousX = this.body.x;
    const previousY = this.body.y;

    this.body.x += ((playerX - this.body.x) / distance) * step;
    this.body.y += ((playerY - this.body.y) / distance) * step;
    this.updateShadow();

    const lid = this.getLid();
    if (lid) {
      lid.x += this.body.x - previousX;
      lid.y += this.body.y - previousY;
    }

    const scale = Phaser.Math.Clamp(distance / 180, 0.72, 1);
    this.body.setScale?.(scale);
    lid?.setScale(scale);
  }

  canFinalizeOpen(playerX: number, playerY: number): boolean {
    return this.isMagnetizing
      && !this.isOpened
      && Phaser.Math.Distance.Between(this.body.x, this.body.y, playerX, playerY)
        <= TreasureChest.COLLECT_DISTANCE;
  }

  destroy(): void {
    this.getLid()?.destroy();
    ShadowFactory.destroyShadow(this.shadow);
    this.shadow = undefined;
    this.body.destroy();
  }

  private playOpenAnimation(): void {
    const lid = this.getLid();
    const flash = this.scene.add.circle(this.body.x, this.body.y, 34, 0xfacc15, 0.35);
    flash.setDepth(20);

    this.scene.tweens.add({
      targets: [this.body, lid].filter(Boolean),
      alpha: 0,
      scale: 1.22,
      duration: 140,
      onComplete: () => this.destroy(),
    });
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 180,
      onComplete: () => flash.destroy(),
    });
  }

  private getLid(): Phaser.GameObjects.Rectangle | undefined {
    return this.body.getData('lid') as Phaser.GameObjects.Rectangle | undefined;
  }

  private updateShadow(): void {
    this.shadow = this.shadow
      ? ShadowFactory.updateShadow(this.shadow, this.body, 'treasure')
      : ShadowFactory.createShadow(this.scene, this.body, 'treasure');
  }

  private createBody(
    scene: Phaser.Scene,
    x: number,
    y: number,
  ): TreasureChest['body'] {
    const textureKey = AssetKeyResolver.getPickupTextureKey(scene, 'treasure_chest');

    if (textureKey) {
      const body = scene.add.image(x, y, textureKey);
      body.setDisplaySize(
        VisualScale.getTreasureDisplayWidth(),
        VisualScale.getTreasureDisplayHeight(),
      );

      return body;
    }

    const body = scene.add.rectangle(
      x,
      y,
      VisualScale.getTreasureDisplayWidth(),
      VisualScale.getTreasureDisplayHeight() * 0.78,
      0xf59e0b,
      0.95,
    );
    body.setStrokeStyle(2, 0xfef3c7, 0.9);

    return body;
  }
}
