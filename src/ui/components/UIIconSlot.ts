import Phaser from 'phaser';

import { IconTooltipData } from '../tooltip/IconTooltipTypes';
import { attachIconTooltip, IconTooltipAttachOptions } from '../tooltip/UITooltipManager';
import { UITheme } from '../UITheme';

export interface UIIconSlotConfig {
  x: number;
  y: number;
  size: number;
  textureKey?: string | null;
  fallback?: string;
  fillAlpha?: number;
  borderColor?: number;
  borderAlpha?: number;
}

export class UIIconSlot {
  readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Graphics;
  private icon?: Phaser.GameObjects.Image;
  private fallbackText?: Phaser.GameObjects.Text;
  private size: number;
  private fillAlpha: number;
  private borderColor: number;
  private borderAlpha: number;
  private visualKey = '';

  constructor(private readonly scene: Phaser.Scene, config: UIIconSlotConfig) {
    this.size = config.size;
    this.fillAlpha = config.fillAlpha ?? 0.86;
    this.borderColor = config.borderColor ?? UITheme.panelBorderColor;
    this.borderAlpha = config.borderAlpha ?? 0.72;
    this.container = scene.add.container(config.x, config.y);
    this.container.setSize(config.size, config.size);
    this.background = scene.add.graphics();
    this.container.add(this.background);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-config.size / 2, -config.size / 2, config.size, config.size),
      Phaser.Geom.Rectangle.Contains,
    );
    this.renderBackground();
    this.setVisual(config.textureKey, config.fallback);
  }

  setSize(size: number): void {
    this.size = size;
    this.container.setSize(size, size);
    this.container.input?.hitArea?.setTo?.(-size / 2, -size / 2, size, size);
    this.renderBackground();
    this.layoutVisual();
  }

  setVisual(textureKey?: string | null, fallback = '?'): void {
    const resolvedTextureKey = textureKey && this.scene.textures.exists(textureKey) ? textureKey : undefined;
    const visualKey = resolvedTextureKey ? `texture:${resolvedTextureKey}` : `fallback:${fallback}`;

    if (visualKey === this.visualKey) {
      return;
    }

    this.icon?.destroy();
    this.fallbackText?.destroy();
    this.icon = undefined;
    this.fallbackText = undefined;
    this.visualKey = visualKey;

    if (resolvedTextureKey) {
      this.icon = this.scene.add.image(0, 0, resolvedTextureKey);
      this.container.add(this.icon);
      this.layoutVisual();
      return;
    }

    this.fallbackText = this.scene.add.text(0, 0, fallback, {
      color: UITheme.textColor,
      fontFamily: UITheme.fontFamily,
      fontSize: `${Math.max(10, Math.floor(this.size * 0.32))}px`,
      fontStyle: 'bold',
      align: 'center',
    });
    this.fallbackText.setOrigin(0.5);
    this.container.add(this.fallbackText);
  }

  setTooltip(
    data: IconTooltipData | (() => IconTooltipData | undefined) | undefined,
    options?: IconTooltipAttachOptions,
  ): void {
    attachIconTooltip(this.scene, this.container, data, options);
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private renderBackground(): void {
    const style = UITheme.current();
    const fillAlpha = Math.max(
      this.fillAlpha,
      style.id === 'minimal' ? 0.34 : style.id === 'classic' ? 0.46 : 0.58,
    );
    const borderWidth = style.id === 'arcaneSlate' ? 2 : 1;

    this.background.clear();
    this.background.fillStyle(UITheme.iconBgColor, fillAlpha);
    this.background.fillRoundedRect(-this.size / 2, -this.size / 2, this.size, this.size, UITheme.radius.icon);
    this.background.lineStyle(borderWidth, this.borderColor, Math.max(this.borderAlpha, 0.68));
    this.background.strokeRoundedRect(-this.size / 2, -this.size / 2, this.size, this.size, UITheme.radius.icon);
  }

  private layoutVisual(): void {
    this.icon?.setDisplaySize(Math.max(10, this.size - 8), Math.max(10, this.size - 8));
    this.fallbackText?.setFontSize(`${Math.max(10, Math.floor(this.size * 0.32))}px`);
  }
}
