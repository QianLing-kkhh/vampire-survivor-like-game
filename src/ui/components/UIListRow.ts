import Phaser from 'phaser';

import { UITheme } from '../UITheme';
import { UICard } from './UICard';
import { truncateTextToWidth } from './UITextUtils';

export type UIListRowTone = 'normal' | 'success' | 'warning' | 'muted' | 'danger' | 'section';

export interface UIListRowConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  value?: string;
  status?: string;
  tone?: UIListRowTone;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export class UIListRow {
  static create(scene: Phaser.Scene, config: UIListRowConfig): Phaser.GameObjects.Container {
    const row = new UICard(scene, {
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      selected: config.selected,
      disabled: config.disabled,
      interactive: config.onClick !== undefined,
      onClick: config.onClick,
    });
    const compact = config.compact === true;
    const tone = config.tone ?? 'normal';

    if (tone === 'section') {
      row.container.add(UIListRow.createText(scene, {
        text: config.label,
        x: -config.width / 2 + (compact ? 8 : 10),
        y: 0,
        width: config.width - (compact ? 16 : 20),
        height: config.height,
        color: UITheme.colors.accentGoldCss,
        fontStyle: 'bold',
        compact,
      }));
      return row.container;
    }

    const inset = compact ? 8 : 10;
    const statusWidth = config.status ? (compact ? 58 : 76) : 0;
    const valueWidth = config.value ? Math.min(compact ? 96 : 136, config.width * 0.36) : 0;
    const labelWidth = Math.max(48, config.width - inset * 2 - statusWidth - valueWidth - 12);
    const toneColor = UIListRow.getToneColor(tone);

    if (config.status) {
      row.container.add(UIListRow.createText(scene, {
        text: config.status,
        x: -config.width / 2 + inset,
        y: 0,
        width: statusWidth,
        height: config.height,
        color: toneColor,
        fontStyle: 'bold',
        compact,
      }));
    }

    row.container.add(UIListRow.createText(scene, {
      text: config.label || ' ',
      x: -config.width / 2 + inset + statusWidth + (statusWidth > 0 ? 6 : 0),
      y: 0,
      width: labelWidth,
      height: config.height,
      color: tone === 'muted' ? UITheme.mutedTextColor : UITheme.textColor,
      fontStyle: config.selected ? 'bold' : 'normal',
      compact,
    }));

    if (config.value) {
      row.container.add(UIListRow.createText(scene, {
        text: config.value,
        x: config.width / 2 - inset - valueWidth,
        y: 0,
        width: valueWidth,
        height: config.height,
        color: UITheme.mutedTextColor,
        fontStyle: 'normal',
        compact,
        align: 'right',
        originX: 1,
      }));
    }

    return row.container;
  }

  private static createText(scene: Phaser.Scene, config: {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    fontStyle: string;
    compact: boolean;
    align?: 'left' | 'right';
    originX?: number;
  }): Phaser.GameObjects.Text {
    const text = scene.add.text(config.x, config.y, config.text, {
      color: config.color,
      fontFamily: UITheme.fontFamily,
      fontSize: config.compact ? UITheme.smallFontSize : UITheme.bodyFontSize,
      fontStyle: config.fontStyle,
      align: config.align ?? 'left',
    });
    text.setOrigin(config.originX ?? 0, 0.5);
    text.setFixedSize(config.width, config.height);
    text.setMaxLines(1);
    text.setText(truncateTextToWidth(
      config.text,
      config.width,
      config.compact ? UITheme.smallFontSize : UITheme.bodyFontSize,
    ));
    return text;
  }

  private static getToneColor(tone: UIListRowTone): string {
    switch (tone) {
      case 'success':
        return UITheme.successTextColor;
      case 'warning':
        return UITheme.colors.warning;
      case 'danger':
        return UITheme.dangerTextColor;
      case 'muted':
        return UITheme.mutedTextColor;
      case 'section':
        return UITheme.colors.accentGoldCss;
      case 'normal':
      default:
        return UITheme.textColor;
    }
  }
}
