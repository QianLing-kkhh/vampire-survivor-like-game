import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import { resolveArtManifestPath, resolveArtStyleRoot } from '../assets/AssetManifest';
import {
  EXTERNAL_ART_MANIFEST_CACHE_KEY,
  EXTERNAL_ART_MANIFEST_PATH,
  ExternalArtAsset,
} from '../assets/ExternalArtManifest';
import { ExternalArtRegistry } from '../assets/ExternalArtRegistry';
import type { ArtManifestAsset } from '../assets/manifests/AssetManifestTypes';
import { AUDIO_ASSETS } from '../assets/manifests/audioAssets';
import {
  ART_MANIFEST_ASSETS,
  CRITICAL_ART_ASSETS,
} from '../assets/manifests/gameplayArtAssets';
import {
  PLAYER_ART_DIRECTIONS,
  PLAYER_ART_SKIN_IDS,
} from '../assets/manifests/playerArtAssets';
import { AudioManager } from '../audio/AudioManager';
import { VisualSettings } from '../visual/VisualSettings';

type ArtManifest = {
  assets?: unknown;
};

type LoaderFileInfo = {
  key?: string;
  type?: string;
  url?: unknown;
  src?: unknown;
};

const ART_MANIFEST_CACHE_KEY = 'art_animation_manifest';

export class PreloadScene extends Phaser.Scene {
  private artManifestAssets: ArtManifestAsset[] = ART_MANIFEST_ASSETS;
  private artManifestVersion = 'fallback';
  private readonly artStyleRoot = resolveArtStyleRoot(VisualSettings.getAssetStyle());
  private readonly queuedArtAssetKeys = new Set<string>();
  private readonly loadedCriticalArtAssetKeys = new Set<string>();

  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    this.artManifestAssets = ART_MANIFEST_ASSETS;
    this.registerCriticalArtAssetDiagnostics(CRITICAL_ART_ASSETS);
    this.loadArtManifestAssetFiles(CRITICAL_ART_ASSETS);
    this.load.image('player', 'assets/player/player_placeholder.png');
    this.load.image('slime', 'assets/enemy/slime_placeholder.png');
    this.load.image('bat', 'assets/enemy/bat_placeholder.png');
    this.load.image('golem', 'assets/enemy/golem_placeholder.png');
    this.load.image('slime_boss', 'assets/art/enemies/slime_boss_placeholder.png');
    this.load.image('bat_boss', 'assets/art/enemies/bat_boss_placeholder.png');
    this.load.image('golem_boss', 'assets/art/enemies/golem_boss_placeholder.png');
    this.load.image('exp_gem', 'assets/pickup/exp_gem_placeholder.png');
    this.load.image('knife_projectile', 'assets/effects/knife_projectile.png');
    this.load.image('hit_flash', 'assets/effects/hit_flash.png');
    this.load.image(
      'bible_orbit_projectile',
      'assets/effects/bible_orbit_projectile.png',
    );
    this.load.image('axe_projectile', 'assets/images/axe_projectile.png');
    this.load.image('magic_wand_projectile', 'assets/images/magic_wand_projectile.png');
    this.load.image('treasure_chest', 'assets/images/treasure_chest.png');
    this.load.image('boss_lava_beast', 'assets/images/boss_lava_beast.png');
    this.load.image(
      'thousand_edge_projectile',
      'assets/images/thousand_edge_projectile.png',
    );
    this.load.image('holy_wand_projectile', 'assets/images/holy_wand_projectile.png');
    this.load.image(
      'death_spiral_projectile',
      'assets/images/death_spiral_projectile.png',
    );
    this.load.image(
      'unholy_vespers_orbit_book',
      'assets/images/unholy_vespers_orbit_book.png',
    );
    this.load.image('soul_eater_core', 'assets/images/soul_eater_core.png');
    this.load.image('hp_icon', 'assets/art/ui/hp_icon.png');
    this.load.image('exp_icon', 'assets/art/ui/exp_icon.png');
    this.load.image('time_icon', 'assets/art/ui/time_icon.png');
    this.load.image('knife_icon', 'assets/weapons/knife_icon.png');
    this.load.image('garlic_icon', 'assets/weapons/garlic_icon.png');
    this.load.image('bible_icon', 'assets/weapons/bible_icon.png');
    this.load.image('axe_icon', 'assets/art/weapons/axe_icon.png');
    this.load.image('magic_wand_icon', 'assets/art/weapons/magic_wand_icon.png');
    this.load.image('thousand_edge_icon', 'assets/art/weapons/thousand_edge_icon.png');
    this.load.image('holy_wand_icon', 'assets/art/weapons/holy_wand_icon.png');
    this.load.image('death_spiral_icon', 'assets/art/weapons/death_spiral_icon.png');
    this.load.image('unholy_vespers_icon', 'assets/art/weapons/unholy_vespers_icon.png');
    this.load.image('soul_eater_icon', 'assets/art/weapons/soul_eater_icon.png');
    this.load.image('spinach_icon', 'assets/art/passives/spinach_icon.png');
    this.load.image('empty_tome_icon', 'assets/art/passives/empty_tome_icon.png');
    this.load.image('bracer_icon', 'assets/art/passives/bracer_icon.png');
    this.load.image('clover_icon', 'assets/art/passives/clover_icon.png');
    this.load.image('pummarola_icon', 'assets/art/passives/pummarola_icon.png');
    this.load.image('art_ui_title_bg', 'assets/art/ui/panel_bg.png');
    this.load.image('art_ui_result_bg', 'assets/art/ui/panel_bg.png');
    this.load.image('art_ui_pause_panel_bg', 'assets/art/ui/panel_bg.png');
    this.load.image('art_ui_hud_panel_bg', 'assets/art/ui/panel_bg.png');
    this.load.image('art_ui_help_panel_bg', 'assets/art/ui/panel_bg.png');
    this.load.image('art_ui_levelup_panel_bg', 'assets/art/ui/panel_bg.png');
    this.loadArtManifestAssetFiles(ART_MANIFEST_ASSETS);
    this.loadArtManifestAssets();
    this.loadExternalArtManifest();
    for (const asset of AUDIO_ASSETS) {
      this.load.audio(asset.key, asset.path);
    }
  }

  create(): void {
    ExternalArtRegistry.loadManifest(this);
    this.createArtManifestAnimations();
    this.createPlayerDirectionAnimations();
    this.createExternalArtAnimations();
    this.logTextureStatus();
    this.logCriticalPlayerSkinTextureStatus();
    this.logAudioStatus();
    this.scene.start('TitleScene');
  }

  private loadArtManifestAssets(): void {
    this.load.once(`filecomplete-json-${ART_MANIFEST_CACHE_KEY}`, () => {
      const manifestAssets = this.getLoadedArtManifestAssets();
      this.artManifestAssets = this.mergeArtManifestAssets(manifestAssets);
      this.loadArtManifestAssetFiles(manifestAssets);
    });
    this.load.once('loaderror', (file: { key?: string }) => {
      if (file.key !== ART_MANIFEST_CACHE_KEY) {
        return;
      }

      console.warn('[art] No animation manifest found; using built-in art manifest fallback.');
      this.artManifestAssets = ART_MANIFEST_ASSETS;
    });
    this.load.json(ART_MANIFEST_CACHE_KEY, this.getArtManifestPath());
  }

  private loadArtManifestAssetFiles(assets: readonly ArtManifestAsset[]): void {
    for (const asset of assets) {
      if (this.queuedArtAssetKeys.has(asset.key)) {
        continue;
      }

      this.queuedArtAssetKeys.add(asset.key);
      const path = this.getArtAssetPath(asset.path);

      if (asset.type === 'spritesheet') {
        this.load.spritesheet(asset.key, path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
          endFrame: asset.frames - 1,
        });
        continue;
      }

      this.load.image(asset.key, path);
    }
  }

  private registerCriticalArtAssetDiagnostics(assets: readonly ArtManifestAsset[]): void {
    const criticalKeys = new Set(assets.map((asset) => asset.key));

    for (const asset of assets) {
      this.load.once(`filecomplete-${asset.type}-${asset.key}`, () => {
        this.loadedCriticalArtAssetKeys.add(asset.key);
      });
    }

    this.load.on('loaderror', (file: LoaderFileInfo) => {
      const key = file.key;
      if (!key || !criticalKeys.has(key)) {
        return;
      }

      const asset = assets.find((candidate) => candidate.key === key);
      const requestedUrl = PreloadScene.getLoaderFileUrl(file)
        ?? (asset ? this.getArtAssetPath(asset.path) : 'unknown');

      console.warn(
        `[art] Critical art asset failed to load: key=${key} type=${file.type ?? asset?.type ?? 'unknown'} url=${requestedUrl}`,
      );
    });
  }

  private static getLoaderFileUrl(file: LoaderFileInfo): string | null {
    if (typeof file.url === 'string') {
      return file.url;
    }

    if (typeof file.src === 'string') {
      return file.src;
    }

    return null;
  }

  private getLoadedArtManifestAssets(): ArtManifestAsset[] {
    const manifest = this.cache.json.get(ART_MANIFEST_CACHE_KEY) as ArtManifest | undefined;

    if (!manifest || !Array.isArray(manifest.assets)) {
      console.warn('[art] Invalid animation manifest; using built-in art manifest fallback.');
      this.artManifestVersion = 'fallback';
      return [];
    }

    this.artManifestVersion = typeof (manifest as { version?: unknown }).version === 'string'
      ? (manifest as { version: string }).version
      : 'manifest';

    const assets = manifest.assets.filter((asset): asset is ArtManifestAsset => (
      typeof asset === 'object'
      && asset !== null
      && typeof (asset as ArtManifestAsset).path === 'string'
      && typeof (asset as ArtManifestAsset).key === 'string'
      && ((asset as ArtManifestAsset).type === 'image' || (asset as ArtManifestAsset).type === 'spritesheet')
      && typeof (asset as ArtManifestAsset).frameWidth === 'number'
      && typeof (asset as ArtManifestAsset).frameHeight === 'number'
      && typeof (asset as ArtManifestAsset).frames === 'number'
    ));

    if (assets.length === 0) {
      console.warn('[art] Animation manifest had no valid assets; using built-in art manifest fallback.');
    }

    return assets;
  }

  private mergeArtManifestAssets(assets: readonly ArtManifestAsset[]): ArtManifestAsset[] {
    const merged = new Map<string, ArtManifestAsset>();

    for (const asset of ART_MANIFEST_ASSETS) {
      merged.set(asset.key, asset);
    }

    for (const asset of assets) {
      merged.set(asset.key, asset);
    }

    return Array.from(merged.values());
  }

  private getArtManifestPath(): string {
    return resolveArtManifestPath(VisualSettings.getAssetStyle());
  }

  private getArtAssetPath(path: string): string {
    const cacheKey = encodeURIComponent(this.artManifestVersion);

    return `${this.artStyleRoot}${path}?v=${cacheKey}`;
  }

  private loadExternalArtManifest(): void {
    ExternalArtRegistry.clear();

    this.load.once(`filecomplete-json-${EXTERNAL_ART_MANIFEST_CACHE_KEY}`, () => {
      ExternalArtRegistry.loadManifest(this);
      this.loadExternalArtAssets();
    });
    this.load.once('loaderror', (file: { key?: string }) => {
      if (file.key === EXTERNAL_ART_MANIFEST_CACHE_KEY) {
        console.warn('[external-art] No external art manifest found; using built-in assets.');
      }
    });
    this.load.json(EXTERNAL_ART_MANIFEST_CACHE_KEY, EXTERNAL_ART_MANIFEST_PATH);
  }

  private loadExternalArtAssets(): void {
    for (const asset of ExternalArtRegistry.getAssets()) {
      const path = this.getExternalAssetPath(asset);

      if (asset.type === 'spritesheet') {
        if (!asset.frameWidth || !asset.frameHeight) {
          console.warn(`[external-art] Skipping spritesheet without frame size: ${asset.id}`);
          continue;
        }

        this.load.spritesheet(asset.textureKey, path, {
          frameWidth: asset.frameWidth,
          frameHeight: asset.frameHeight,
          endFrame: asset.frameCount ? asset.frameCount - 1 : undefined,
        });
        continue;
      }

      this.load.image(asset.textureKey, path);
    }
  }

  private getExternalAssetPath(asset: ExternalArtAsset): string {
    const manifest = ExternalArtRegistry.loadManifest(this);
    const basePath = manifest?.basePath || 'assets/imports';

    return `${basePath.replace(/\/$/, '')}/${asset.path}`;
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

  private createArtManifestAnimations(): void {
    for (const asset of this.artManifestAssets) {
      if (asset.type !== 'spritesheet' || !this.textures.exists(asset.key)) {
        continue;
      }

      for (const animationKey of this.getAnimationKeys(asset.key)) {
        if (this.anims.exists(animationKey)) {
          continue;
        }

        this.anims.create({
          key: animationKey,
          frames: this.anims.generateFrameNumbers(asset.key, {
            start: 0,
            end: asset.frames - 1,
          }),
          frameRate: 8,
          repeat: -1,
        });
      }
    }
  }

  private createPlayerDirectionAnimations(): void {
    const directions = [
      'down',
      'up',
      'left',
      'right',
      'down_left',
      'down_right',
      'up_left',
      'up_right',
    ];

    this.createPlayerDirectionAnimationSet('art_player_player_walk_sheet', 'art_player', directions);

    for (const skinId of PLAYER_ART_SKIN_IDS) {
      this.createPlayerAnimationAlias(
        `art_player_${skinId}_walk`,
        `art_player_${skinId}_walk_sheet`,
        0,
        3,
        -1,
      );
      this.createPlayerAnimationAlias(
        `art_player_${skinId}_idle`,
        `art_player_${skinId}_walk_sheet`,
        0,
        0,
        0,
      );
    }

    for (const skinId of PLAYER_ART_SKIN_IDS) {
      for (const direction of PLAYER_ART_DIRECTIONS) {
        this.createPlayerAnimationAlias(
          `art_player_${skinId}_walk_${direction}`,
          `art_player_${skinId}_walk_${direction}`,
          0,
          3,
          -1,
        );
        this.createPlayerAnimationAlias(
          `art_player_${skinId}_idle_${direction}`,
          `art_player_${skinId}_idle_${direction}`,
          0,
          3,
          -1,
        );
      }
    }
  }

  private createPlayerDirectionAnimationSet(
    textureKey: string,
    animationPrefix: string,
    directions: readonly string[],
  ): void {
    if (!this.textures.exists(textureKey)) {
      return;
    }

    this.createPlayerAnimationAlias(`${animationPrefix}_walk`, textureKey, 0, 3, -1);
    this.createPlayerAnimationAlias(`${animationPrefix}_idle`, textureKey, 0, 0, 0);

    for (const direction of directions) {
      this.createPlayerAnimationAlias(`${animationPrefix}_walk_${direction}`, textureKey, 0, 3, -1);
      this.createPlayerAnimationAlias(`${animationPrefix}_idle_${direction}`, textureKey, 0, 0, 0);
    }
  }

  private createPlayerAnimationAlias(
    animationKey: string,
    textureKey: string,
    start: number,
    end: number,
    repeat: number,
  ): void {
    if (!this.textures.exists(textureKey)) {
      return;
    }

    if (this.anims.exists(animationKey)) {
      this.anims.remove(animationKey);
    }

    const availableEndFrame = this.getAvailableAnimationEndFrame(textureKey, start, end);

    if (availableEndFrame === null) {
      console.warn(`[preload] Missing frames for ${textureKey}: ${start}..${end}`);
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

  private logTextureStatus(): void {
    const textureKeys = [
      ...AssetKeyResolver.getTextureStatusKeys(),
      'hp_icon',
      'exp_icon',
      'time_icon',
      'art_ui_title_bg',
      'art_ui_result_bg',
      'art_ui_pause_panel_bg',
      'art_ui_hud_panel_bg',
      'art_ui_help_panel_bg',
      'art_ui_levelup_panel_bg',
      ...this.artManifestAssets.map((asset) => asset.key),
      ...ExternalArtRegistry.getAssets().map((asset) => asset.textureKey),
    ];

    for (const textureKey of textureKeys) {
      if (this.textures.exists(textureKey)) {
        console.log(`Texture loaded: ${textureKey}`);
        continue;
      }

      console.warn(`Texture not loaded: ${textureKey}`);
    }
  }

  private logCriticalPlayerSkinTextureStatus(): void {
    const textureKeys = [
      'art_world_graveyard_ground_tile',
      'art_world_swamp_ground_tile',
      'art_world_ruins_ground_tile',
      ...PLAYER_ART_SKIN_IDS.map((skinId) => `art_player_${skinId}_idle_down`),
      ...PLAYER_ART_SKIN_IDS.map((skinId) => `art_player_${skinId}_walk_sheet`),
    ];

    for (const textureKey of textureKeys) {
      if (this.textures.exists(textureKey)) {
        continue;
      }

      const loaderState = this.loadedCriticalArtAssetKeys.has(textureKey)
        ? 'loader-complete'
        : 'loader-not-complete';
      console.warn(`[art] Critical texture not loaded: ${textureKey} (${loaderState})`);
    }
  }

  private getAnimationKeys(textureKey: string): string[] {
    return [
      this.getUnifiedAnimationKey(textureKey),
      `${textureKey}_anim`,
    ].filter((animationKey, index, animationKeys) => (
      animationKeys.indexOf(animationKey) === index
    ));
  }

  private getUnifiedAnimationKey(textureKey: string): string {
    switch (textureKey) {
      case 'art_player_player_walk_sheet':
        return 'art_player_walk';
      case 'art_enemies_slime_walk_sheet':
        return 'art_slime_walk';
      case 'art_enemies_bat_fly_sheet':
        return 'art_bat_fly';
      case 'art_enemies_golem_walk_sheet':
        return 'art_golem_walk';
      case 'art_enemies_boss_lava_beast_idle_sheet':
        return 'art_boss_lava_beast_idle';
      case 'art_weapons_knife_projectile_sheet':
        return 'art_knife_projectile_spin';
      case 'art_weapons_axe_projectile_sheet':
        return 'art_axe_projectile_spin';
      case 'art_weapons_death_spiral_projectile_sheet':
        return 'art_death_spiral_projectile_spin';
      case 'art_weapons_magic_wand_projectile_sheet':
        return 'art_magic_wand_projectile';
      case 'art_weapons_holy_wand_projectile_sheet':
        return 'art_holy_wand_projectile';
      case 'art_weapons_thousand_edge_projectile_sheet':
        return 'art_thousand_edge_projectile_spin';
      case 'art_weapons_bible_orbit_book_sheet':
        return 'art_bible_orbit_book_spin';
      case 'art_weapons_unholy_vespers_orbit_book_sheet':
        return 'art_unholy_vespers_orbit_book_spin';
      case 'art_weapons_garlic_core_sheet':
        return 'art_garlic_core';
      case 'art_weapons_soul_eater_core_sheet':
        return 'art_soul_eater_core';
      case 'art_effects_hit_flash_sheet':
        return 'art_hit_flash';
      case 'art_effects_boss_dash_impact_sheet':
        return 'art_boss_dash_impact';
      case 'art_effects_level_up_glow_sheet':
        return 'art_level_up_glow';
      default:
        return `${textureKey}_anim`;
    }
  }

  private logAudioStatus(): void {
    for (const audioKey of AudioManager.getSupportedKeys()) {
      if (this.cache.audio.exists(audioKey)) {
        console.log(`Audio loaded: ${audioKey}`);
        continue;
      }

      console.warn(`Audio not loaded: ${audioKey}`);
    }
  }
}
