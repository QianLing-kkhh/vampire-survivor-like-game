import Phaser from 'phaser';

import { UITheme } from '../UITheme';

export type PanelFrameVariant = 'modal' | 'hud' | 'card' | 'tooltip';

export interface PanelFrameConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  alpha?: number;
  variant?: PanelFrameVariant;
  dim?: boolean;
}

export class PanelFrame {
  static create(scene: Phaser.Scene, config: PanelFrameConfig): Phaser.GameObjects.Container {
    const container = scene.add.container(config.x, config.y);
    const width = config.width;
    const height = config.height;
    const alpha = config.alpha ?? PanelFrame.getAlpha(config.variant ?? 'modal');

    if (config.dim) {
      const dimmer = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, UITheme.colors.backgroundOverlay, UITheme.alpha.overlay);
      dimmer.setOrigin(0.5);
      dimmer.setInteractive();
      container.add(dimmer);
    }

    const outer = scene.add.graphics();
    outer.fillStyle(UITheme.panelBgColor, alpha);
    outer.fillRoundedRect(-width / 2, -height / 2, width, height, UITheme.radius.panel);
    outer.lineStyle(UITheme.panel.borderWidth, UITheme.colors.borderPrimary, 0.92);
    outer.strokeRoundedRect(-width / 2, -height / 2, width, height, UITheme.radius.panel);
    container.add(outer);

    if (!UITheme.panel.decorated) {
      return container;
    }

    const inset = UITheme.panel.innerInset;
    const inner = scene.add.graphics();
    inner.fillStyle(UITheme.colors.panelInner, Math.min(0.82, alpha));
    inner.fillRoundedRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, Math.max(2, UITheme.radius.panel - 2));
    inner.lineStyle(1, UITheme.colors.borderBright, 0.18);
    inner.strokeRoundedRect(-width / 2 + inset, -height / 2 + inset, width - inset * 2, height - inset * 2, Math.max(2, UITheme.radius.panel - 2));

    const corners = scene.add.graphics();
    corners.lineStyle(2, UITheme.colors.accentGold, 0.72);
    const corner = 18;
    const left = -width / 2 + inset;
    const right = width / 2 - inset;
    const top = -height / 2 + inset;
    const bottom = height / 2 - inset;
    corners.strokeLineShape(new Phaser.Geom.Line(left, top + corner, left, top));
    corners.strokeLineShape(new Phaser.Geom.Line(left, top, left + corner, top));
    corners.strokeLineShape(new Phaser.Geom.Line(right - corner, top, right, top));
    corners.strokeLineShape(new Phaser.Geom.Line(right, top, right, top + corner));
    corners.strokeLineShape(new Phaser.Geom.Line(left, bottom - corner, left, bottom));
    corners.strokeLineShape(new Phaser.Geom.Line(left, bottom, left + corner, bottom));
    corners.strokeLineShape(new Phaser.Geom.Line(right - corner, bottom, right, bottom));
    corners.strokeLineShape(new Phaser.Geom.Line(right, bottom, right, bottom - corner));

    container.add([inner, corners]);
    return container;
  }

  private static getAlpha(variant: PanelFrameVariant): number {
    switch (variant) {
      case 'hud':
        return UITheme.alpha.hud;
      case 'card':
        return UITheme.alpha.card;
      case 'tooltip':
        return UITheme.alpha.tooltip;
      case 'modal':
      default:
        return UITheme.alpha.modal;
    }
  }
}
