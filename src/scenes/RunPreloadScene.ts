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
import { MapMechanicIconKind, MapMechanicVisualKind } from '../assets/AssetKeyMap';
import { AssetLoadPlan } from '../assets/AssetLoadPlan';
import { logAssetLoadPlan } from '../assets/AssetLoadPlanInspector';
import { ExternalArtRegistry } from '../assets/ExternalArtRegistry';
import { queueLoadPlan } from '../assets/AssetLoadRegistry';
import { CharacterManager } from '../character/CharacterManager';
import { I18n } from '../i18n/I18n';
import { MapManager } from '../map/MapManager';
import { RandomManager } from '../random/RandomManager';
import { RunSeed } from '../random/RunSeed';
import { SelectionManager } from '../selection/SelectionManager';
import { PlaytestSettings } from '../settings/PlaytestSettings';
import { SettingsManager } from '../settings/SettingsManager';
import { StageManager } from '../stage/StageManager';
import { LoadingOverlay, LoadingOverlayRunInfo } from '../ui/LoadingOverlay';
import weaponsData from '../data/weapons.json';
import wavesData from '../data/waves.json';

type RunPreloadSceneData = Record<string, unknown>;
type WaveRecord = {
  enemy?: string;
  enemyId?: string;
};
type WeaponRecord = {
  type?: string;
  tags?: string[];
  behavior?: {
    type?: string;
  };
  damage?: number;
  cooldown?: number;
  radius?: number;
  projectileSpeed?: number;
  projectileCount?: number;
  pierce?: number;
  orbitCount?: number;
  orbitSpeed?: number;
};

export class RunPreloadScene extends Phaser.Scene {
  private plan?: AssetLoadPlan;
  private gameSceneData?: RunPreloadSceneData;
  private context?: RunPreloadContext;
  private loadingOverlay?: LoadingOverlay;

  constructor() {
    super('RunPreloadScene');
  }

  init(data: RunPreloadSceneData): void {
    this.gameSceneData = data;
  }

  preload(): void {
    this.context = this.resolveRunPreloadContext();
    this.createLoadingOverlay(I18n.t('loading.runAssets'), this.buildLoadingRunInfo(this.context));
    ExternalArtRegistry.loadManifest(this);
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
    this.loadingOverlay?.setProgress(1);
    this.loadingOverlay?.setMessage(I18n.t('loading.complete'));
    this.createBuiltInAnimations();
    this.createPlayerDirectionAnimations();
    this.createExternalArtAnimations();
    this.loadingOverlay?.destroy();
    this.loadingOverlay = undefined;
    this.scene.start('GameScene', {
      ...(this.gameSceneData ?? {}),
      runtimeAssetsReady: true,
    });
  }

  private createLoadingOverlay(message: string, runInfo?: LoadingOverlayRunInfo): void {
    this.loadingOverlay?.destroy();
    this.loadingOverlay = new LoadingOverlay(this, {
      title: I18n.t('loading.title'),
      message,
      runInfo,
    });
    this.load.on('progress', this.handleLoadProgress, this);
    this.load.on('fileprogress', this.handleFileProgress, this);
    this.load.on('filecomplete', this.handleFileComplete, this);
    this.load.on('loaderror', this.handleLoadError, this);
    this.load.once('complete', this.cleanupLoaderListeners, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupLoaderListeners();
      this.loadingOverlay?.destroy();
      this.loadingOverlay = undefined;
    });
  }

  private handleLoadProgress(value: number): void {
    this.loadingOverlay?.setProgress(value);
  }

  private handleFileProgress(file: { key?: string }): void {
    if (file.key) {
      this.loadingOverlay?.setCurrentFile(file.key);
    }
  }

  private handleFileComplete(key: string): void {
    this.loadingOverlay?.setCurrentFile(key);
  }

  private handleLoadError(file: { key?: string }): void {
    this.loadingOverlay?.setMessage(I18n.t('loading.failedAsset', { key: file.key ?? 'unknown' }));
  }

  private cleanupLoaderListeners(): void {
    this.load.off('progress', this.handleLoadProgress, this);
    this.load.off('fileprogress', this.handleFileProgress, this);
    this.load.off('filecomplete', this.handleFileComplete, this);
    this.load.off('loaderror', this.handleLoadError, this);
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
    const startingWeaponId = selectedCharacter.startingWeaponId;
    const waveEnemyIds = this.getWaveEnemyIds(
      selectedStage.waveSetId,
      selectedStageRuntime.customStagePackage?.waves,
    );
    const mapMechanicKinds = this.getMapMechanicKinds(selectedMap.mechanics ?? []);

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
      startingWeaponId,
      finalBossId: selectedStage.finalBossId,
      waveEnemyIds,
      groundTileKey: selectedMap.render?.groundTileKey,
      landmarkTypes: Object.entries(selectedMap.render?.landmarkWeights ?? {})
        .filter(([, weight]) => Number(weight) > 0)
        .map(([type]) => type),
      mapMechanicVisualKinds: mapMechanicKinds.visualKinds,
      mapMechanicMinimapIconKinds: mapMechanicKinds.minimapIconKinds,
      audioEnabled: playtest.audioEnabled,
      minimapScale: display.minimapScale,
    };
  }

  private getWaveEnemyIds(
    waveSetId: string | undefined,
    customWaves: readonly unknown[] | undefined,
  ): string[] {
    const waves = (customWaves as readonly WaveRecord[] | undefined)
      ?? (wavesData as Record<string, readonly WaveRecord[]>)[waveSetId ?? 'default']
      ?? [];

    return Array.from(new Set(
      waves
        .map((wave) => wave.enemy ?? wave.enemyId)
        .filter((enemyId): enemyId is string => (
          typeof enemyId === 'string' && enemyId.length > 0
        )),
    ));
  }

  private getMapMechanicKinds(mechanics: readonly { type: string; visualType?: string }[]): {
    visualKinds: MapMechanicVisualKind[];
    minimapIconKinds: MapMechanicIconKind[];
  } {
    const visualKinds = new Set<MapMechanicVisualKind>();
    const minimapIconKinds = new Set<MapMechanicIconKind>();

    for (const mechanic of mechanics) {
      switch (mechanic.type) {
        case 'slowZone':
          this.addSlowZoneMechanicKinds(mechanic.visualType, visualKinds, minimapIconKinds);
          break;
        case 'portal':
          this.addPortalMechanicKinds(mechanic.visualType, visualKinds, minimapIconKinds);
          break;
        case 'lightSource':
          this.addLightMechanicKinds(mechanic.visualType, visualKinds, minimapIconKinds);
          break;
        case 'obstacle':
          this.addObstacleMechanicKinds(mechanic.visualType, visualKinds, minimapIconKinds);
          break;
        case 'hazard':
          this.addHazardMechanicKinds(mechanic.visualType, visualKinds, minimapIconKinds);
          break;
        case 'altar':
          visualKinds.add(mechanic.visualType === 'library'
            ? 'altarLibrary'
            : mechanic.visualType === 'cathedral'
              ? 'altarCathedral'
              : 'altar');
          minimapIconKinds.add(mechanic.visualType === 'library' ? 'altarLibrary' : 'altar');
          break;
        case 'spawner':
          visualKinds.add('spawner');
          minimapIconKinds.add('spawner');
          break;
        default:
          break;
      }
    }

    return {
      visualKinds: Array.from(visualKinds),
      minimapIconKinds: Array.from(minimapIconKinds),
    };
  }

  private addSlowZoneMechanicKinds(
    visualType: string | undefined,
    visualKinds: Set<MapMechanicVisualKind>,
    minimapIconKinds: Set<MapMechanicIconKind>,
  ): void {
    switch (visualType) {
      case 'swamp':
        visualKinds.add('swamp');
        minimapIconKinds.add('swamp');
        break;
      case 'mud':
        visualKinds.add('mud');
        minimapIconKinds.add('mud');
        break;
      case 'ink':
        visualKinds.add('ink');
        minimapIconKinds.add('ink');
        break;
      case 'river':
      default:
        visualKinds.add('river');
        minimapIconKinds.add('river');
        break;
    }
  }

  private addPortalMechanicKinds(
    visualType: string | undefined,
    visualKinds: Set<MapMechanicVisualKind>,
    minimapIconKinds: Set<MapMechanicIconKind>,
  ): void {
    switch (visualType) {
      case 'purple':
        visualKinds.add('portalPurple');
        minimapIconKinds.add('portalPurple');
        break;
      case 'green':
        visualKinds.add('portalGreen');
        minimapIconKinds.add('portalGreen');
        break;
      case 'gold':
        visualKinds.add('portalGold');
        minimapIconKinds.add('portalGold');
        break;
      case 'blue':
      default:
        visualKinds.add('portalBlue');
        minimapIconKinds.add('portalBlue');
        break;
    }
  }

  private addLightMechanicKinds(
    visualType: string | undefined,
    visualKinds: Set<MapMechanicVisualKind>,
    minimapIconKinds: Set<MapMechanicIconKind>,
  ): void {
    switch (visualType) {
      case 'torch':
        visualKinds.add('lightTorch');
        break;
      case 'crystal':
        visualKinds.add('lightCrystal');
        break;
      case 'candle':
        visualKinds.add('lightCandle');
        break;
      case 'arcaneLamp':
        visualKinds.add('lightArcaneLamp');
        break;
      case 'lamp':
      default:
        visualKinds.add('lightLamp');
        break;
    }

    minimapIconKinds.add('light');
  }

  private addObstacleMechanicKinds(
    visualType: string | undefined,
    visualKinds: Set<MapMechanicVisualKind>,
    minimapIconKinds: Set<MapMechanicIconKind>,
  ): void {
    switch (visualType) {
      case 'tree':
        visualKinds.add('obstacleTree');
        break;
      case 'grave':
        visualKinds.add('obstacleGrave');
        break;
      case 'wall':
        visualKinds.add('obstacleWall');
        break;
      case 'cathedralWall':
        visualKinds.add('obstacleCathedralWall');
        break;
      case 'cathedralPillar':
        visualKinds.add('obstacleCathedralPillar');
        break;
      case 'bookshelf':
        visualKinds.add('obstacleBookshelf');
        break;
      case 'archivePillar':
        visualKinds.add('obstacleArchivePillar');
        break;
      case 'rock':
      default:
        visualKinds.add('obstacleRock');
        break;
    }

    minimapIconKinds.add('obstacle');
  }

  private addHazardMechanicKinds(
    visualType: string | undefined,
    visualKinds: Set<MapMechanicVisualKind>,
    minimapIconKinds: Set<MapMechanicIconKind>,
  ): void {
    switch (visualType) {
      case 'fire':
        visualKinds.add('hazardFire');
        break;
      case 'poison':
        visualKinds.add('hazardPoison');
        break;
      case 'spike':
      default:
        visualKinds.add('hazardSpike');
        break;
    }

    minimapIconKinds.add('hazard');
  }

  private buildLoadingRunInfo(context: RunPreloadContext): LoadingOverlayRunInfo {
    const characterManager = new CharacterManager();
    const mapManager = new MapManager();
    const character = characterManager.getCharacter(context.characterId);
    const map = mapManager.getMap(context.mapId);
    const startingWeaponId = character.startingWeaponId;
    const weapon = (weaponsData as Record<string, WeaponRecord>)[startingWeaponId] ?? {};

    return {
      map: {
        id: map.id,
        name: map.name || map.id,
        worldWidth: map.worldWidth,
        worldHeight: map.worldHeight,
        gridSize: map.gridSize,
        landmarkSpacing: map.landmarkSpacing,
        mechanics: map.mechanics?.map((mechanic) => mechanic.type) ?? [],
      },
      character: {
        id: character.id,
        name: this.translateOrFallback(character.nameKey, character.name || character.id),
        startingWeaponId,
        maxHp: character.initialStats.maxHp,
        moveSpeed: character.initialStats.moveSpeed,
        pickupRange: character.initialStats.pickupRange,
        expMultiplier: character.initialStats.expMultiplier,
        growthSummary: this.formatGrowthSummary(character.growthPerLevel),
        reactionSummary: character.damageReactionSkill?.type,
        levelUpSummary: character.levelUpEffect?.type,
      },
      startingWeapon: {
        id: startingWeaponId,
        name: this.formatIdLabel(startingWeaponId),
        type: weapon.type,
        behaviorType: weapon.behavior?.type,
        tags: weapon.tags,
        stats: this.getWeaponCoreStats(weapon),
      },
    };
  }

  private getWeaponCoreStats(weapon: WeaponRecord): Record<string, number | string> {
    const stats: Record<string, number | string> = {};

    for (const key of [
      'damage',
      'cooldown',
      'radius',
      'projectileSpeed',
      'projectileCount',
      'pierce',
      'orbitCount',
      'orbitSpeed',
    ] as const) {
      const value = weapon[key];

      if (typeof value === 'number') {
        stats[key] = value;
      }
    }

    return stats;
  }

  private formatGrowthSummary(growth: object | undefined): string | undefined {
    if (!growth) {
      return undefined;
    }

    const entries = Object.entries(growth)
      .filter(([, value]) => typeof value === 'number' && value !== 0)
      .slice(0, 2)
      .map(([key, value]) => `${this.formatIdLabel(key)} +${value}`);

    return entries.length > 0 ? entries.join(' / ') : undefined;
  }

  private translateOrFallback(key: string | undefined, fallback: string): string {
    if (!key) {
      return fallback;
    }

    const translated = I18n.t(key);
    return translated === key ? fallback : translated;
  }

  private formatIdLabel(id: string): string {
    return id
      .split(/[_-]/)
      .filter((part) => part.length > 0)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' ');
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
      this.logRunLoadPlanIfDebugEnabled(this.plan);
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
      this.logRunLoadPlanIfDebugEnabled(this.plan);
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

  private logRunLoadPlanIfDebugEnabled(plan: AssetLoadPlan): void {
    const developer = SettingsManager.getDeveloper();
    const display = SettingsManager.getDisplay();

    if (
      developer.showDebugLogs
      || developer.showDebugPanel
      || display.showDebugOverlay
    ) {
      logAssetLoadPlan(plan, 'run-preload');
    }
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

      for (const direction of PLAYER_ART_DIRECTIONS) {
        this.createAnimationAlias(
          `art_player_${skinId}_walk_${direction}`,
          `art_player_${skinId}_walk_${direction}`,
          0,
          3,
          -1,
        );
        this.createAnimationAlias(
          `art_player_${skinId}_idle_${direction}`,
          `art_player_${skinId}_idle_${direction}`,
          0,
          3,
          -1,
        );
      }
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

      const requestedEndFrame = (asset.frameCount ?? 1) - 1;
      const availableEndFrame = this.getAvailableAnimationEndFrame(
        asset.textureKey,
        0,
        requestedEndFrame,
      );

      if (availableEndFrame === null) {
        console.warn(`[external-art] Skipping animation without usable frames: ${asset.animationKey}`);
        continue;
      }

      if (availableEndFrame < requestedEndFrame) {
        console.warn(
          `[external-art] Clamped animation ${asset.animationKey} to frame ${availableEndFrame} from requested ${requestedEndFrame}.`,
        );
      }

      this.anims.create({
        key: asset.animationKey,
        frames: this.anims.generateFrameNumbers(asset.textureKey, {
          start: 0,
          end: availableEndFrame,
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

    const availableEndFrame = this.getAvailableAnimationEndFrame(textureKey, start, end);

    if (availableEndFrame === null) {
      console.warn(`[run-preload] Missing frames for ${textureKey}: ${start}..${end}`);
      return;
    }

    this.anims.create({
      key: animationKey,
      frames: this.anims.generateFrameNumbers(textureKey, { start, end: availableEndFrame }),
      frameRate: 8,
      repeat,
    });
  }

  private getAvailableAnimationEndFrame(
    textureKey: string,
    start: number,
    requestedEnd: number,
  ): number | null {
    const frameCount = this.getTextureFrameCount(textureKey);

    if (frameCount <= start) {
      return null;
    }

    return Math.min(requestedEnd, frameCount - 1);
  }

  private getTextureFrameCount(textureKey: string): number {
    if (!this.textures.exists(textureKey)) {
      return 0;
    }

    return this.textures.get(textureKey).getFrameNames(false).length;
  }
}
