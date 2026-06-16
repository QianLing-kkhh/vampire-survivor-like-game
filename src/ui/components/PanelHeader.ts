import Phaser from 'phaser';

import { UITheme } from '../UITheme';
import { truncateTextToWidth } from './UITextUtils';

export interface PanelHeaderConfig {
  x: number;
  y: number;
  width: number;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  titleColor?: string;
  titleFontSize?: string;
  subtitleFontSize?: string;
}

export class PanelHeader {
  static create(scene: Phaser.Scene, config: PanelHeaderConfig): Phaser.GameObjects.Container {
    const container = scene.add.container(config.x, config.y);
    const align = config.align ?? 'center';
    const titleX = align === 'left' ? -config.width / 2 + 24 : 0;
    const originX = align === 'left' ? 0 : 0.5;
    const titleFontSize = config.titleFontSize ?? UITheme.headerFontSize;
    const titleWidth = Math.max(48, config.width - 48);
    const title = scene.add.text(titleX, -9, truncateTextToWidth(config.title, titleWidth, titleFontSize), {
      color: config.titleColor ?? UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: titleFontSize,
      fontStyle: 'bold',
      align,
    });
    title.setOrigin(originX, 0.5);
    title.setMaxLines(1);

    const rule = scene.add.rectangle(0, 22, config.width - 36, 1, UITheme.colors.borderBright, 0.52);
    container.add([title, rule]);

    if (config.subtitle) {
      const subtitleFontSize = config.subtitleFontSize ?? UITheme.smallFontSize;
      const subtitle = scene.add.text(titleX, 16, truncateTextToWidth(config.subtitle, titleWidth, subtitleFontSize), {
        color: UITheme.mutedTextColor,
        fontFamily: UITheme.fontFamily,
        fontSize: subtitleFontSize,
        align,
      });
      subtitle.setOrigin(originX, 0.5);
      subtitle.setMaxLines(1);
      container.add(subtitle);
    }

    return container;
  }
}
