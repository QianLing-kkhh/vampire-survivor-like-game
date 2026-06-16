import Phaser from 'phaser';

import { UITheme } from '../UITheme';
import { truncateTextToWidth } from './UITextUtils';

export interface UIStatRowOptions {
  height?: number;
  fontSize?: string;
  backgroundAlpha?: number;
  borderAlpha?: number;
  labelRatio?: number;
  truncate?: boolean;
  maxLines?: number;
  labelColor?: string;
  valueColor?: string;
  valueFontStyle?: string;
}

export class UIStatRow {
  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    options: UIStatRowOptions = {},
  ): Phaser.GameObjects.Container {
    const height = options.height ?? 26;
    const fontSize = options.fontSize ?? UITheme.smallFontSize;
    const labelRatio = Phaser.Math.Clamp(options.labelRatio ?? 0.44, 0.25, 0.65);
    const contentPadding = 10;
    const labelWidth = Math.max(32, (width - contentPadding * 2) * labelRatio);
    const valueWidth = Math.max(32, width - contentPadding * 2 - labelWidth - 8);
    const container = scene.add.container(x, y);
    const bg = scene.add.rectangle(0, 0, width, height, UITheme.colors.panelBase, options.backgroundAlpha ?? 0.42);
    bg.setStrokeStyle(1, UITheme.colors.borderPrimary, options.borderAlpha ?? 0.22);
    const truncate = options.truncate !== false;
    const maxLines = Math.max(1, options.maxLines ?? 1);
    const labelText = scene.add.text(
      -width / 2 + contentPadding,
      0,
      truncate ? truncateTextToWidth(label, labelWidth, fontSize) : label,
      {
      color: options.labelColor ?? UITheme.mutedTextColor,
      fontFamily: UITheme.fontFamily,
      fontSize,
      wordWrap: truncate ? undefined : { width: labelWidth },
      },
    );
    labelText.setOrigin(0, 0.5);
    labelText.setFixedSize(labelWidth, height);
    labelText.setMaxLines(maxLines);
    const valueText = scene.add.text(
      width / 2 - contentPadding,
      0,
      truncate ? truncateTextToWidth(value, valueWidth, fontSize) : value,
      {
      color: options.valueColor ?? UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize,
      fontStyle: options.valueFontStyle ?? 'bold',
      align: 'right',
      wordWrap: truncate ? undefined : { width: valueWidth },
      },
    );
    valueText.setOrigin(1, 0.5);
    valueText.setFixedSize(valueWidth, height);
    valueText.setMaxLines(maxLines);
    container.add([bg, labelText, valueText]);
    return container;
  }

}
