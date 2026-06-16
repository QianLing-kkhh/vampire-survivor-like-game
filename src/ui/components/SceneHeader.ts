import Phaser from 'phaser';

import { PanelHeader } from './PanelHeader';
import { UITheme } from '../UITheme';

export interface SceneHeaderConfig {
  title: string;
  subtitle?: string;
  depth?: number;
}

export class SceneHeader {
  readonly container: Phaser.GameObjects.Container;
  private header?: Phaser.GameObjects.Container;
  private title: string;
  private subtitle?: string;

  constructor(
    private readonly scene: Phaser.Scene,
    config: SceneHeaderConfig,
  ) {
    this.title = config.title;
    this.subtitle = config.subtitle;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(config.depth ?? 30);
  }

  setText(title: string, subtitle?: string): void {
    this.title = title;
    this.subtitle = subtitle;
  }

  setLayout(
    x: number,
    y: number,
    width: number,
    options: {
      titleFontSize?: string;
      subtitleFontSize?: string;
      align?: 'left' | 'center';
    } = {},
  ): void {
    this.header?.destroy(true);
    this.header = PanelHeader.create(this.scene, {
      x,
      y,
      width,
      title: this.title,
      subtitle: this.subtitle,
      align: options.align ?? 'center',
      titleFontSize: options.titleFontSize ?? UITheme.titleFontSize,
      subtitleFontSize: options.subtitleFontSize,
    });
    this.container.add(this.header);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
