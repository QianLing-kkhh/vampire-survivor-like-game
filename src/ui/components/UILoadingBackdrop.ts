import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export class UILoadingBackdrop {
  readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0);
  }

  render(width: number, height: number): void {
    this.graphics.clear();
    this.graphics.fillStyle(UITheme.colors.backgroundOverlay, 1);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(UITheme.colors.panelBase, 0.88);
    this.graphics.fillRect(0, 0, width, height);
    this.graphics.fillStyle(UITheme.colors.panelInner, 0.28);
    this.graphics.fillRect(0, 0, width, Math.max(64, height * 0.16));
    this.graphics.fillStyle(UITheme.colors.panelRaised, 0.16);
    this.graphics.fillRect(0, height - Math.max(72, height * 0.18), width, Math.max(72, height * 0.18));
    this.graphics.lineStyle(1, UITheme.colors.borderPrimary, 0.12);

    const spacing = width <= 520 ? 34 : 48;
    for (let x = -height; x < width; x += spacing) {
      this.graphics.lineBetween(x, height, x + height, 0);
    }

    this.graphics.lineStyle(2, UITheme.colors.accentGold, 0.18);
    this.graphics.lineBetween(width * 0.08, Math.max(42, height * 0.12), width * 0.92, Math.max(42, height * 0.12));
    this.graphics.lineStyle(1, UITheme.colors.accentBlue, 0.16);
    this.graphics.lineBetween(width * 0.16, height - Math.max(54, height * 0.12), width * 0.84, height - Math.max(54, height * 0.12));
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
