import Phaser from 'phaser';

import { AssetKeyResolver } from '../assets/AssetKeyResolver';
import {
  EXTERNAL_ART_MANIFEST_CACHE_KEY,
  EXTERNAL_ART_MANIFEST_PATH,
  ExternalArtAsset,
} from '../assets/ExternalArtManifest';
import { ExternalArtRegistry } from '../assets/ExternalArtRegistry';
import { AudioManager } from '../audio/AudioManager';

type ArtManifestAsset = {
  path: string;
  key: string;
  type: 'image' | 'spritesheet';
  frameWidth: number;
  frameHeight: number;
  frames: number;
};

const PLAYER_ART_SKIN_IDS = [
  'assassin_default',
  'witch_default',
  'priest_default',
  'warrior_default',
] as const;

const PLAYER_ART_DIRECTIONS = [
  'up',
  'up_right',
  'right',
  'down_right',
  'down',
  'down_left',
  'left',
  'up_left',
] as const;

const PLAYER_CHARACTER_ANIMATION_ASSETS: ArtManifestAsset[] = PLAYER_ART_SKIN_IDS.flatMap(
  (skinId) => ['walk', 'idle'].flatMap((state) => PLAYER_ART_DIRECTIONS.map((direction) => ({
    path: `player/${skinId}/${state}_${direction}.png`,
    key: `art_player_${skinId}_${state}_${direction}`,
    type: 'spritesheet' as const,
    frameWidth: 64,
    frameHeight: 64,
    frames: 4,
  }))),
);

const PLAYER_CHARACTER_IMAGE_ASSETS: ArtManifestAsset[] = [
  ...PLAYER_ART_SKIN_IDS.flatMap((skinId) => [
    {
      path: `player/${skinId}/portrait.png`,
      key: `art_player_${skinId}_portrait`,
      type: 'image' as const,
      frameWidth: 128,
      frameHeight: 128,
      frames: 1,
    },
    {
      path: `player/${skinId}/hit_fx.png`,
      key: `art_player_${skinId}_hit_fx`,
      type: 'image' as const,
      frameWidth: 96,
      frameHeight: 96,
      frames: 1,
    },
  ]),
  { path: 'player/assassin_default/blink_trail.png', key: 'art_player_assassin_default_blink_trail', type: 'image' as const, frameWidth: 128, frameHeight: 64, frames: 1 },
  { path: 'player/assassin_default/blink_flash.png', key: 'art_player_assassin_default_blink_flash', type: 'image' as const, frameWidth: 96, frameHeight: 96, frames: 1 },
  { path: 'player/witch_default/slow_zone.png', key: 'art_player_witch_default_slow_zone', type: 'image' as const, frameWidth: 192, frameHeight: 192, frames: 1 },
  { path: 'player/priest_default/sanctuary_circle.png', key: 'art_player_priest_default_sanctuary_circle', type: 'image' as const, frameWidth: 224, frameHeight: 224, frames: 1 },
  { path: 'player/warrior_default/counter_wave.png', key: 'art_player_warrior_default_counter_wave', type: 'image' as const, frameWidth: 192, frameHeight: 192, frames: 1 },
];

const ART_MANIFEST_ASSETS: ArtManifestAsset[] = [
  { path: 'effects/boss_dash_impact_sheet.png', key: 'art_effects_boss_dash_impact_sheet', type: 'spritesheet', frameWidth: 128, frameHeight: 128, frames: 4 },
  { path: 'effects/boss_dash_warning.png', key: 'art_effects_boss_dash_warning', type: 'image', frameWidth: 256, frameHeight: 64, frames: 1 },
  { path: 'effects/hit_flash_sheet.png', key: 'art_effects_hit_flash_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'effects/level_up_glow_sheet.png', key: 'art_effects_level_up_glow_sheet', type: 'spritesheet', frameWidth: 128, frameHeight: 128, frames: 4 },
  { path: 'enemies/bat_boss_placeholder.png', key: 'art_enemies_bat_boss_placeholder', type: 'image', frameWidth: 96, frameHeight: 96, frames: 1 },
  { path: 'enemies/bat_fly_sheet.png', key: 'art_enemies_bat_fly_sheet', type: 'spritesheet', frameWidth: 48, frameHeight: 48, frames: 4 },
  { path: 'enemies/boss_lava_beast_idle_sheet.png', key: 'art_enemies_boss_lava_beast_idle_sheet', type: 'spritesheet', frameWidth: 192, frameHeight: 192, frames: 4 },
  { path: 'enemies/golem_boss_placeholder.png', key: 'art_enemies_golem_boss_placeholder', type: 'image', frameWidth: 96, frameHeight: 96, frames: 1 },
  { path: 'enemies/golem_walk_sheet.png', key: 'art_enemies_golem_walk_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'enemies/slime_boss_placeholder.png', key: 'art_enemies_slime_boss_placeholder', type: 'image', frameWidth: 96, frameHeight: 96, frames: 1 },
  { path: 'enemies/slime_walk_sheet.png', key: 'art_enemies_slime_walk_sheet', type: 'spritesheet', frameWidth: 48, frameHeight: 48, frames: 4 },
  { path: 'passives/bracer_icon.png', key: 'art_passives_bracer_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'passives/clover_icon.png', key: 'art_passives_clover_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'passives/empty_tome_icon.png', key: 'art_passives_empty_tome_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'passives/pummarola_icon.png', key: 'art_passives_pummarola_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'passives/spinach_icon.png', key: 'art_passives_spinach_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'pickups/exp_gem.png', key: 'art_pickups_exp_gem', type: 'image', frameWidth: 32, frameHeight: 32, frames: 1 },
  { path: 'pickups/treasure_chest.png', key: 'art_pickups_treasure_chest', type: 'image', frameWidth: 64, frameHeight: 56, frames: 1 },
  { path: 'player/assassin_default_walk_sheet.png', key: 'art_player_assassin_default_walk_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'player/player_walk_sheet.png', key: 'art_player_player_walk_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'player/priest_default_walk_sheet.png', key: 'art_player_priest_default_walk_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'player/warrior_default_walk_sheet.png', key: 'art_player_warrior_default_walk_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'player/witch_default_walk_sheet.png', key: 'art_player_witch_default_walk_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  ...PLAYER_CHARACTER_ANIMATION_ASSETS,
  ...PLAYER_CHARACTER_IMAGE_ASSETS,
  { path: 'ui/exp_icon.png', key: 'art_ui_exp_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'ui/hp_icon.png', key: 'art_ui_hp_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'ui/panel_bg.png', key: 'art_ui_panel_bg', type: 'image', frameWidth: 256, frameHeight: 128, frames: 1 },
  { path: 'ui/passive_frame.png', key: 'art_ui_passive_frame', type: 'image', frameWidth: 80, frameHeight: 80, frames: 1 },
  { path: 'ui/time_icon.png', key: 'art_ui_time_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'ui/weapon_frame.png', key: 'art_ui_weapon_frame', type: 'image', frameWidth: 80, frameHeight: 80, frames: 1 },
  { path: 'weapons/axe_icon.png', key: 'art_weapons_axe_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'weapons/axe_projectile_sheet.png', key: 'art_weapons_axe_projectile_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'weapons/bible_orbit_book_sheet.png', key: 'art_weapons_bible_orbit_book_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'weapons/death_spiral_icon.png', key: 'art_weapons_death_spiral_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'weapons/death_spiral_projectile_sheet.png', key: 'art_weapons_death_spiral_projectile_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'weapons/garlic_core_sheet.png', key: 'art_weapons_garlic_core_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'weapons/holy_wand_icon.png', key: 'art_weapons_holy_wand_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'weapons/holy_wand_projectile_sheet.png', key: 'art_weapons_holy_wand_projectile_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'weapons/knife_projectile_sheet.png', key: 'art_weapons_knife_projectile_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'weapons/magic_wand_icon.png', key: 'art_weapons_magic_wand_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'weapons/magic_wand_projectile_sheet.png', key: 'art_weapons_magic_wand_projectile_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'weapons/soul_eater_core_sheet.png', key: 'art_weapons_soul_eater_core_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'weapons/soul_eater_icon.png', key: 'art_weapons_soul_eater_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'weapons/thousand_edge_icon.png', key: 'art_weapons_thousand_edge_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'weapons/thousand_edge_projectile_sheet.png', key: 'art_weapons_thousand_edge_projectile_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'weapons/unholy_vespers_icon.png', key: 'art_weapons_unholy_vespers_icon', type: 'image', frameWidth: 64, frameHeight: 64, frames: 1 },
  { path: 'weapons/unholy_vespers_orbit_book_sheet.png', key: 'art_weapons_unholy_vespers_orbit_book_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
  { path: 'world/grass_tile.png', key: 'art_world_grass_tile', type: 'image', frameWidth: 128, frameHeight: 128, frames: 1 },
  { path: 'world/grave_landmark.png', key: 'art_world_grave_landmark', type: 'image', frameWidth: 96, frameHeight: 96, frames: 1 },
  { path: 'world/ground_tile.png', key: 'art_world_ground_tile', type: 'image', frameWidth: 128, frameHeight: 128, frames: 1 },
  { path: 'world/rock_landmark.png', key: 'art_world_rock_landmark', type: 'image', frameWidth: 96, frameHeight: 96, frames: 1 },
  { path: 'world/tree_landmark.png', key: 'art_world_tree_landmark', type: 'image', frameWidth: 96, frameHeight: 96, frames: 1 },
];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
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
    this.loadArtManifestAssets();
    this.loadExternalArtManifest();
    this.load.audio('enemy_hit', 'assets/audio/enemy_hit.wav');
    this.load.audio('enemy_killed', 'assets/audio/enemy_killed.wav');
    this.load.audio('player_hit', 'assets/audio/player_hit.wav');
    this.load.audio('level_up', 'assets/audio/level_up.wav');
    this.load.audio('upgrade_selected', 'assets/audio/upgrade_selected.wav');
    this.load.audio('treasure_open', 'assets/audio/treasure_open.wav');
    this.load.audio('boss_spawn', 'assets/audio/boss_spawn.wav');
    this.load.audio('boss_dash', 'assets/audio/boss_dash.wav');
    this.load.audio('victory', 'assets/audio/victory.wav');
    this.load.audio('game_over', 'assets/audio/game_over.wav');
    this.load.audio('ui_click', 'assets/audio/ui_click.wav');
    this.load.audio('title_bgm', 'assets/audio/bgm/title_bgm.wav');
    this.load.audio('gameplay_bgm', 'assets/audio/bgm/gameplay_bgm.wav');
    this.load.audio('boss_bgm', 'assets/audio/bgm/boss_bgm.wav');
    this.load.audio('result_bgm', 'assets/audio/bgm/result_bgm.wav');
    this.load.audio('knife_attack', 'assets/audio/weapon/knife_attack.wav');
    this.load.audio('axe_throw', 'assets/audio/weapon/axe_throw.wav');
    this.load.audio('magic_wand_shot', 'assets/audio/weapon/magic_wand_shot.wav');
    this.load.audio('bible_orbit_hit', 'assets/audio/weapon/bible_orbit_hit.wav');
    this.load.audio('garlic_aura_tick', 'assets/audio/weapon/garlic_aura_tick.wav');
    this.load.audio('thousand_edge_attack', 'assets/audio/weapon/thousand_edge_attack.wav');
    this.load.audio('holy_wand_shot', 'assets/audio/weapon/holy_wand_shot.wav');
    this.load.audio('death_spiral_throw', 'assets/audio/weapon/death_spiral_throw.wav');
    this.load.audio('unholy_vespers_hit', 'assets/audio/weapon/unholy_vespers_hit.wav');
    this.load.audio('soul_eater_tick', 'assets/audio/weapon/soul_eater_tick.wav');
    this.load.audio('ui_hover', 'assets/audio/ui/ui_hover.wav');
    this.load.audio('ui_back', 'assets/audio/ui/ui_back.wav');
    this.load.audio('ui_confirm', 'assets/audio/ui/ui_confirm.wav');
  }

  create(): void {
    ExternalArtRegistry.loadManifest(this);
    this.createArtManifestAnimations();
    this.createPlayerDirectionAnimations();
    this.createExternalArtAnimations();
    this.logTextureStatus();
    this.logAudioStatus();
    this.scene.start('TitleScene');
  }

  private loadArtManifestAssets(): void {
    for (const asset of ART_MANIFEST_ASSETS) {
      const path = `assets/art/${asset.path}`;

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

  private createArtManifestAnimations(): void {
    for (const asset of ART_MANIFEST_ASSETS) {
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
    if (this.anims.exists(animationKey) || !this.textures.exists(textureKey)) {
      return;
    }

    this.anims.create({
      key: animationKey,
      frames: this.anims.generateFrameNumbers(textureKey, { start, end }),
      frameRate: 8,
      repeat,
    });
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
      ...ART_MANIFEST_ASSETS.map((asset) => asset.key),
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
