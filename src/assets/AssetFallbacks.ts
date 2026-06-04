import Phaser from 'phaser';

export class AssetFallbacks {
  static hasTexture(scene: Phaser.Scene, key: string | null | undefined): key is string {
    return key !== undefined
      && key !== null
      && scene.textures.exists(key);
  }

  static hasAnimation(scene: Phaser.Scene, key: string | null | undefined): key is string {
    return key !== undefined
      && key !== null
      && scene.anims.exists(key);
  }

  static resolveTexture(
    scene: Phaser.Scene,
    primaryKey: string | null | undefined,
    fallbackKeys: readonly string[] = [],
  ): string | null {
    if (AssetFallbacks.hasTexture(scene, primaryKey)) {
      return primaryKey;
    }

    return fallbackKeys.find((key) => scene.textures.exists(key)) ?? null;
  }

  static resolveAnimation(
    scene: Phaser.Scene,
    primaryKey: string | null | undefined,
    fallbackKeys: readonly string[] = [],
  ): string | null {
    if (AssetFallbacks.hasAnimation(scene, primaryKey)) {
      return primaryKey;
    }

    return fallbackKeys.find((key) => scene.anims.exists(key)) ?? null;
  }
}
