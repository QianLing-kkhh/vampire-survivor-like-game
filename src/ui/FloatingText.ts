import Phaser from 'phaser';

import { Poolable } from '../performance/Poolable';
import { UITextBlock } from './components/UITextBlock';

export interface FloatingTextConfig {
  color: string;
  fontSize: string;
  lifetimeMs?: number;
  stroke?: string;
  strokeThickness?: number;
}

export class FloatingText implements Poolable {
  private static readonly DEFAULT_LIFETIME_MS = 700;
  private static readonly RISE_DISTANCE = 34;

  readonly text: Phaser.GameObjects.Text;
  private lifetimeMs = FloatingText.DEFAULT_LIFETIME_MS;
  private elapsedMs = 0;
  private startY = 0;
  private activeInPool = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    value: string,
    config: FloatingTextConfig,
  ) {
    this.text = new UITextBlock(scene, {
      x,
      y,
      text: value,
      fontSize: config.fontSize,
      fontStyle: 'bold',
    }).text;
    this.text.setColor(config.color);
    this.text.setStroke(config.stroke ?? '#111827', config.strokeThickness ?? 3);
    this.text.setDepth(1300);
    this.reset(x, y, value, config);
  }

  update(deltaMs: number): boolean {
    if (!this.activeInPool) {
      return false;
    }

    this.elapsedMs += deltaMs;
    const progress = Phaser.Math.Clamp(this.elapsedMs / this.lifetimeMs, 0, 1);

    this.text.y = this.startY - FloatingText.RISE_DISTANCE * progress;
    this.text.setAlpha(1 - progress);

    if (progress < 1) {
      return true;
    }

    return false;
  }

  resetForReuse(...args: unknown[]): void {
    const [x, y, value, config] = args;

    this.reset(
      Number(x),
      Number(y),
      String(value),
      config as FloatingTextConfig,
    );
  }

  releaseToPool(): void {
    this.activeInPool = false;
    this.text.setVisible(false);
    this.text.setActive(false);
    this.text.setAlpha(0);
  }

  isActiveInPool(): boolean {
    return this.activeInPool;
  }

  destroy(): void {
    this.text.destroy();
  }

  private reset(
    x: number,
    y: number,
    value: string,
    config: FloatingTextConfig,
  ): void {
    this.lifetimeMs = config.lifetimeMs ?? FloatingText.DEFAULT_LIFETIME_MS;
    this.elapsedMs = 0;
    this.startY = y;
    this.activeInPool = true;
    this.text.setText(value);
    this.text.setPosition(x, y);
    this.text.setStyle({
      color: config.color,
      fontSize: config.fontSize,
      fontStyle: 'bold',
      stroke: config.stroke ?? '#111827',
      strokeThickness: config.strokeThickness ?? 3,
    });
    this.text.setAlpha(1);
    this.text.setVisible(true);
    this.text.setActive(true);
    this.text.setDepth(1300);
  }
}
