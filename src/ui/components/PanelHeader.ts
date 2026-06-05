import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export interface PanelHeaderConfig {
  x: number;
  y: number;
  width: number;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
}

export class PanelHeader {
  static create(scene: Phaser.Scene, config: PanelHeaderConfig): Phaser.GameObjects.Container {
    const container = scene.add.container(config.x, config.y);
    const align = config.align ?? 'center';
    const titleX = align === 'left' ? -config.width / 2 + 24 : 0;
    const originX = align === 'left' ? 0 : 0.5;
    const title = scene.add.text(titleX, -9, config.title, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.headerFontSize,
      fontStyle: 'bold',
      align,
    });
    title.setOrigin(originX, 0.5);

    const rule = scene.add.rectangle(0, 22, config.width - 36, 1, UITheme.colors.borderBright, 0.52);
    container.add([title, rule]);

    if (config.subtitle) {
      const subtitle = scene.add.text(titleX, 16, config.subtitle, {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: UITheme.smallFontSize,
        align,
      });
      subtitle.setOrigin(originX, 0.5);
      container.add(subtitle);
    }

    return container;
  }
}
