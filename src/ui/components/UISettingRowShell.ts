import Phaser from 'phaser';

import { setContainerHitArea } from '../input/UIInteraction';
import { UITheme } from '../UITheme';
import { truncateTextToWidth } from './UITextUtils';

export type UISettingRowTone = 'normal' | 'info';

export interface UISettingRowShellConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  tone?: UISettingRowTone;
  interactive?: boolean;
}

export class UISettingRowShell {
  readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly labelText: Phaser.GameObjects.Text;
  private width: number;
  private height: number;
  private label: string;
  private tone: UISettingRowTone;
  private readonly interactive: boolean;

  constructor(private readonly scene: Phaser.Scene, config: UISettingRowShellConfig) {
    this.width = config.width;
    this.height = config.height;
    this.label = config.label;
    this.tone = config.tone ?? 'normal';
    this.interactive = config.interactive !== false;
    this.container = scene.add.container(config.x, config.y);
    this.background = scene.add.graphics();
    this.labelText = scene.add.text(0, 0, '', {
      color: this.getLabelColor(),
      fontFamily: UITheme.fontFamily,
      fontSize: UITheme.bodyFontSize,
    });
    this.labelText.setOrigin(0, 0.5);
    this.container.add([this.background, this.labelText]);

    if (this.interactive) {
      setContainerHitArea(this.container, this.width, this.height);
      if (this.container.input) {
        this.container.input.cursor = 'pointer';
      }
    }

    this.layout(this.width, this.height, {
      label: this.label,
      tone: this.tone,
      labelWidth: this.width - 24,
    });
  }

  layout(width: number, height: number, options: {
    label?: string;
    tone?: UISettingRowTone;
    fontSize?: string;
    labelWidth?: number;
  } = {}): void {
    this.width = width;
    this.height = height;
    this.label = options.label ?? this.label;
    this.tone = options.tone ?? this.tone;
    if (this.interactive) {
      setContainerHitArea(this.container, width, height);
      if (this.container.input) {
        this.container.input.cursor = 'pointer';
      }
    }
    this.renderBackground();

    const labelFontSize = options.fontSize ?? UITheme.bodyFontSize;
    const labelWidth = options.labelWidth ?? Math.max(64, width - 24);
    this.labelText.setColor(this.getLabelColor());
    this.labelText.setFontSize(labelFontSize);
    this.labelText.setText(this.tone === 'info'
      ? this.label
      : truncateTextToWidth(this.label, labelWidth, labelFontSize));
    this.labelText.setPosition(-width / 2 + 12, 0);
    this.labelText.setMaxLines(this.tone === 'info' ? 2 : 1);
    this.labelText.setWordWrapWidth(labelWidth);
  }

  on(event: string, callback: (...args: any[]) => void, context?: any): this {
    this.container.on(event, callback, context);
    return this;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private renderBackground(): void {
    const isInfo = this.tone === 'info';
    this.background.clear();
    this.background.fillStyle(
      isInfo ? UITheme.colors.panelBase : UITheme.iconBgColor,
      isInfo ? 0.36 : 0.58,
    );
    this.background.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, UITheme.radius.card);
    this.background.lineStyle(
      1,
      isInfo ? UITheme.successAccentColor : UITheme.panelBorderColor,
      isInfo ? 0.42 : 0.28,
    );
    this.background.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, UITheme.radius.card);
  }

  private getLabelColor(): string {
    return this.tone === 'info' ? UITheme.successTextColor : UITheme.textColor;
  }
}
