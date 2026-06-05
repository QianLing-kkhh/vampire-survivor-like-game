import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export interface UICardConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export class UICard {
  readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Graphics;
  private hover = false;

  constructor(private readonly scene: Phaser.Scene, private readonly config: UICardConfig) {
    this.container = scene.add.container(config.x, config.y);
    this.background = scene.add.graphics();
    this.container.add(this.background);
    this.container.setSize(config.width, config.height);
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-config.width / 2, -config.height / 2, config.width, config.height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.container.on('pointerover', () => {
      this.hover = true;
      this.render();
    });
    this.container.on('pointerout', () => {
      this.hover = false;
      this.render();
    });
    this.container.on('pointerdown', () => {
      if (config.disabled) {
        return;
      }

      this.scene.tweens.add({
        targets: this.container,
        scaleX: 0.98,
        scaleY: 0.98,
        duration: 70,
        yoyo: true,
      });
      config.onClick?.();
    });
    this.render();
  }

  destroy(): void {
    this.container.destroy(true);
  }

  private render(): void {
    const width = this.config.width;
    const height = this.config.height;
    const selected = this.config.selected || this.hover;
    this.background.clear();
    this.background.fillStyle(UITheme.colors.panelRaised, this.config.disabled ? 0.45 : 0.92);
    this.background.fillRoundedRect(-width / 2, -height / 2, width, height, UITheme.radius.card);
    if (UITheme.card.layered) {
      this.background.fillStyle(UITheme.colors.panelInner, 0.5);
      this.background.fillRoundedRect(-width / 2 + 7, -height / 2 + 7, width - 14, height - 14, UITheme.radius.card - 2);
    }
    this.background.lineStyle(selected ? Math.max(2, UITheme.card.borderWidth) : UITheme.card.borderWidth, selected ? UITheme.colors.borderBright : UITheme.colors.borderPrimary, selected ? 1 : 0.72);
    this.background.strokeRoundedRect(-width / 2, -height / 2, width, height, UITheme.radius.card);
  }
}
