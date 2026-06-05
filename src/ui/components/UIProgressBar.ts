import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export class UIProgressBar {
  readonly container: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, x: number, y: number, private width: number, private readonly height: number, color: number) {
    this.container = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, width, height, UITheme.barBgColor, 0.84);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, UITheme.colors.borderPrimary, 0.5);
    this.fill = scene.add.rectangle(1, 1, width - 2, height - 2, color, 0.95);
    this.fill.setOrigin(0, 0);
    this.container.add([bg, this.fill]);
  }

  setRatio(ratio: number): void {
    this.fill.displayWidth = Math.max(0, (this.width - 2) * Phaser.Math.Clamp(ratio, 0, 1));
  }

  setWidth(width: number): void {
    this.width = width;
  }
}
