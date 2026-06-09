import { DEFAULT_ASSET_KEY_MAP } from '../assets/AssetKeyMap';
import type { MapDefinition } from '../map/MapDefinition';
import type { DisplaySettingsData } from '../settings/DisplaySettings';

export interface RuntimeTextureReadinessContext {
  runtimeAssetsReady: boolean;
  currentMap: MapDefinition;
  display: Pick<DisplaySettingsData, 'assetStyle' | 'displayQuality'>;
  textureExists(key: string): boolean;
}

export class RuntimeTextureReadiness {
  shouldRedirectToRunPreload(context: RuntimeTextureReadinessContext): boolean {
    return !context.runtimeAssetsReady
      && this.shouldExpectRuntimeTextures(context.display)
      && !this.hasCriticalRuntimeTextures(context);
  }

  hasCriticalRuntimeTextures(context: RuntimeTextureReadinessContext): boolean {
    return this.getCriticalRuntimeTextureKeys(context)
      .every((key) => context.textureExists(key));
  }

  getCriticalRuntimeTextureKeys(context: RuntimeTextureReadinessContext): string[] {
    if (!this.shouldExpectRuntimeTextures(context.display)) {
      return [];
    }

    const groundTileKey = context.currentMap.render?.groundTileKey;

    if (!groundTileKey) {
      return [];
    }

    return [this.getWorldTilePrimaryTextureKey(groundTileKey)];
  }

  private shouldExpectRuntimeTextures(
    display: Pick<DisplaySettingsData, 'assetStyle' | 'displayQuality'>,
  ): boolean {
    return display.assetStyle !== 'graphics'
      && display.displayQuality !== 'minimal';
  }

  private getWorldTilePrimaryTextureKey(groundTileKey: string): string {
    const entry = DEFAULT_ASSET_KEY_MAP.world[
      groundTileKey as keyof typeof DEFAULT_ASSET_KEY_MAP.world
    ];

    return entry?.primary ?? `art_world_${groundTileKey}`;
  }
}
