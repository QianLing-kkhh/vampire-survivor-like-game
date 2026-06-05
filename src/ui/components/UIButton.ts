import Phaser from 'phaser';

import { AudioManager } from '../../audio/AudioManager';
import { UITheme } from '../UITheme';

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

  constructor(private readonly scene: Phaser.Scene, config: UIButtonConfig) {
    const metrics = UITheme.sizes.button[config.size ?? 'medium'];
    this.width = config.width ?? metrics.width;
    this.height = config.height ?? metrics.height;
    this.state = config.disabled ? 'disabled' : config.selected ? 'selected' : 'normal';
    this.container = scene.add.container(config.x, config.y);
    this.background = scene.add.graphics();
    this.label = scene.add.text(0, 0, config.label, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: metrics.fontSize,
      fontStyle: 'bold',
      align: 'center',
      fixedWidth: this.width,
      fixedHeight: this.height,
    });
    this.label.setOrigin(0.5);
    this.label.setPadding(0, Math.max(0, Math.floor((this.height - 22) / 2)), 0, 0);
    this.container.add([this.background, this.label]);
    this.container.setSize(this.width, this.height);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-this.width / 2, -this.height / 2, this.width, this.height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.on('pointerover', () => this.setState(this.state === 'disabled' ? 'disabled' : 'hover'));
    this.container.on('pointerout', () => this.setState(config.selected ? 'selected' : 'normal'));
    this.container.on('pointerdown', () => this.setState(this.state === 'disabled' ? 'disabled' : 'pressed'));
    this.container.on('pointerup', () => {
      if (this.state === 'disabled') {
        return;
      }

      AudioManager.playUi(scene, 'ui_click');
      config.onClick?.();
      this.setState(config.selected ? 'selected' : 'hover');
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
    this.label.setPadding(0, Math.max(0, Math.floor((height - 22) / 2)), 0, 0);
    this.container.setSize(width, height);
    this.container.input?.hitArea.setTo(-width / 2, -height / 2, width, height);
    this.render();
    return this;
  }

  setText(label: string): this {
    this.label.setText(label);
    return this;
  }

  setFontSize(fontSize: string): this {
    this.label.setFontSize(fontSize);
    return this;
  }

  setSelected(selected: boolean): this {
    this.setState(selected ? 'selected' : 'normal');
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
