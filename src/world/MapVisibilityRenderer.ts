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
  private visibilityMask?: Phaser.Display.Masks.BitmapMask;
  private visibilityMaskGraphics?: Phaser.GameObjects.Graphics;
  private fallbackRevealLayer?: Phaser.GameObjects.Graphics;
  private readonly useBitmapMask: boolean;
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

    if (!this.enabled || this.visibility.ambientAlpha <= 0) {
      this.useBitmapMask = false;
      return;
    }

    this.useBitmapMask = this.scene.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer;

    this.overlay = this.scene.add.rectangle(
      config.width / 2,
      config.height / 2,
      config.width,
      config.height,
      this.visibility.ambientColor,
      this.visibility.ambientAlpha,
    );

    // Render dark layer above world sprites so distant actors are also dimmed.
    this.overlay.setDepth(5000);
    this.overlay.setScrollFactor(1);

    if (this.useBitmapMask) {
      this.visibilityMaskGraphics = this.scene.add.graphics();
      this.visibilityMaskGraphics.setVisible(false);
      this.visibilityMaskGraphics.setScrollFactor(1);
      this.visibilityMask = new Phaser.Display.Masks.BitmapMask(
        this.scene,
        this.visibilityMaskGraphics,
      );
      this.visibilityMask.invertAlpha = true;
      this.overlay.setMask(this.visibilityMask);
    } else {
      // Canvas fallback: avoid local bright circles by not performing a second-pass
      // highlight blend. Keep a conservative overlay and no extra draw pass.
      this.fallbackRevealLayer = this.scene.add.graphics();
      this.fallbackRevealLayer.setVisible(false);
      this.fallbackRevealLayer.setScrollFactor(1);
    }
  }

  update(playerX: number, playerY: number): void {
    if (!this.overlay) {
      return;
    }

    const revealGraphics = this.visibilityMaskGraphics ?? this.fallbackRevealLayer;

    if (!revealGraphics) {
      return;
    }

    revealGraphics.clear();
    this.renderVisibilityLayer(playerX, playerY);
  }

  destroy(): void {
    this.overlay?.destroy();
    this.overlay = undefined;

    this.visibilityMask?.destroy();
    this.visibilityMask = undefined;
    this.visibilityMaskGraphics?.destroy();
    this.visibilityMaskGraphics = undefined;
    this.fallbackRevealLayer?.destroy();
    this.fallbackRevealLayer = undefined;
    this.lightSources.length = 0;
  }

  private renderVisibilityLayer(playerX: number, playerY: number): void {
    if (!this.visibilityMaskGraphics && !this.fallbackRevealLayer) {
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

  private renderRevealCircle(x: number, y: number, radius: number, _alpha?: number): void {
    if (!this.visibilityMaskGraphics && !this.fallbackRevealLayer) {
      return;
    }

    const revealGraphics = this.visibilityMaskGraphics ?? this.fallbackRevealLayer;

    if (!revealGraphics) {
      return;
    }

    const safeAlpha = this.useBitmapMask ? 1 : 0;
    revealGraphics.fillStyle(0xffffff, safeAlpha);
    revealGraphics.fillCircle(x, y, radius);
  }

  private getLightRevealRadius(source: MapVisibilityRendererLightSource): number {
    const baseRadius = this.visibility.baseLightRevealRadius > 0
      ? this.visibility.baseLightRevealRadius
      : source.radius;

    return Math.max(baseRadius, source.radius) * this.visibility.lightRevealRadiusScale;
  }
}
