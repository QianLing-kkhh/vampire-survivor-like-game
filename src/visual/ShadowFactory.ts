import Phaser from 'phaser';

import { SHADOW_CONFIGS, ShadowConfig, ShadowType } from './ShadowConfig';
import { VisualSettings } from './VisualSettings';

type ShadowOwner = Phaser.GameObjects.GameObject & {
  x: number;
  y: number;
  depth?: number;
};

export class ShadowFactory {
  static createShadow(
    scene: Phaser.Scene,
    owner: ShadowOwner,
    type: ShadowType,
    options: Partial<ShadowConfig> = {},
  ): Phaser.GameObjects.Ellipse | undefined {
    const config = ShadowFactory.getScaledConfig(type, options);

    if (!config.enabled || !VisualSettings.areShadowsEnabled()) {
      return undefined;
    }

    const shadow = scene.add.ellipse(
      owner.x + config.offsetX,
      owner.y + config.offsetY,
      config.width,
      config.height,
      0x000000,
      config.alpha,
    );

    shadow.setDepth((owner.depth ?? 0) + config.depthOffset);
    shadow.disableInteractive();
    return shadow;
  }

  static updateShadow(
    shadow: Phaser.GameObjects.Ellipse | undefined,
    owner: ShadowOwner,
    type: ShadowType,
    options: Partial<ShadowConfig> = {},
  ): Phaser.GameObjects.Ellipse | undefined {
    if (!shadow) {
      return undefined;
    }

    if (!VisualSettings.areShadowsEnabled()) {
      ShadowFactory.destroyShadow(shadow);
      return undefined;
    }

    const config = ShadowFactory.getScaledConfig(type, options);
    shadow.setPosition(owner.x + config.offsetX, owner.y + config.offsetY);
    shadow.setSize(config.width, config.height);
    shadow.setAlpha(config.alpha);
    shadow.setDepth((owner.depth ?? 0) + config.depthOffset);
    return shadow;
  }

  static destroyShadow(shadow: Phaser.GameObjects.Ellipse | undefined): void {
    if (shadow?.active) {
      shadow.destroy();
    }
  }

  private static getScaledConfig(
    type: ShadowType,
    options: Partial<ShadowConfig>,
  ): ShadowConfig {
    const config = { ...SHADOW_CONFIGS[type], ...options };
    const modelScale = VisualSettings.getModelScaleMultiplier();

    return {
      ...config,
      width: config.width * modelScale,
      height: config.height * modelScale,
      offsetX: config.offsetX * modelScale,
      offsetY: config.offsetY * modelScale,
    };
  }
}
