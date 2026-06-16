import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export interface UIDividerOptions {
  width?: number;
  alpha?: number;
  color?: number;
}

export class UIDivider {
  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options: UIDividerOptions = {},
  ): Phaser.GameObjects.Rectangle {
    const divider = scene.add.rectangle(
      x,
      y,
      options.width ?? 1,
      1,
      options.color ?? UITheme.panelBorderColor,
      options.alpha ?? 0.45,
    );
    divider.setOrigin(0, 0.5);
    return divider;
  }
}
