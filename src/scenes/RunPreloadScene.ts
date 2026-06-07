import Phaser from 'phaser';

import {
  ART_MANIFEST_CACHE_KEY,
  PLAYER_ART_DIRECTIONS,
  PLAYER_ART_SKIN_IDS,
  RunPreloadContext,
  buildRunLoadPlan,
  getArtManifestVersion,
  getAnimationKeys,
  parseArtManifestAssets,
  resolveArtManifestPath,
  resolvePlayerSkinId,
} from '../assets/AssetManifest';
import { AssetLoadPlan } from '../assets/AssetLoadPlan';
import { ExternalArtRegistry } from '../assets/ExternalArtRegistry';
import { queueLoadPlan } from '../assets/AssetLoadRegistry';
import { CharacterManager } from '../character/CharacterManager';
import { MapManager } from '../map/MapManager';
import { RandomManager } from '../random/RandomManager';
import { RunSeed } from '../random/RunSeed';
import { SelectionManager } from '../selection/SelectionManager';
import { PlaytestSettings } from '../settings/PlaytestSettings';
import { SettingsManager } from '../settings/SettingsManager';
import { StageManager } from '../stage/StageManager';

type RunPreloadSceneData = Record<string, unknown>;

export class RunPreloadScene extends Phaser.Scene {
  private plan?: AssetLoadPlan;
  private gameSceneData?: RunPreloadSceneData;
  private context?: RunPreloadContext;

  constructor() {
    super('RunPreloadScene');
  }

  init(data: RunPreloadSceneData): void {
    this.gameSceneData = data;
  }

  preload(): void {
    ExternalArtRegistry.loadManifest(this);
    this.context = this.resolveRunPreloadContext();
    if (this.shouldForceRefreshPlayerRuntimeAssets()) {
      const resolvedSkinId = resolvePlayerSkinId(
        this.context?.skinId,
        this.context?.characterId,
      );

      this.clearPlayerRuntimeAssets(
        resolvedSkinId,
      );
    }
    this.loadArtManifestBackedRunPlan();
  }

  create(): void {
    this.createBuiltInAnimations();
    this.createPlayerDirectionAnimations();
    this.createExternalArtAnimations();
    this.scene.start('GameScene', {
      ...(this.gameSceneData ?? {}),
      runtimeAssetsReady: true,
    });
  }

  private resolveRunPreloadContext(): RunPreloadContext {
    const selection = SelectionManager.getSelection();
    const runSeed = RunSeed.createSeedFromSelection(selection);
    const randomManager = new RandomManager(runSeed);
    const characterManager = new CharacterManager();
    const selectedCharacter = characterManager.resolveCharacterForRun(
      selection.characterId,
      randomManager.getSource('character'),
    );
    const stageManager = new StageManager();
    const mapManager = new MapManager();
    const selectedStageRuntime = stageManager.getSelectedStageRuntimeDefinition();
    const selectedStage = selectedStageRuntime.source === 'custom'
      ? selectedStageRuntime.stage
      : stageManager.resolveStageForRun(selection.stageId, randomManager.getSource('stage'));
    const selectedMap = selectedStageRuntime.source === 'custom'
      ? mapManager.getSelectedMap()
      : mapManager.resolveMapForStage(selectedStage);
    const display = SettingsManager.getDisplay();
    const playtest = PlaytestSettings.get();

    return {
      selectedCharacterId: selection.characterId,
      characterId: selectedCharacter.id,
      selectedStageId: selection.stageId,
      stageId: selectedStage.id,
      mapId: selectedMap.id,
      difficultyId: selection.difficultyId,
      mutatorIds: selectedStage.mutators
        ?.map((mutator) => mutator.id)
        .filter((id): id is string => id !== undefined),
      assetStyle: display.assetStyle,
      displayQuality: display.displayQuality,
      skinId: resolvePlayerSkinId(
        selectedCharacter.skinId,
        selectedCharacter.id,
      ),
      endlessMode: playtest.endlessMode,
    };
  }

  private shouldForceRefreshPlayerRuntimeAssets(): boolean {
    return this.context?.assetStyle === 'art001';
  }

  private loadArtManifestBackedRunPlan(): void {
    if (!this.context) {
      return;
    }

    const manifestPath = resolveArtManifestPath(this.context.assetStyle);
    let queuedPlan = false;
    const queueFallbackPlan = (): void => {
      if (queuedPlan || !this.context) {
        return;
      }

      queuedPlan = true;
      this.plan = buildRunLoadPlan(this.context);
      queueLoadPlan(this, this.plan);
    };

    const queueManifestPlan = (): void => {
      if (queuedPlan || !this.context) {
        return;
      }

      const manifest = this.cache.json.get(ART_MANIFEST_CACHE_KEY);
      const manifestAssets = parseArtManifestAssets(manifest);

      if (manifestAssets.length === 0) {
        console.warn(`[art] Invalid or empty runtime art manifest: ${manifestPath}; using built-in art list.`);
        queueFallbackPlan();
        return;
      }

      queuedPlan = true;
      this.plan = buildRunLoadPlan(
        this.context,
        manifestAssets,
        getArtManifestVersion(manifest),
      );
      queueLoadPlan(this, this.plan);
    };

    this.cache.json.remove(ART_MANIFEST_CACHE_KEY);
    this.load.once(`filecomplete-json-${ART_MANIFEST_CACHE_KEY}`, queueManifestPlan);
    this.load.once('loaderror', (file: { key?: string }) => {
      if (file.key !== ART_MANIFEST_CACHE_KEY) {
        return;
      }

      console.warn(`[art] Runtime art manifest failed to load: ${manifestPath}; using built-in art list.`);
      queueFallbackPlan();
    });
    this.load.json(ART_MANIFEST_CACHE_KEY, manifestPath);
  }

  private clearPlayerRuntimeAssets(skinId: string): void {
    const keys = [
      'art_player_player_walk_sheet',
      'art_player_walk',
      'art_player_idle',
      `art_player_${skinId}_walk_sheet`,
      `art_player_${skinId}_walk`,
      `art_player_${skinId}_idle`,
      `art_player_${skinId}_portrait`,
      `art_player_${skinId}_hit_fx`,
      ...PLAYER_ART_DIRECTIONS.flatMap((direction) => [
        `art_player_walk_${direction}`,
        `art_player_idle_${direction}`,
        `art_player_${skinId}_walk_${direction}`,
        `art_player_${skinId}_idle_${direction}`,
      ]),
    ];

    for (const key of keys) {
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }

      if (this.anims.exists(key)) {
        this.anims.remove(key);
      }
    }
  }

  private createBuiltInAnimations(): void {
    for (const asset of this.plan?.assets ?? []) {
      if (asset.type !== 'spritesheet' || !this.textures.exists(asset.key)) {
        continue;
      }

      for (const animationKey of getAnimationKeys(asset.key)) {
        this.createAnimationAlias(animationKey, asset.key, 0, asset.endFrame ?? 0, -1);
      }
    }
  }

  private createPlayerDirectionAnimations(): void {
    this.createPlayerDirectionAnimationSet('art_player_player_walk_sheet', 'art_player');

    for (const skinId of PLAYER_ART_SKIN_IDS) {
      this.createAnimationAlias(
        `art_player_${skinId}_walk`,
        `art_player_${skinId}_walk_sheet`,
        0,
        3,
        -1,
      );
      this.createAnimationAlias(
        `art_player_${skinId}_idle`,
        `art_player_${skinId}_walk_sheet`,
        0,
        0,
        0,
      );
    }

    const activeSkinId = resolvePlayerSkinId(
      this.context?.skinId,
      this.context?.characterId,
    );

    for (const direction of PLAYER_ART_DIRECTIONS) {
      this.createAnimationAlias(
        `art_player_${activeSkinId}_walk_${direction}`,
        `art_player_${activeSkinId}_walk_${direction}`,
        0,
        3,
        -1,
      );
      this.createAnimationAlias(
        `art_player_${activeSkinId}_idle_${direction}`,
        `art_player_${activeSkinId}_idle_${direction}`,
        0,
        3,
        -1,
      );
    }
  }

  private createPlayerDirectionAnimationSet(textureKey: string, animationPrefix: string): void {
    if (!this.textures.exists(textureKey)) {
      return;
    }

    this.createAnimationAlias(`${animationPrefix}_walk`, textureKey, 0, 3, -1);
    this.createAnimationAlias(`${animationPrefix}_idle`, textureKey, 0, 0, 0);

    for (const direction of PLAYER_ART_DIRECTIONS) {
      this.createAnimationAlias(`${animationPrefix}_walk_${direction}`, textureKey, 0, 3, -1);
      this.createAnimationAlias(`${animationPrefix}_idle_${direction}`, textureKey, 0, 0, 0);
    }
  }

  private createExternalArtAnimations(): void {
    for (const asset of ExternalArtRegistry.getAssets()) {
      if (
        asset.type !== 'spritesheet'
        || !asset.animationKey
        || this.anims.exists(asset.animationKey)
        || !this.textures.exists(asset.textureKey)
      ) {
        continue;
      }

      this.anims.create({
        key: asset.animationKey,
        frames: this.anims.generateFrameNumbers(asset.textureKey, {
          start: 0,
          end: (asset.frameCount ?? 1) - 1,
        }),
        frameRate: asset.frameRate ?? 8,
        repeat: asset.repeat ?? -1,
      });
    }
  }

  private createAnimationAlias(
    animationKey: string,
    textureKey: string,
    start: number,
    end: number,
    repeat: number,
  ): void {
    if (this.anims.exists(animationKey) || !this.textures.exists(textureKey)) {
      return;
    }

    if (!this.hasTextureFrames(textureKey, start, end)) {
      console.warn(`[run-preload] Missing frames for ${textureKey}: ${start}..${end}`);
      return;
    }

    this.anims.create({
      key: animationKey,
      frames: this.anims.generateFrameNumbers(textureKey, { start, end }),
      frameRate: 8,
      repeat,
    });
  }

  private hasTextureFrames(textureKey: string, start: number, end: number): boolean {
    for (let frame = start; frame <= end; frame += 1) {
      if (!this.textures.getFrame(textureKey, frame)) {
        return false;
      }
    }

    return true;
  }
}
