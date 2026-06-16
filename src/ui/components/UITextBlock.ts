import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export type UITextBlockTone = 'primary' | 'muted' | 'accent' | 'danger';

export interface UITextBlockConfig {
  x: number;
  y: number;
  text?: string;
  tone?: UITextBlockTone;
  fontFamily?: string;
  fontSize?: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
  lineSpacing?: number;
  depth?: number;
}

export class UITextBlock {
  readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: UITextBlockConfig) {
    this.text = scene.add.text(config.x, config.y, config.text ?? '', {
      color: UITextBlock.getToneColor(config.tone ?? 'primary'),
      fontFamily: config.fontFamily ?? UITheme.fontFamily,
      fontSize: config.fontSize ?? UITheme.bodyFontSize,
      fontStyle: config.fontStyle ?? '',
      align: config.align ?? 'center',
      lineSpacing: config.lineSpacing ?? 0,
      wordWrap: config.width ? { width: config.width } : undefined,
    });
    this.text.setOrigin(config.align === 'left' ? 0 : config.align === 'right' ? 1 : 0.5);

    if (config.depth !== undefined) {
      this.text.setDepth(config.depth);
    }
  }

  setText(value: string | string[]): this {
    this.text.setText(value);
    return this;
  }

  setPosition(x: number, y: number): this {
    this.text.setPosition(x, y);
    return this;
  }

  setFontSize(fontSize: string): this {
    this.text.setFontSize(fontSize);
    return this;
  }

  setWidth(width: number): this {
    this.text.setWordWrapWidth(width);
    this.text.setFixedSize(width, 0);
    return this;
  }

  setVisible(visible: boolean): this {
    this.text.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.text.destroy();
  }

  private static getToneColor(tone: UITextBlockTone): string {
    switch (tone) {
      case 'muted':
        return UITheme.mutedTextColor;
      case 'accent':
        return UITheme.colors.accentGoldCss;
      case 'danger':
        return UITheme.dangerTextColor;
      case 'primary':
      default:
        return UITheme.textColor;
    }
  }
}
