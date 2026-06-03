import Phaser from 'phaser';

import { AudioManager } from '../audio/AudioManager';

type ArtManifestAsset = {
  path: string;
  key: string;
  type: 'image' | 'spritesheet';
  frameWidth: number;
  frameHeight: number;
  frames: number;
};

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
  { path: 'player/player_walk_sheet.png', key: 'art_player_player_walk_sheet', type: 'spritesheet', frameWidth: 64, frameHeight: 64, frames: 4 },
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
    this.createArtManifestAnimations();
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

  private logTextureStatus(): void {
    const textureKeys = [
      'player',
      'slime',
      'bat',
      'golem',
      'slime_boss',
      'bat_boss',
      'golem_boss',
      'exp_gem',
      'knife_projectile',
      'hit_flash',
      'bible_orbit_projectile',
      'axe_projectile',
      'magic_wand_projectile',
      'treasure_chest',
      'boss_lava_beast',
      'thousand_edge_projectile',
      'holy_wand_projectile',
      'death_spiral_projectile',
      'unholy_vespers_orbit_book',
      'soul_eater_core',
      'hp_icon',
      'exp_icon',
      'time_icon',
      'knife_icon',
      'garlic_icon',
      'bible_icon',
      'axe_icon',
      'magic_wand_icon',
      'thousand_edge_icon',
      'holy_wand_icon',
      'death_spiral_icon',
      'unholy_vespers_icon',
      'soul_eater_icon',
      'spinach_icon',
      'empty_tome_icon',
      'bracer_icon',
      'clover_icon',
      'pummarola_icon',
      'art_ui_title_bg',
      'art_ui_result_bg',
      'art_ui_pause_panel_bg',
      'art_ui_hud_panel_bg',
      'art_ui_help_panel_bg',
      'art_ui_levelup_panel_bg',
      ...ART_MANIFEST_ASSETS.map((asset) => asset.key),
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
