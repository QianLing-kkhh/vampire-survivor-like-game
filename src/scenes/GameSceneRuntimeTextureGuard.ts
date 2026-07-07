import type { MapDefinition } from '../map/MapDefinition';
import {
  RuntimeTextureReadiness,
  type RuntimeTextureReadinessContext,
} from '../gameplay/RuntimeTextureReadiness';
import { SettingsManager } from '../settings/SettingsManager';

const RUN_PRELOAD_SCENE_KEY = 'RunPreloadScene';
const RUNTIME_ASSETS_NOT_READY_WARNING =
  '[game-scene] Runtime art assets are not ready; redirecting through RunPreloadScene.';
const CRITICAL_TEXTURES_MISSING_WARNING =
  '[game-scene] Runtime art assets were marked ready, but critical world textures are missing.';

export interface GameSceneRuntimeTextureGuardScenePort {
  currentMap: MapDefinition;
  scene: {
    start(key: string, data?: unknown): void;
  };
  textures: {
    exists(key: string): boolean;
  };
}

interface GameSceneRuntimeTextureGuardData {
  runtimeAssetsReady?: boolean;
}

interface GameSceneRuntimeTextureGuardContext {
  runtimeAssetsReady: boolean;
  currentMap: MapDefinition;
  display: RuntimeTextureReadinessContext['display'];
  textureExists(key: string): boolean;
}

export class GameSceneRuntimeTextureGuard {
  private readonly runtimeTextureReadiness = new RuntimeTextureReadiness();

  redirectToPreloadIfNeeded(
    scene: GameSceneRuntimeTextureGuardScenePort,
    data: GameSceneRuntimeTextureGuardData,
  ): boolean {
    const context = this.createGuardContext(scene, data);

    if (this.shouldRedirectToRunPreload(context)) {
      console.warn(RUNTIME_ASSETS_NOT_READY_WARNING);
      scene.scene.start(RUN_PRELOAD_SCENE_KEY, data);
      return true;
    }

    if (this.shouldWarnAboutMissingCriticalTextures(context)) {
      console.warn(CRITICAL_TEXTURES_MISSING_WARNING);
    }

    return false;
  }

  private createGuardContext(
    scene: GameSceneRuntimeTextureGuardScenePort,
    data: GameSceneRuntimeTextureGuardData,
  ): GameSceneRuntimeTextureGuardContext {
    return {
      runtimeAssetsReady: data.runtimeAssetsReady === true,
      currentMap: scene.currentMap,
      display: SettingsManager.getDisplay(),
      textureExists: (key: string) => scene.textures.exists(key),
    };
  }

  private shouldRedirectToRunPreload(context: GameSceneRuntimeTextureGuardContext): boolean {
    return this.runtimeTextureReadiness.shouldRedirectToRunPreload(this.createReadinessInput(
      context,
      context.runtimeAssetsReady,
    ));
  }

  private hasCriticalRuntimeTextures(context: GameSceneRuntimeTextureGuardContext): boolean {
    return this.runtimeTextureReadiness.hasCriticalRuntimeTextures(this.createReadinessInput(
      context,
      true,
    ));
  }

  private shouldWarnAboutMissingCriticalTextures(
    context: GameSceneRuntimeTextureGuardContext,
  ): boolean {
    return context.runtimeAssetsReady && !this.hasCriticalRuntimeTextures(context);
  }

  private createReadinessInput(
    context: GameSceneRuntimeTextureGuardContext,
    runtimeAssetsReady: boolean,
  ): RuntimeTextureReadinessContext {
    return {
      runtimeAssetsReady,
      currentMap: context.currentMap,
      display: context.display,
      textureExists: context.textureExists,
    };
  }
}
