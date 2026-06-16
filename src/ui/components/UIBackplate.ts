import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export interface UIBackplateConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor?: number;
  fillAlpha?: number;
  borderColor?: number;
  borderAlpha?: number;
  borderWidth?: number;
  depth?: number;
}

export class UIBackplate {
  readonly rectangle: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, config: UIBackplateConfig) {
    this.rectangle = scene.add.rectangle(
      config.x,
      config.y,
      config.width,
      config.height,
      config.fillColor ?? UITheme.panelBgColor,
      config.fillAlpha ?? UITheme.alpha.hud,
    );
    this.rectangle.setOrigin(0, 0);
    const borderWidth = config.borderWidth ?? 1;
    if (borderWidth > 0) {
      this.rectangle.setStrokeStyle(
        borderWidth,
        config.borderColor ?? UITheme.panelBorderColor,
        config.borderAlpha ?? 0.65,
      );
    }
    this.rectangle.setScrollFactor(0);

    if (config.depth !== undefined) {
      this.rectangle.setDepth(config.depth);
    }
  }

  setPosition(x: number, y: number): void {
    this.rectangle.setPosition(x, y);
  }

  setSize(width: number, height: number): void {
    this.rectangle.setSize(width, height);
  }

  setVisible(visible: boolean): void {
    this.rectangle.setVisible(visible);
  }

  destroy(): void {
    this.rectangle.destroy();
  }
}
