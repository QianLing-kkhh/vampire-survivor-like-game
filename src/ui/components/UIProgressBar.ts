import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export type UIProgressBarVariant = 'default' | 'hp' | 'exp' | 'boss' | 'loading' | 'cooldown';

export interface UIProgressBarConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  value?: number;
  color?: number;
  variant?: UIProgressBarVariant;
  label?: string;
  compact?: boolean;
}

export class UIProgressBar {
  readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly border: Phaser.GameObjects.Rectangle;
  private readonly labelText: Phaser.GameObjects.Text;
  private width: number;
  private height: number;
  private color: number;
  private ratio = 0;

  constructor(scene: Phaser.Scene, config: UIProgressBarConfig);
  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, color: number);
  constructor(
    scene: Phaser.Scene,
    configOrX: UIProgressBarConfig | number,
    y?: number,
    width?: number,
    height?: number,
    color?: number,
  ) {
    const config = typeof configOrX === 'number'
      ? {
        x: configOrX,
        y: y ?? 0,
        width: width ?? 100,
        height: height ?? 12,
        color: color ?? UITheme.colors.accentBlue,
      }
      : configOrX;

    this.width = config.width;
    this.height = config.height;
    this.color = config.color ?? UIProgressBar.getVariantColor(config.variant ?? 'default');
    this.container = scene.add.container(config.x, config.y);
    this.background = scene.add.rectangle(0, 0, this.width, this.height, UITheme.barBgColor, 0.84);
    this.background.setOrigin(0, 0);
    this.fill = scene.add.rectangle(1, 1, this.width - 2, this.height - 2, this.color, 0.95);
    this.fill.setOrigin(0, 0);
    this.border = scene.add.rectangle(0, 0, this.width, this.height, 0x000000, 0);
    this.border.setOrigin(0, 0);
    this.border.setStrokeStyle(config.compact ? 1 : 2, UITheme.colors.borderPrimary, 0.5);
    this.labelText = scene.add.text(this.width / 2, this.height / 2, config.label ?? '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: config.compact ? '10px' : '12px',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    });
    this.labelText.setOrigin(0.5);
    this.container.add([this.background, this.fill, this.border, this.labelText]);
    this.setRatio(config.value ?? 0);
  }

  setRatio(ratio: number): void {
    this.ratio = Phaser.Math.Clamp(ratio, 0, 1);
    this.fill.displayWidth = Math.max(0, (this.width - 2) * this.ratio);
  }

  setProgress(ratio: number): void {
    this.setRatio(ratio);
  }

  setLabel(label?: string): void {
    this.labelText.setText(label ?? '');
    this.labelText.setVisible(Boolean(label));
  }

  setWidth(width: number): void {
    this.resize(width, this.height);
  }

  resize(width: number, height = this.height): void {
    this.width = width;
    this.height = height;
    this.background.setSize(width, height);
    this.border.setSize(width, height);
    this.fill.setSize(Math.max(0, width - 2), Math.max(0, height - 2));
    this.setRatio(this.ratio);
    this.labelText.setPosition(width / 2, height / 2);
  }

  setFillColor(color: number): void {
    this.color = color;
    this.fill.setFillStyle(color, 0.95);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private static getVariantColor(variant: UIProgressBarVariant): number {
    switch (variant) {
      case 'hp':
        return UITheme.hpBarColor;
      case 'exp':
        return UITheme.expBarColor;
      case 'boss':
        return 0xdc2626;
      case 'loading':
        return UITheme.colors.accentBlue;
      case 'cooldown':
        return UITheme.colors.accentGold;
      case 'default':
      default:
        return UITheme.colors.accentBlue;
    }
  }
}
