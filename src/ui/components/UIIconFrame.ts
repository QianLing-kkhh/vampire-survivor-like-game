import Phaser from 'phaser';

import { IconTooltipData } from '../tooltip/IconTooltipTypes';
import { attachIconTooltip } from '../tooltip/UITooltipManager';
import { UITheme } from '../UITheme';

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
}

export class UIIconFrame {
  static create(scene: Phaser.Scene, config: UIIconFrameConfig): Phaser.GameObjects.Container {
    const container = scene.add.container(config.x, config.y);
    container.setSize(config.size, config.size);
    const bg = scene.add.graphics();
    const size = config.size;
    bg.fillStyle(UITheme.colors.panelBase, 0.96);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, UITheme.radius.icon);
    bg.lineStyle(UITheme.current().id === 'arcaneSlate' ? 2 : 1, UITheme.colors.borderPrimary, 0.82);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, UITheme.radius.icon);
    container.add(bg);

    if (config.textureKey && scene.textures.exists(config.textureKey)) {
      const icon = scene.add.image(0, 0, config.textureKey);
      icon.setDisplaySize(size * 0.74, size * 0.74);
      container.add(icon);
    } else {
      const fallback = scene.add.text(0, 0, config.fallback ?? '?', {
        color: UITheme.textColor,
        fontFamily: UITheme.fontFamily,
        fontSize: `${Math.max(10, Math.floor(size * 0.28))}px`,
        fontStyle: 'bold',
        align: 'center',
      });
      fallback.setOrigin(0.5);
      container.add(fallback);
    }

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
      container.setInteractive(
        new Phaser.Geom.Rectangle(-config.size / 2, -config.size / 2, config.size, config.size),
        Phaser.Geom.Rectangle.Contains,
      );
      attachIconTooltip(scene, container, config.tooltip, {
        lockOnClick: config.tooltipLockOnClick,
      });
    }

    return container;
  }
}
