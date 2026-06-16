import Phaser from 'phaser';

import { IconTooltipData } from '../tooltip/IconTooltipTypes';
import { UITheme } from '../UITheme';
import { UIIconSlot } from './UIIconSlot';

export interface UIIconFrameConfig {
  x: number;
  y: number;
  size: number;
  textureKey?: string | null;
  fallback?: string;
  levelText?: string;
  tooltip?: IconTooltipData;
  tooltipLockOnClick?: boolean;
  tooltipEnabled?: boolean;
  fillAlpha?: number;
  borderColor?: number;
  borderAlpha?: number;
}

export class UIIconFrame {
  static create(scene: Phaser.Scene, config: UIIconFrameConfig): Phaser.GameObjects.Container {
    const slot = new UIIconSlot(scene, {
      x: config.x,
      y: config.y,
      size: config.size,
      textureKey: config.textureKey,
      fallback: config.fallback,
      fillAlpha: config.fillAlpha ?? 0.96,
      borderColor: config.borderColor ?? UITheme.colors.borderPrimary,
      borderAlpha: config.borderAlpha ?? 0.82,
    });
    const container = slot.container;
    const size = config.size;

    if (config.levelText) {
      const badge = scene.add.text(size / 2 - 2, size / 2 - 2, config.levelText, {
        backgroundColor: '#0b1220',
        color: UITheme.colors.accentGoldCss,
        fontFamily: UITheme.fontFamily,
        fontSize: '10px',
        fontStyle: 'bold',
        padding: { x: 4, y: 2 },
      });
      badge.setOrigin(1, 1);
      container.add(badge);
    }

    if (config.tooltip && config.tooltipEnabled !== false) {
      slot.setTooltip(config.tooltip, {
        lockOnClick: config.tooltipLockOnClick,
      });
    }

    return container;
  }
}
