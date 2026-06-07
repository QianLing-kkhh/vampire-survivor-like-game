import Phaser from 'phaser';

import { WorldRenderConfig } from './WorldConfig';

const DEFAULT_VISIBILITY = {
  ambientAlpha: 0,
  ambientColor: 0x020617,
  baseRevealRadius: 420,
  baseRevealAlpha: 0.12,
  baseLightRevealRadius: 0,
  lightRevealRadiusScale: 1,
  lightRevealAlpha: 0.1,
  lightContributionClamp: 0.22,
} as const;

export interface MapVisibilityRendererLightSource {
  x: number;
  y: number;
  radius: number;
}

interface MapVisibilityRuntimeConfig {
  ambientAlpha: number;
  ambientColor: number;
  baseRevealRadius: number;
  baseRevealAlpha: number;
  baseLightRevealRadius: number;
  lightRevealRadiusScale: number;
  lightRevealAlpha: number;
  lightContributionClamp: number;
}

export class MapVisibilityRenderer {
  private overlay?: Phaser.GameObjects.Rectangle;
  private revealLayer?: Phaser.GameObjects.Graphics;
  private readonly visibility: MapVisibilityRuntimeConfig;
  private readonly lightSources: MapVisibilityRendererLightSource[];
  private readonly enabled: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    config: WorldRenderConfig,
    lightSources: ReadonlyArray<MapVisibilityRendererLightSource> = [],
  ) {
    const visibilityConfig = config.visibility;
    this.enabled = visibilityConfig?.enabled === true;
    this.lightSources = lightSources.map((source) => ({ ...source }));

    this.visibility = {
      ...DEFAULT_VISIBILITY,
      ...(visibilityConfig ?? {}),
      ambientColor: visibilityConfig?.ambientColor ?? DEFAULT_VISIBILITY.ambientColor,
      lightRevealRadiusScale: visibilityConfig?.lightRevealRadiusScale
        ?? DEFAULT_VISIBILITY.lightRevealRadiusScale,
      baseLightRevealRadius: visibilityConfig?.baseLightRevealRadius
        ?? DEFAULT_VISIBILITY.baseLightRevealRadius,
      lightContributionClamp: visibilityConfig?.lightContributionClamp
        ?? DEFAULT_VISIBILITY.lightContributionClamp,
    };

    if (!this.enabled) {
      return;
    }

    this.overlay = this.scene.add.rectangle(
      config.width / 2,
      config.height / 2,
      config.width,
      config.height,
      this.visibility.ambientColor,
      this.visibility.ambientAlpha,
    );

    this.overlay.setDepth(-75);
    this.overlay.setScrollFactor(1);
    this.overlay.setVisible(this.visibility.ambientAlpha > 0);

    this.revealLayer = this.scene.add.graphics();
    this.revealLayer.setDepth(-74);
    this.revealLayer.setScrollFactor(1);
  }

  update(playerX: number, playerY: number): void {
    if (!this.enabled || !this.revealLayer) {
      return;
    }

    this.revealLayer.clear();
    this.renderVisibilityLayer(playerX, playerY);
  }

  destroy(): void {
    this.overlay?.destroy();
    this.overlay = undefined;

    this.revealLayer?.destroy();
    this.revealLayer = undefined;
    this.lightSources.length = 0;
  }

  private renderVisibilityLayer(playerX: number, playerY: number): void {
    if (!this.revealLayer) {
      return;
    }

    if (this.visibility.baseRevealRadius > 0) {
      this.renderRevealCircle(
        playerX,
        playerY,
        this.visibility.baseRevealRadius,
        this.visibility.baseRevealAlpha,
      );
    }

    const maxLightAlpha = this.visibility.lightContributionClamp;

    for (const source of this.lightSources) {
      const lightRadius = this.getLightRevealRadius(source);

      if (lightRadius <= 0) {
        continue;
      }

      this.renderRevealCircle(
        source.x,
        source.y,
        lightRadius,
        Math.min(this.visibility.lightRevealAlpha, maxLightAlpha),
      );
    }
  }

  private renderRevealCircle(x: number, y: number, radius: number, alpha: number): void {
    if (!this.revealLayer) {
      return;
    }

    this.revealLayer.fillStyle(0xffffff, alpha);
    this.revealLayer.fillCircle(x, y, radius);
  }

  private getLightRevealRadius(source: MapVisibilityRendererLightSource): number {
    const baseRadius = this.visibility.baseLightRevealRadius > 0
      ? this.visibility.baseLightRevealRadius
      : source.radius;

    return Math.max(baseRadius, source.radius) * this.visibility.lightRevealRadiusScale;
  }
}
