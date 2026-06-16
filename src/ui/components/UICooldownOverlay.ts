import Phaser from 'phaser';

import { UITextBlock } from './UITextBlock';

export interface UICooldownOverlayConfig {
  x?: number;
  y?: number;
  size: number;
  fillColor?: number;
  fillAlpha?: number;
  textFontSize?: string;
}

export interface UICooldownOverlayState {
  remainingMs: number;
  totalMs: number;
  ready: boolean;
  label?: string;
}

export class UICooldownOverlay {
  readonly container: Phaser.GameObjects.Container;

  private readonly mask: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private size: number;

  constructor(scene: Phaser.Scene, config: UICooldownOverlayConfig) {
    this.size = config.size;
    this.container = scene.add.container(config.x ?? 0, config.y ?? 0);
    this.container.setScrollFactor(0);

    this.mask = scene.add.rectangle(
      0,
      0,
      this.size,
      this.size,
      config.fillColor ?? 0x020617,
      config.fillAlpha ?? 0.58,
    );
    this.label = new UITextBlock(scene, {
      x: 0,
      y: 0,
      text: '',
      fontSize: config.textFontSize ?? '16px',
      fontStyle: 'bold',
    }).text;
    this.label.setColor('#f8fafc');
    this.label.setStroke('#111827', 4);
    this.container.add([this.mask, this.label]);
    this.setVisible(false);
  }

  setSize(size: number): void {
    this.size = size;
    this.mask.setSize(size, size);
  }

  setFontSize(fontSize: string): void {
    this.label.setFontSize(fontSize);
  }

  update(state: UICooldownOverlayState | undefined, showLabel: boolean): void {
    const visible = state !== undefined
      && !state.ready
      && state.remainingMs > 0
      && state.totalMs > 0;

    this.mask.setVisible(visible);
    this.label.setVisible(visible && showLabel);

    if (!visible || !state) {
      this.label.setText('');
      return;
    }

    const ratio = Phaser.Math.Clamp(state.remainingMs / state.totalMs, 0, 1);
    const height = Math.max(1, this.size * ratio);

    this.mask.setSize(this.size, height);
    this.mask.setPosition(0, -this.size / 2 + height / 2);
    this.label.setText(showLabel ? state.label ?? '' : '');
  }

  setVisible(visible: boolean): void {
    this.mask.setVisible(visible);
    this.label.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
