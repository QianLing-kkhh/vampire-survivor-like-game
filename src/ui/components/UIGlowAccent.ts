import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export interface UIGlowAccentConfig {
  x?: number;
  y?: number;
  width: number;
  height: number;
  color?: number;
  alpha?: number;
  radius?: number;
  padding?: number;
}

export class UIGlowAccent {
  static create(scene: Phaser.Scene, config: UIGlowAccentConfig): Phaser.GameObjects.Graphics {
    const glow = scene.add.graphics({ x: config.x ?? 0, y: config.y ?? 0 });
    const padding = config.padding ?? 10;
    const width = config.width + padding * 2;
    const height = config.height + padding * 2;

    glow.fillStyle(config.color ?? UITheme.colors.accentGold, config.alpha ?? 0.16);
    glow.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      config.radius ?? UITheme.radius.panel + 4,
    );
    return glow;
  }
}
