import Phaser from 'phaser';

import { AudioManager } from '../../audio/AudioManager';
import { setContainerHitArea, stopPointerEvent } from '../input/UIInteraction';
import { UITheme } from '../UITheme';
import { estimateTextWidth, truncateTextToWidth } from './UITextUtils';

export type UIButtonState = 'normal' | 'hover' | 'pressed' | 'disabled' | 'selected';
export type UIButtonSize = 'small' | 'medium' | 'large';

export interface UIButtonConfig {
  x: number;
  y: number;
  label: string;
  width?: number;
  height?: number;
  size?: UIButtonSize;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export class UIButton {
  readonly container: Phaser.GameObjects.Container;
  readonly label: Phaser.GameObjects.Text;
  private readonly background: Phaser.GameObjects.Graphics;
  private width: number;
  private height: number;
  private state: UIButtonState;
  private selected: boolean;
  private pressedInside = false;
  private baseFontSizePx: number;
  private fullLabel: string;

  constructor(private readonly scene: Phaser.Scene, config: UIButtonConfig) {
    const metrics = UITheme.sizes.button[config.size ?? 'medium'];
    this.width = config.width ?? metrics.width;
    this.height = config.height ?? metrics.height;
    this.baseFontSizePx = this.parseFontSize(metrics.fontSize);
    this.fullLabel = config.label;
    this.selected = config.selected === true;
    this.state = config.disabled ? 'disabled' : this.selected ? 'selected' : 'normal';
    this.container = scene.add.container(config.x, config.y);
    this.background = scene.add.graphics();
    this.label = scene.add.text(0, 0, '', {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: metrics.fontSize,
      fontStyle: 'bold',
      align: 'center',
      fixedWidth: this.width,
      fixedHeight: this.height,
    });
    this.label.setOrigin(0.5);
    this.applyLabelLayout();
    this.container.add([this.background, this.label]);
    setContainerHitArea(this.container, this.width, this.height);
    this.container.on('pointerover', () => this.setState(this.state === 'disabled' ? 'disabled' : 'hover'));
    this.container.on('pointerout', () => {
      this.pressedInside = false;
      this.setState(this.selected ? 'selected' : 'normal');
    });
    this.container.on('pointerdown', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      if (this.state === 'disabled') {
        this.pressedInside = false;
        this.setState('disabled');
        return;
      }

      this.pressedInside = true;
      this.setState('pressed');
    });
    this.container.on('pointerup', (
      _pointer: Phaser.Input.Pointer,
      _localX: number,
      _localY: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      stopPointerEvent(event);
      const shouldClick = this.state !== 'disabled' && this.pressedInside;
      this.pressedInside = false;

      if (!shouldClick) {
        return;
      }

      AudioManager.playUi(scene, 'ui_click');
      this.setState(this.selected ? 'selected' : 'hover');
      config.onClick?.();
    });
    this.render();
  }

  setPosition(x: number, y: number): this {
    this.container.setPosition(x, y);
    return this;
  }

  setSize(width: number, height: number): this {
    this.width = width;
    this.height = height;
    this.label.setFixedSize(width, height);
    this.applyLabelLayout();
    setContainerHitArea(this.container, width, height);
    this.render();
    return this;
  }

  setText(label: string): this {
    this.fullLabel = label;
    this.applyLabelLayout();
    return this;
  }

  setFontSize(fontSize: string): this {
    this.baseFontSizePx = this.parseFontSize(fontSize);
    this.applyLabelLayout();
    return this;
  }

  setSelected(selected: boolean): this {
    this.selected = selected;
    this.setState(selected ? 'selected' : 'normal');
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.pressedInside = false;
    this.setState(disabled ? 'disabled' : this.selected ? 'selected' : 'normal');
    return this;
  }

  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private setState(state: UIButtonState): void {
    this.state = state;
    this.render();
  }

  private render(): void {
    const fill = this.getFillColor();
    const border = this.state === 'selected' || this.state === 'hover'
      ? UITheme.colors.borderBright
      : UITheme.colors.borderPrimary;
    this.background.clear();
    this.background.fillStyle(fill, UITheme.button.filled ? (this.state === 'disabled' ? 0.42 : 0.95) : 0.08);
    this.background.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, UITheme.radius.button);
    this.background.lineStyle(this.state === 'selected' ? Math.max(2, UITheme.button.borderWidth) : UITheme.button.borderWidth, border, this.state === 'disabled' ? 0.35 : 0.9);
    this.background.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, UITheme.radius.button);
    if (UITheme.tab.underline && this.state === 'selected') {
      this.background.lineStyle(2, UITheme.colors.accentBlue, 0.95);
      this.background.lineBetween(-this.width / 2 + 10, this.height / 2 - 4, this.width / 2 - 10, this.height / 2 - 4);
    }
    this.label.setAlpha(this.state === 'disabled' ? 0.55 : 1);
  }

  private applyLabelLayout(): void {
    const availableWidth = Math.max(24, this.width - 12);
    const estimatedWidth = estimateTextWidth(this.fullLabel, this.baseFontSizePx);
    const scale = estimatedWidth > availableWidth ? availableWidth / estimatedWidth : 1;
    const effectiveFontSize = Math.max(9, Math.floor(this.baseFontSizePx * Math.min(1, scale)));

    this.label.setFontSize(`${effectiveFontSize}px`);
    this.label.setText(truncateTextToWidth(this.fullLabel, availableWidth, effectiveFontSize));
    this.label.setMaxLines(1);
    this.label.setWordWrapWidth(availableWidth, true);
    this.label.setPadding(0, Math.max(0, Math.floor((this.height - effectiveFontSize - 4) / 2)), 0, 0);
  }

  private parseFontSize(fontSize: string): number {
    const parsed = Number.parseFloat(fontSize);

    return Number.isFinite(parsed) ? parsed : 14;
  }

  private getFillColor(): number {
    switch (this.state) {
      case 'hover':
        return UITheme.buttonHoverColor;
      case 'pressed':
        return UITheme.colors.panelBase;
      case 'selected':
        return UITheme.colors.panelRaised;
      case 'disabled':
        return UITheme.colors.panelInner;
      case 'normal':
      default:
        return UITheme.buttonBgColor;
    }
  }
}
