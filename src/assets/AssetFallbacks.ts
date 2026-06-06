import Phaser from 'phaser';

type AssetFallbackKind = 'texture' | 'animation';

type AssetFallbackContext = {
  logicalKey?: string;
  kind: AssetFallbackKind;
  primaryKey?: string | null;
  fallbackKeys?: readonly string[];
  resolvedKey?: string | null;
};

export class AssetFallbacks {
  private static loggedFallbacks = new Set<string>();

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
    context?: AssetFallbackContext,
  ): string | null {
    if (AssetFallbacks.hasTexture(scene, primaryKey)) {
      return primaryKey;
    }

    const resolvedKey = fallbackKeys.find((key) => scene.textures.exists(key)) ?? null;

    AssetFallbacks.logFallbackResult(primaryKey, fallbackKeys, resolvedKey, {
      kind: 'texture',
      logicalKey: context?.logicalKey,
      primaryKey,
      fallbackKeys,
      resolvedKey,
    });

    return resolvedKey;
  }

  static resolveAnimation(
    scene: Phaser.Scene,
    primaryKey: string | null | undefined,
    fallbackKeys: readonly string[] = [],
    context?: AssetFallbackContext,
  ): string | null {
    if (AssetFallbacks.hasAnimation(scene, primaryKey)) {
      return primaryKey;
    }

    const resolvedKey = fallbackKeys.find((key) => scene.anims.exists(key)) ?? null;

    AssetFallbacks.logFallbackResult(primaryKey, fallbackKeys, resolvedKey, {
      kind: 'animation',
      logicalKey: context?.logicalKey,
      primaryKey,
      fallbackKeys,
      resolvedKey,
    });

    return resolvedKey;
  }

  private static logFallbackResult(
    primaryKey: string | null | undefined,
    fallbackKeys: readonly string[],
    resolvedKey: string | null,
    context: AssetFallbackContext,
  ): void {
    const triedKeys = AssetFallbacks.getTriedKeys(primaryKey, fallbackKeys);

    if (triedKeys.length === 0) {
      return;
    }

    const subject = context.logicalKey ?? primaryKey ?? 'unknown';
    const logKey = [
      context.kind,
      subject,
      primaryKey ?? 'none',
    ].join('|');

    if (AssetFallbacks.loggedFallbacks.has(logKey)) {
      return;
    }

    AssetFallbacks.loggedFallbacks.add(logKey);

    if (resolvedKey) {
      console.debug(
        `[asset-fallback] Missing ${context.kind} primary for ${subject}: ${primaryKey ?? 'none'} -> ${resolvedKey}`,
      );
      return;
    }

    console.warn(
      `[asset-fallback] Missing ${context.kind} for ${subject}: tried ${triedKeys.join(', ')}`,
    );
  }

  private static getTriedKeys(
    primaryKey: string | null | undefined,
    fallbackKeys: readonly string[],
  ): string[] {
    return [primaryKey, ...fallbackKeys].filter((key): key is string => (
      key !== undefined && key !== null && key.length > 0
    ));
  }
}
