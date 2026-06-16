import { DisplaySettingsData } from '../settings/DisplaySettings';
import { MapMechanicIconKind, MapMechanicVisualKind } from './AssetKeyMap';
import {
  EXTERNAL_ART_MANIFEST_CACHE_KEY,
  EXTERNAL_ART_MANIFEST_PATH,
  ExternalArtAsset,
  ExternalArtManifest,
} from './ExternalArtManifest';
import { ExternalArtRegistry } from './ExternalArtRegistry';
import { AssetLoadPlan, AssetRequest } from './AssetLoadPlan';
import { RunRequiredAssetKeys, buildRunRequiredAssetKeys } from './RunRequiredAssetKeys';

export type ArtManifestAsset = {
  path: string;
  key: string;
  type: 'image' | 'spritesheet';
  frameWidth: number;
  frameHeight: number;
  frames: number;
};

export type ArtManifest = {
  assets?: unknown;
  version?: unknown;
};

export type RunPreloadContext = {
  selectedCharacterId: string;
  characterId: string;
  selectedStageId: string;
  stageId: string;
  mapId: string;
  difficultyId?: string;
  mutatorIds?: string[];
  assetStyle: DisplaySettingsData['assetStyle'];
  displayQuality: DisplaySettingsData['displayQuality'];
  skinId?: string;
  endlessMode?: boolean;
  startingWeaponId?: string;
  finalBossId?: string;
  waveEnemyIds?: string[];
  groundTileKey?: string;
  landmarkTypes?: string[];
  mapMechanicVisualKinds?: MapMechanicVisualKind[];
  mapMechanicMinimapIconKinds?: MapMechanicIconKind[];
  audioEnabled?: boolean;
  minimapScale?: number;
};

export const ART_MANIFEST_CACHE_KEY = 'art_animation_manifest';

export function resolveArtStyleRoot(
  assetStyle: DisplaySettingsData['assetStyle'] = 'newArt',
): 'assets/art/' | 'assets/art001/' {
  return assetStyle === 'art001'
    ? 'assets/art001/'
    : 'assets/art/';
}

export function resolveArtManifestPath(
  assetStyle: DisplaySettingsData['assetStyle'] = 'newArt',
): string {
  return `${resolveArtStyleRoot(assetStyle)}animation_manifest.json`;
}

export function remapAssetStylePath(
  requestPath: string,
  assetStyle: DisplaySettingsData['assetStyle'] = 'newArt',
): string {
  if (!requestPath.startsWith('assets/art/')) {
    return requestPath;
  }

  const root = resolveArtStyleRoot(assetStyle);
  return `${root}${requestPath.slice('assets/art/'.length)}`;
}

export const PLAYER_ART_SKIN_IDS = [
  'assassin_default',
  'witch_default',
  'priest_default',
  'warrior_default',
  'arcanist_default',
  'ranger_default',
  'engineer_default',
  'necromancer_default',
  'monk_default',
  'alchemist_default',
  'duelist_default',
  'geomancer_default',
  'stormcaller_default',
  'sentinel_default',
] as const;

export const PLAYER_ART_DIRECTIONS = [
  'up',
  'up_right',
  'right',
  'down_right',
  'down',
  'down_left',
  'left',
  'up_left',
] as const;

export type PlayerArtSkinId = typeof PLAYER_ART_SKIN_IDS[number];

const TITLE_UI_ASSETS: AssetRequest[] = [
  image('art_ui_title_bg', 'assets/art/ui/panel_bg.png'),
  image('art_ui_result_bg', 'assets/art/ui/panel_bg.png'),
  image('art_ui_pause_panel_bg', 'assets/art/ui/panel_bg.png'),
  image('art_ui_hud_panel_bg', 'assets/art/ui/panel_bg.png'),
  image('art_ui_help_panel_bg', 'assets/art/ui/panel_bg.png'),
  image('art_ui_levelup_panel_bg', 'assets/art/ui/panel_bg.png'),
  image('art_ui_panel_bg', 'assets/art/ui/panel_bg.png'),
  image('art_ui_exp_icon', 'assets/art/ui/exp_icon.png'),
  image('art_ui_hp_icon', 'assets/art/ui/hp_icon.png'),
  image('art_ui_time_icon', 'assets/art/ui/time_icon.png'),
  image('art_ui_passive_frame', 'assets/art/ui/passive_frame.png'),
  image('art_ui_weapon_frame', 'assets/art/ui/weapon_frame.png'),
  image('hp_icon', 'assets/art/ui/hp_icon.png'),
  image('exp_icon', 'assets/art/ui/exp_icon.png'),
  image('time_icon', 'assets/art/ui/time_icon.png'),
];

const TITLE_ICON_ASSETS: AssetRequest[] = [
  image('knife_icon', 'assets/weapons/knife_icon.png'),
  image('garlic_icon', 'assets/weapons/garlic_icon.png'),
  image('bible_icon', 'assets/weapons/bible_icon.png'),
  image('axe_icon', 'assets/art/weapons/axe_icon.png'),
  image('magic_wand_icon', 'assets/art/weapons/magic_wand_icon.png'),
  image('thousand_edge_icon', 'assets/art/weapons/thousand_edge_icon.png'),
  image('holy_wand_icon', 'assets/art/weapons/holy_wand_icon.png'),
  image('death_spiral_icon', 'assets/art/weapons/death_spiral_icon.png'),
  image('unholy_vespers_icon', 'assets/art/weapons/unholy_vespers_icon.png'),
  image('soul_eater_icon', 'assets/art/weapons/soul_eater_icon.png'),
  image('art_weapons_axe_icon', 'assets/art/weapons/axe_icon.png'),
  image('art_weapons_magic_wand_icon', 'assets/art/weapons/magic_wand_icon.png'),
  image('art_weapons_thousand_edge_icon', 'assets/art/weapons/thousand_edge_icon.png'),
  image('art_weapons_holy_wand_icon', 'assets/art/weapons/holy_wand_icon.png'),
  image('art_weapons_death_spiral_icon', 'assets/art/weapons/death_spiral_icon.png'),
  image('art_weapons_unholy_vespers_icon', 'assets/art/weapons/unholy_vespers_icon.png'),
  image('art_weapons_soul_eater_icon', 'assets/art/weapons/soul_eater_icon.png'),
  image('spinach_icon', 'assets/art/passives/spinach_icon.png'),
  image('empty_tome_icon', 'assets/art/passives/empty_tome_icon.png'),
  image('bracer_icon', 'assets/art/passives/bracer_icon.png'),
  image('clover_icon', 'assets/art/passives/clover_icon.png'),
  image('pummarola_icon', 'assets/art/passives/pummarola_icon.png'),
  image('art_passives_spinach_icon', 'assets/art/passives/spinach_icon.png'),
  image('art_passives_empty_tome_icon', 'assets/art/passives/empty_tome_icon.png'),
  image('art_passives_bracer_icon', 'assets/art/passives/bracer_icon.png'),
  image('art_passives_clover_icon', 'assets/art/passives/clover_icon.png'),
  image('art_passives_pummarola_icon', 'assets/art/passives/pummarola_icon.png'),
  ...createAdditionalTitleIconAssets(),
];

const TITLE_AUDIO_ASSETS: AssetRequest[] = [
  audio('ui_click', 'assets/audio/ui_click.wav'),
  audio('ui_hover', 'assets/audio/ui/ui_hover.wav'),
  audio('ui_back', 'assets/audio/ui/ui_back.wav'),
  audio('ui_confirm', 'assets/audio/ui/ui_confirm.wav'),
  audio('title_bgm', 'assets/audio/bgm/title_bgm.wav'),
];

const LEGACY_GAMEPLAY_ASSETS: AssetRequest[] = [
  image('player', 'assets/player/player_placeholder.png'),
  image('slime', 'assets/enemy/slime_placeholder.png'),
  image('bat', 'assets/enemy/bat_placeholder.png'),
  image('golem', 'assets/enemy/golem_placeholder.png'),
  image('slime_boss', 'assets/art/enemies/slime_boss_placeholder.png'),
  image('bat_boss', 'assets/art/enemies/bat_boss_placeholder.png'),
  image('golem_boss', 'assets/art/enemies/golem_boss_placeholder.png'),
  image('exp_gem', 'assets/pickup/exp_gem_placeholder.png'),
  image('knife_projectile', 'assets/effects/knife_projectile.png'),
  image('hit_flash', 'assets/effects/hit_flash.png'),
  image('bible_orbit_projectile', 'assets/effects/bible_orbit_projectile.png'),
  image('axe_projectile', 'assets/images/axe_projectile.png'),
  image('magic_wand_projectile', 'assets/images/magic_wand_projectile.png'),
  image('treasure_chest', 'assets/images/treasure_chest.png'),
  image('boss_lava_beast', 'assets/images/boss_lava_beast.png'),
  image('thousand_edge_projectile', 'assets/images/thousand_edge_projectile.png'),
  image('holy_wand_projectile', 'assets/images/holy_wand_projectile.png'),
  image('death_spiral_projectile', 'assets/images/death_spiral_projectile.png'),
  image('unholy_vespers_orbit_book', 'assets/images/unholy_vespers_orbit_book.png'),
  image('soul_eater_core', 'assets/images/soul_eater_core.png'),
];

const GAMEPLAY_AUDIO_ASSETS: AssetRequest[] = [
  audio('enemy_hit', 'assets/audio/enemy_hit.wav'),
  audio('enemy_killed', 'assets/audio/enemy_killed.wav'),
  audio('player_hit', 'assets/audio/player_hit.wav'),
  audio('level_up', 'assets/audio/level_up.wav'),
  audio('upgrade_selected', 'assets/audio/upgrade_selected.wav'),
  audio('treasure_open', 'assets/audio/treasure_open.wav'),
  audio('boss_spawn', 'assets/audio/boss_spawn.wav'),
  audio('boss_dash', 'assets/audio/boss_dash.wav'),
  audio('victory', 'assets/audio/victory.wav'),
  audio('game_over', 'assets/audio/game_over.wav'),
  audio('gameplay_bgm', 'assets/audio/bgm/gameplay_bgm.wav'),
  audio('boss_bgm', 'assets/audio/bgm/boss_bgm.wav'),
  audio('result_bgm', 'assets/audio/bgm/result_bgm.wav'),
  audio('knife_attack', 'assets/audio/weapon/knife_attack.wav'),
  audio('axe_throw', 'assets/audio/weapon/axe_throw.wav'),
  audio('magic_wand_shot', 'assets/audio/weapon/magic_wand_shot.wav'),
  audio('bible_orbit_hit', 'assets/audio/weapon/bible_orbit_hit.wav'),
  audio('garlic_aura_tick', 'assets/audio/weapon/garlic_aura_tick.wav'),
  audio('thousand_edge_attack', 'assets/audio/weapon/thousand_edge_attack.wav'),
  audio('holy_wand_shot', 'assets/audio/weapon/holy_wand_shot.wav'),
  audio('death_spiral_throw', 'assets/audio/weapon/death_spiral_throw.wav'),
  audio('unholy_vespers_hit', 'assets/audio/weapon/unholy_vespers_hit.wav'),
  audio('soul_eater_tick', 'assets/audio/weapon/soul_eater_tick.wav'),
];

const TIERED_WEAPON_ART_IDS = [
  'knife',
  'garlic',
  'bible',
  'magic_wand',
  'axe',
  'thousand_edge',
  'unholy_vespers',
  'holy_wand',
  'death_spiral',
  'soul_eater',
  'runic_orb',
  'astral_core',
  'moon_bow',
  'eclipse_barrage',
  'clockwork_saw',
  'gearstorm',
  'bone_spear',
  'ossuary_lance',
  'spirit_fist',
  'enlightened_palm',
  'acid_vial',
  'plague_crucible',
  'rapier_flurry',
  'crimson_flurry',
  'stone_ring',
  'tectonic_crown',
  'thunder_javelin',
  'tempest_lance',
  'shield_disc',
  'aegis_maelstrom',
] as const;

const TIERED_PASSIVE_ART_IDS = [
  'spinach',
  'empty_tome',
  'bracer',
  'clover',
  'pummarola',
  'focus_lens',
  'hunter_quiver',
  'cogwheel',
  'grave_charm',
  'prayer_beads',
  'glass_flask',
  'duelist_glove',
  'granite_core',
  'storm_battery',
  'iron_sigil',
] as const;

const TIERED_WEAPON_ART_ASSETS: ArtManifestAsset[] = TIERED_WEAPON_ART_IDS.flatMap(
  (weaponId) => [1, 2, 3].flatMap((tier) => [
    artImage(`weapons/${weaponId}_icon_tier${tier}.png`, `art_weapons_${weaponId}_icon_tier${tier}`, 64, 64),
    artSheet(
      `weapons/${weaponId}_projectile_tier${tier}_sheet.png`,
      `art_weapons_${weaponId}_projectile_tier${tier}_sheet`,
      64,
      64,
      4,
    ),
  ]),
);

const TIERED_PASSIVE_ART_ASSETS: ArtManifestAsset[] = TIERED_PASSIVE_ART_IDS.flatMap(
  (passiveId) => [1, 2, 3].map((tier) => (
    artImage(`passives/${passiveId}_icon_tier${tier}.png`, `art_passives_${passiveId}_icon_tier${tier}`, 64, 64)
  )),
);

const RELIC_ART_IDS = [
  'blood_pact',
  'void_compass',
  'golden_scarab',
  'thorn_crown',
  'frozen_hourglass',
  'berserker_charm',
  'magnet_pearl',
  'iron_shell',
  'scholar_candle',
  'rift_coin',
] as const;

const RELIC_ART_ASSETS: ArtManifestAsset[] = RELIC_ART_IDS.map((relicId) => (
  artImage(`relics/${relicId}_icon.png`, `art_relics_${relicId}_icon`, 64, 64)
));

function createAdditionalTitleIconAssets(): AssetRequest[] {
  return [
    ...TIERED_WEAPON_ART_IDS.map((weaponId) => image(
      `art_weapons_${weaponId}_icon_tier1`,
      `assets/art/weapons/${weaponId}_icon_tier1.png`,
    )),
    ...TIERED_PASSIVE_ART_IDS.map((passiveId) => image(
      `art_passives_${passiveId}_icon_tier1`,
      `assets/art/passives/${passiveId}_icon_tier1.png`,
    )),
  ];
}

export const PLAYER_CHARACTER_IMAGE_ASSETS: ArtManifestAsset[] = [
  ...PLAYER_ART_SKIN_IDS.flatMap((skinId) => [
    artImage(`player/${skinId}/portrait.png`, `art_player_${skinId}_portrait`, 128, 128),
    artImage(`player/${skinId}/hit_fx.png`, `art_player_${skinId}_hit_fx`, 96, 96),
  ]),
  artImage('player/assassin_default/blink_trail.png', 'art_player_assassin_default_blink_trail', 128, 64),
  artImage('player/assassin_default/blink_flash.png', 'art_player_assassin_default_blink_flash', 96, 96),
  artImage('player/witch_default/slow_zone.png', 'art_player_witch_default_slow_zone', 192, 192),
  artImage('player/priest_default/sanctuary_circle.png', 'art_player_priest_default_sanctuary_circle', 224, 224),
  artImage('player/warrior_default/counter_wave.png', 'art_player_warrior_default_counter_wave', 192, 192),
];

export const MAP_MECHANIC_WORLD_ART_ASSETS: ArtManifestAsset[] = [
  artImage('map-mechanics/river/river_tile.png', 'art_map_mechanics_river_tile', 256, 256),
  artImage('map-mechanics/river/river_bank.png', 'art_map_mechanics_river_bank', 256, 256),
  artImage('map-mechanics/river/river_ripple.png', 'art_map_mechanics_river_ripple', 128, 64),
  artImage('map-mechanics/swamp/swamp_pool.png', 'art_map_mechanics_swamp_pool', 256, 256),
  artImage('map-mechanics/swamp/swamp_bubble.png', 'art_map_mechanics_swamp_bubble', 64, 64),
  artImage('map-mechanics/mud/mud_patch.png', 'art_map_mechanics_mud_patch', 256, 256),
  artImage('map-mechanics/mud/mud_spot.png', 'art_map_mechanics_mud_spot', 64, 64),
  artImage('map-mechanics/ink/ink_pool.png', 'art_map_mechanics_ink_pool', 256, 256),
  artImage('map-mechanics/ink/ink_spot.png', 'art_map_mechanics_ink_spot', 64, 64),
  artImage('map-mechanics/portal/portal_blue.png', 'art_map_mechanics_portal_blue', 128, 128),
  artImage('map-mechanics/portal/portal_purple.png', 'art_map_mechanics_portal_purple', 128, 128),
  artImage('map-mechanics/portal/portal_green.png', 'art_map_mechanics_portal_green', 128, 128),
  artImage('map-mechanics/portal/portal_gold.png', 'art_map_mechanics_portal_gold', 128, 128),
  artImage('map-mechanics/light/lamp.png', 'art_map_mechanics_light_lamp', 128, 128),
  artImage('map-mechanics/light/torch.png', 'art_map_mechanics_light_torch', 128, 128),
  artImage('map-mechanics/light/crystal.png', 'art_map_mechanics_light_crystal', 128, 128),
  artImage('map-mechanics/light/cathedral_candle.png', 'art_map_mechanics_light_cathedral_candle', 128, 128),
  artImage('map-mechanics/light/arcane_lamp.png', 'art_map_mechanics_light_arcane_lamp', 128, 128),
  artImage('map-mechanics/obstacle/obstacle_tree.png', 'art_map_mechanics_obstacle_tree', 128, 128),
  artImage('map-mechanics/obstacle/obstacle_rock.png', 'art_map_mechanics_obstacle_rock', 128, 128),
  artImage('map-mechanics/obstacle/obstacle_grave.png', 'art_map_mechanics_obstacle_grave', 128, 128),
  artImage('map-mechanics/obstacle/obstacle_wall.png', 'art_map_mechanics_obstacle_wall', 128, 128),
  artImage('map-mechanics/obstacle/cathedral_wall.png', 'art_map_mechanics_obstacle_cathedral_wall', 128, 128),
  artImage('map-mechanics/obstacle/cathedral_pillar.png', 'art_map_mechanics_obstacle_cathedral_pillar', 128, 128),
  artImage('map-mechanics/obstacle/bookshelf.png', 'art_map_mechanics_obstacle_bookshelf', 128, 128),
  artImage('map-mechanics/obstacle/archive_pillar.png', 'art_map_mechanics_obstacle_archive_pillar', 128, 128),
  artImage('map-mechanics/hazard/hazard_spike.png', 'art_map_mechanics_hazard_spike', 128, 128),
  artImage('map-mechanics/hazard/hazard_fire.png', 'art_map_mechanics_hazard_fire', 128, 128),
  artImage('map-mechanics/hazard/hazard_poison.png', 'art_map_mechanics_hazard_poison', 128, 128),
  artImage('map-mechanics/altar/altar_basic.png', 'art_map_mechanics_altar_basic', 128, 128),
  artImage('map-mechanics/altar/cathedral_altar.png', 'art_map_mechanics_altar_cathedral', 160, 160),
  artImage('map-mechanics/altar/library_altar.png', 'art_map_mechanics_altar_library', 160, 160),
  artImage('map-mechanics/spawner/spawner_nest.png', 'art_map_mechanics_spawner_nest', 128, 128),
];

export const MAP_MECHANIC_MINIMAP_ICON_ASSETS: ArtManifestAsset[] = [
  artImage('map-mechanics/river/river_minimap.png', 'art_map_mechanics_river_minimap', 32, 32),
  artImage('map-mechanics/swamp/swamp_minimap.png', 'art_map_mechanics_swamp_minimap', 32, 32),
  artImage('map-mechanics/mud/mud_minimap.png', 'art_map_mechanics_mud_minimap', 32, 32),
  artImage('map-mechanics/ink/ink_minimap.png', 'art_map_mechanics_ink_minimap', 32, 32),
  artImage('map-mechanics/portal/portal_minimap_blue.png', 'art_map_mechanics_portal_minimap_blue', 32, 32),
  artImage('map-mechanics/portal/portal_minimap_purple.png', 'art_map_mechanics_portal_minimap_purple', 32, 32),
  artImage('map-mechanics/portal/portal_minimap_green.png', 'art_map_mechanics_portal_minimap_green', 32, 32),
  artImage('map-mechanics/portal/portal_minimap_gold.png', 'art_map_mechanics_portal_minimap_gold', 32, 32),
  artImage('map-mechanics/light/light_minimap.png', 'art_map_mechanics_light_minimap', 24, 24),
  artImage('map-mechanics/obstacle/obstacle_minimap.png', 'art_map_mechanics_obstacle_minimap', 24, 24),
  artImage('map-mechanics/hazard/hazard_minimap.png', 'art_map_mechanics_hazard_minimap', 24, 24),
  artImage('map-mechanics/altar/altar_minimap.png', 'art_map_mechanics_altar_minimap', 24, 24),
  artImage('map-mechanics/altar/cathedral_altar_minimap.png', 'art_map_mechanics_altar_cathedral_minimap', 32, 32),
  artImage('map-mechanics/altar/library_altar_minimap.png', 'art_map_mechanics_altar_library_minimap', 32, 32),
  artImage('map-mechanics/spawner/spawner_minimap.png', 'art_map_mechanics_spawner_minimap', 24, 24),
];

export const MAP_MECHANIC_ART_ASSETS: ArtManifestAsset[] = [
  ...MAP_MECHANIC_WORLD_ART_ASSETS,
  ...MAP_MECHANIC_MINIMAP_ICON_ASSETS,
];

export const GAMEPLAY_ART_ASSETS: ArtManifestAsset[] = [
  artSheet('effects/boss_dash_impact_sheet.png', 'art_effects_boss_dash_impact_sheet', 128, 128, 4),
  artImage('effects/boss_dash_warning.png', 'art_effects_boss_dash_warning', 256, 64),
  artSheet('effects/hit_flash_sheet.png', 'art_effects_hit_flash_sheet', 64, 64, 4),
  artSheet('effects/level_up_glow_sheet.png', 'art_effects_level_up_glow_sheet', 128, 128, 4),
  artImage('enemies/bat_boss_placeholder.png', 'art_enemies_bat_boss_placeholder', 96, 96),
  artSheet('enemies/bat_fly_sheet.png', 'art_enemies_bat_fly_sheet', 48, 48, 4),
  artSheet('enemies/boss_lava_beast_idle_sheet.png', 'art_enemies_boss_lava_beast_idle_sheet', 192, 192, 4),
  artImage('enemies/golem_boss_placeholder.png', 'art_enemies_golem_boss_placeholder', 96, 96),
  artSheet('enemies/golem_boss_idle_sheet.png', 'art_enemies_golem_boss_idle_sheet', 128, 128, 4),
  artSheet('enemies/golem_walk_sheet.png', 'art_enemies_golem_walk_sheet', 64, 64, 4),
  artImage('enemies/slime_boss_placeholder.png', 'art_enemies_slime_boss_placeholder', 96, 96),
  artSheet('enemies/slime_boss_idle_sheet.png', 'art_enemies_slime_boss_idle_sheet', 128, 128, 4),
  artSheet('enemies/bat_boss_idle_sheet.png', 'art_enemies_bat_boss_idle_sheet', 128, 128, 4),
  artSheet('enemies/endless_berserker_idle_sheet.png', 'art_enemies_endless_berserker_idle_sheet', 128, 128, 4),
  artSheet('enemies/endless_summoner_idle_sheet.png', 'art_enemies_endless_summoner_idle_sheet', 128, 128, 4),
  artSheet('enemies/endless_freezer_idle_sheet.png', 'art_enemies_endless_freezer_idle_sheet', 128, 128, 4),
  artSheet('enemies/endless_sniper_idle_sheet.png', 'art_enemies_endless_sniper_idle_sheet', 128, 128, 4),
  artSheet('enemies/endless_tanker_idle_sheet.png', 'art_enemies_endless_tanker_idle_sheet', 128, 128, 4),
  artSheet('enemies/slime_walk_sheet.png', 'art_enemies_slime_walk_sheet', 48, 48, 4),
  artImage('pickups/exp_gem.png', 'art_pickups_exp_gem', 32, 32),
  artImage('pickups/treasure_chest.png', 'art_pickups_treasure_chest', 64, 56),
  artSheet('weapons/axe_projectile_sheet.png', 'art_weapons_axe_projectile_sheet', 64, 64, 4),
  artSheet('weapons/bible_orbit_book_sheet.png', 'art_weapons_bible_orbit_book_sheet', 64, 64, 4),
  artSheet('weapons/death_spiral_projectile_sheet.png', 'art_weapons_death_spiral_projectile_sheet', 64, 64, 4),
  artSheet('weapons/garlic_core_sheet.png', 'art_weapons_garlic_core_sheet', 64, 64, 4),
  artSheet('weapons/holy_wand_projectile_sheet.png', 'art_weapons_holy_wand_projectile_sheet', 64, 64, 4),
  artSheet('weapons/knife_projectile_sheet.png', 'art_weapons_knife_projectile_sheet', 64, 64, 4),
  artSheet('weapons/magic_wand_projectile_sheet.png', 'art_weapons_magic_wand_projectile_sheet', 64, 64, 4),
  artSheet('weapons/soul_eater_core_sheet.png', 'art_weapons_soul_eater_core_sheet', 64, 64, 4),
  artSheet('weapons/thousand_edge_projectile_sheet.png', 'art_weapons_thousand_edge_projectile_sheet', 64, 64, 4),
  artSheet('weapons/unholy_vespers_orbit_book_sheet.png', 'art_weapons_unholy_vespers_orbit_book_sheet', 64, 64, 4),
  ...TIERED_WEAPON_ART_ASSETS,
  ...TIERED_PASSIVE_ART_ASSETS,
  ...RELIC_ART_ASSETS,
  artImage('world/grass_tile.png', 'art_world_grass_tile', 128, 128),
  artImage('world/grave_landmark.png', 'art_world_grave_landmark', 96, 96),
  artImage('world/graveyard_ground_tile.png', 'art_world_graveyard_ground_tile', 128, 128),
  artImage('world/ground_tile.png', 'art_world_ground_tile', 128, 128),
  artImage('world/swamp_ground_tile.png', 'art_world_swamp_ground_tile', 128, 128),
  artImage('world/ruins_ground_tile.png', 'art_world_ruins_ground_tile', 128, 128),
  artImage('world/cathedral_ground_tile.png', 'art_world_cathedral_ground_tile', 128, 128),
  artImage('world/library_ground_tile.png', 'art_world_library_ground_tile', 128, 128),
  artImage('world/desert_ground_tile.png', 'art_world_desert_ground_tile', 128, 128),
  artImage('world/coast_ground_tile.png', 'art_world_coast_ground_tile', 128, 128),
  artImage('world/bastion_ground_tile.png', 'art_world_bastion_ground_tile', 128, 128),
  artImage('world/fungal_ground_tile.png', 'art_world_fungal_ground_tile', 128, 128),
  artImage('world/mirror_ground_tile.png', 'art_world_mirror_ground_tile', 128, 128),
  artImage('world/rock_landmark.png', 'art_world_rock_landmark', 96, 96),
  artImage('world/tree_landmark.png', 'art_world_tree_landmark', 96, 96),
  ...MAP_MECHANIC_ART_ASSETS,
];

export function buildTitleLoadPlan(
  settings: DisplaySettingsData,
  manifestAssets?: readonly ArtManifestAsset[],
  manifestVersion?: string,
): AssetLoadPlan {
  const manifestAssetMap = createManifestAssetMap(manifestAssets);
  const styleAwareAssets = (assets: AssetRequest[]): AssetRequest[] => (
    assets.map((asset) => {
      if (!asset.path.startsWith('assets/art/')) {
        return asset;
      }

      const remappedPath = appendCacheVersion(
        remapAssetStylePath(asset.path, settings.assetStyle),
        manifestVersion,
      );

      return {
        ...asset,
        path: remappedPath,
      };
    })
  );
  const manifestAwareArtRequest = (asset: ArtManifestAsset): AssetRequest => (
    artToRequest(manifestAssetMap.get(asset.key) ?? asset, settings.assetStyle, manifestVersion)
  );

  return {
    id: 'title',
    assets: [
      ...styleAwareAssets(TITLE_UI_ASSETS),
      ...styleAwareAssets(TITLE_ICON_ASSETS),
      ...PLAYER_ART_SKIN_IDS.map((skinId) => manifestAwareArtRequest(
        artImage(`player/${skinId}/portrait.png`, `art_player_${skinId}_portrait`, 128, 128),
      )),
      ...TITLE_AUDIO_ASSETS,
      json(EXTERNAL_ART_MANIFEST_CACHE_KEY, EXTERNAL_ART_MANIFEST_PATH),
    ],
  };
}

export function buildRunLoadPlan(
  context: RunPreloadContext,
  manifestAssets?: readonly ArtManifestAsset[],
  manifestVersion?: string,
): AssetLoadPlan {
  const requiredKeys = buildRunRequiredAssetKeys(context);

  return {
    id: [
      'run',
      context.characterId,
      context.stageId,
      context.mapId,
      context.assetStyle,
      context.displayQuality,
    ].join(':'),
    assets: dedupeAssetRequests([
      ...getRequiredLegacyRuntimeAssets(requiredKeys),
      ...getRequiredRunUiAssets(context, manifestVersion),
      ...getRequiredRunIconAssets(context, requiredKeys, manifestVersion),
      ...getRequiredRunArtAssets(context, requiredKeys, manifestAssets, manifestVersion),
      ...getRequiredRunAudioAssets(requiredKeys),
      ...getRequiredExternalRuntimeAssets(context, requiredKeys),
    ]),
  };
}

export function dedupeAssetRequests(assets: readonly AssetRequest[]): AssetRequest[] {
  const deduped = new Map<string, AssetRequest>();

  for (const asset of assets) {
    const existing = deduped.get(asset.key);

    if (existing && getAssetRequestSignature(existing) !== getAssetRequestSignature(asset)) {
      console.warn(`[assets] Duplicate asset key with different request skipped by override: ${asset.key}`);
    }

    deduped.set(asset.key, asset);
  }

  return Array.from(deduped.values());
}

function getRequiredLegacyRuntimeAssets(requiredKeys: RunRequiredAssetKeys): AssetRequest[] {
  return LEGACY_GAMEPLAY_ASSETS.filter((asset) => requiredKeys.textures.has(asset.key));
}

function getRequiredRunUiAssets(
  context: RunPreloadContext,
  manifestVersion: string | undefined,
): AssetRequest[] {
  const requiredUiKeys = new Set([
    'art_ui_pause_panel_bg',
    'art_ui_hud_panel_bg',
    'art_ui_help_panel_bg',
    'art_ui_levelup_panel_bg',
    'art_ui_hp_icon',
    'art_ui_exp_icon',
    'art_ui_time_icon',
    'hp_icon',
    'exp_icon',
    'time_icon',
  ]);

  return styleAwareAssetRequests(
    TITLE_UI_ASSETS.filter((asset) => requiredUiKeys.has(asset.key)),
    context.assetStyle,
    manifestVersion,
  );
}

function getRequiredRunIconAssets(
  context: RunPreloadContext,
  requiredKeys: RunRequiredAssetKeys,
  manifestVersion: string | undefined,
): AssetRequest[] {
  return styleAwareAssetRequests(
    TITLE_ICON_ASSETS.filter((asset) => requiredKeys.textures.has(asset.key)),
    context.assetStyle,
    manifestVersion,
  );
}

function getRequiredRunArtAssets(
  context: RunPreloadContext,
  requiredKeys: RunRequiredAssetKeys,
  manifestAssets: readonly ArtManifestAsset[] | undefined,
  manifestVersion: string | undefined,
): AssetRequest[] {
  if (manifestAssets && manifestAssets.length > 0) {
    return manifestAssets.map((asset) => artToRequest(asset, context.assetStyle, manifestVersion));
  }

  const requiredArtKeys = getRequiredArtTextureKeys(context, requiredKeys);
  const manifestAssetMap = createManifestAssetMap(manifestAssets);
  const builtInAssetMap = createManifestAssetMap(getBuiltInRuntimeArtAssets(context));
  const assets: ArtManifestAsset[] = [];

  for (const key of requiredArtKeys) {
    const asset = manifestAssetMap.get(key) ?? builtInAssetMap.get(key);

    if (asset) {
      assets.push(asset);
    }
  }

  return assets.map((asset) => artToRequest(asset, context.assetStyle, manifestVersion));
}

function getRequiredRunAudioAssets(requiredKeys: RunRequiredAssetKeys): AssetRequest[] {
  return GAMEPLAY_AUDIO_ASSETS.filter((asset) => requiredKeys.audio.has(asset.key));
}

function getRequiredExternalRuntimeAssets(
  context: RunPreloadContext,
  requiredKeys: RunRequiredAssetKeys,
): AssetRequest[] {
  return ExternalArtRegistry.getAssets()
    .filter((asset) => isExternalRuntimeAssetRequired(asset, context, requiredKeys))
    .map(externalArtToRequest)
    .filter((asset): asset is AssetRequest => asset !== undefined);
}

function styleAwareAssetRequests(
  assets: readonly AssetRequest[],
  assetStyle: DisplaySettingsData['assetStyle'],
  manifestVersion: string | undefined,
): AssetRequest[] {
  return assets.map((asset) => {
    if (!asset.path.startsWith('assets/art/')) {
      return asset;
    }

    return {
      ...asset,
      path: appendCacheVersion(
        remapAssetStylePath(asset.path, assetStyle),
        manifestVersion,
      ),
    };
  });
}

function getRequiredArtTextureKeys(
  context: RunPreloadContext,
  requiredKeys: RunRequiredAssetKeys,
): Set<string> {
  const usesLegacyOrGraphicsRuntime = context.assetStyle === 'graphics'
    || context.assetStyle === 'legacy'
    || context.displayQuality === 'minimal';
  const requiredArtKeys = new Set<string>();

  for (const key of requiredKeys.textures) {
    if (!key.startsWith('art_')) {
      continue;
    }

    if (usesLegacyOrGraphicsRuntime && !key.includes('_minimap')) {
      continue;
    }

    requiredArtKeys.add(key);
  }

  return requiredArtKeys;
}

function getBuiltInRuntimeArtAssets(context: RunPreloadContext): ArtManifestAsset[] {
  const skinId = resolvePlayerSkinId(context.skinId, context.characterId);

  return [
    ...GAMEPLAY_ART_ASSETS,
    getGenericPlayerWalkSheetAsset(context.assetStyle),
    ...getPlayerRuntimeArtAssets(skinId, context.assetStyle),
    ...getPlayerSkillArtAssets(skinId),
  ];
}

function isExternalRuntimeAssetRequired(
  asset: ExternalArtAsset,
  context: RunPreloadContext,
  requiredKeys: RunRequiredAssetKeys,
): boolean {
  const logicalKeys = [
    asset.logicalKey,
    ...(asset.logicalKeys ?? []),
  ].filter((key): key is string => typeof key === 'string' && key.length > 0);

  if (
    requiredKeys.textures.has(asset.textureKey)
    || logicalKeys.some((key) => requiredKeys.textures.has(key))
  ) {
    return true;
  }

  switch (asset.category) {
    case 'player':
      return asset.skinId === context.skinId;
    case 'weapon':
      return asset.targetId === context.startingWeaponId;
    case 'enemy':
    case 'boss':
      return [
        ...(context.waveEnemyIds ?? []),
        context.finalBossId,
        ...(context.endlessMode ? [
          'endless_berserker',
          'endless_summoner',
          'endless_freezer',
          'endless_sniper',
          'endless_tanker',
        ] : []),
      ].includes(asset.targetId ?? '');
    case 'pickup':
      return asset.targetId === 'exp_gem' || asset.targetId === 'treasure_chest';
    case 'world':
      return [
        context.mapId,
        context.groundTileKey,
        ...(context.landmarkTypes ?? []),
      ].includes(asset.targetId ?? '');
    case 'effect':
      return [
        'hit_flash',
        'level_up_glow',
        'boss_dash_warning',
        'boss_dash_impact',
      ].includes(asset.targetId ?? '');
    default:
      return false;
  }
}

function getAssetRequestSignature(asset: AssetRequest): string {
  switch (asset.type) {
    case 'spritesheet':
      return [
        asset.type,
        asset.path,
        asset.frameWidth,
        asset.frameHeight,
        asset.endFrame ?? '',
      ].join('|');
    default:
      return [asset.type, asset.path].join('|');
  }
}

export function parseArtManifestAssets(manifest: unknown): ArtManifestAsset[] {
  const manifestValue = manifest as ArtManifest | undefined;

  if (!manifestValue || !Array.isArray(manifestValue.assets)) {
    return [];
  }

  return manifestValue.assets.filter((asset): asset is ArtManifestAsset => (
    typeof asset === 'object'
    && asset !== null
    && typeof (asset as ArtManifestAsset).path === 'string'
    && typeof (asset as ArtManifestAsset).key === 'string'
    && ((asset as ArtManifestAsset).type === 'image' || (asset as ArtManifestAsset).type === 'spritesheet')
    && typeof (asset as ArtManifestAsset).frameWidth === 'number'
    && typeof (asset as ArtManifestAsset).frameHeight === 'number'
    && typeof (asset as ArtManifestAsset).frames === 'number'
    && (asset as ArtManifestAsset).frameWidth > 0
    && (asset as ArtManifestAsset).frameHeight > 0
    && (asset as ArtManifestAsset).frames > 0
  ));
}

export function getArtManifestVersion(manifest: unknown): string | undefined {
  const version = (manifest as ArtManifest | undefined)?.version;

  return typeof version === 'string' && version.length > 0
    ? version
    : undefined;
}

export function getGenericPlayerWalkSheetAsset(
  assetStyle: DisplaySettingsData['assetStyle'] = 'newArt',
): ArtManifestAsset {
  const frameSize = assetStyle === 'art001' ? 64 : 80;

  return artSheet('player/player_walk_sheet.png', 'art_player_player_walk_sheet', frameSize, frameSize, 4);
}

export function getPlayerRuntimeArtAssets(
  skinId: string,
  assetStyle: DisplaySettingsData['assetStyle'] = 'newArt',
): ArtManifestAsset[] {
  const fallbackFrameSize = assetStyle === 'art001' ? 64 : 80;

  return [
    artSheet(`player/${skinId}_walk_sheet.png`, `art_player_${skinId}_walk_sheet`, fallbackFrameSize, fallbackFrameSize, 4),
    artImage(`player/${skinId}/portrait.png`, `art_player_${skinId}_portrait`, 128, 128),
    artImage(`player/${skinId}/hit_fx.png`, `art_player_${skinId}_hit_fx`, 96, 96),
    ...PLAYER_ART_DIRECTIONS.flatMap((direction) => [
      artSheet(`player/${skinId}/walk_${direction}.png`, `art_player_${skinId}_walk_${direction}`, 80, 80, 4),
      artSheet(`player/${skinId}/idle_${direction}.png`, `art_player_${skinId}_idle_${direction}`, 80, 80, 4),
    ]),
  ];
}

export function getPlayerSkillArtAssets(skinId: string): ArtManifestAsset[] {
  return PLAYER_CHARACTER_IMAGE_ASSETS.filter((asset) => asset.key.startsWith(`art_player_${skinId}_`));
}

export function getDefaultSkinId(characterId: string): PlayerArtSkinId {
  switch (characterId) {
    case 'arcanist':
      return 'arcanist_default';
    case 'ranger':
      return 'ranger_default';
    case 'engineer':
      return 'engineer_default';
    case 'necromancer':
      return 'necromancer_default';
    case 'monk':
      return 'monk_default';
    case 'alchemist':
      return 'alchemist_default';
    case 'duelist':
      return 'duelist_default';
    case 'geomancer':
      return 'geomancer_default';
    case 'stormcaller':
      return 'stormcaller_default';
    case 'sentinel':
      return 'sentinel_default';
    case 'witch':
      return 'witch_default';
    case 'priest':
      return 'priest_default';
    case 'warrior':
      return 'warrior_default';
    case 'default':
    default:
      return 'assassin_default';
  }
}

export function resolvePlayerSkinId(
  skinId: string | undefined,
  characterId?: string,
): PlayerArtSkinId {
  const normalizedSkinId = normalizeSkinId(skinId ?? '');

  if (normalizedSkinId) {
    return normalizedSkinId;
  }

  return getDefaultSkinId(characterId ?? 'default');
}

export function normalizeSkinId(skinId: string): PlayerArtSkinId {
  return PLAYER_ART_SKIN_IDS.includes(skinId as PlayerArtSkinId)
    ? skinId as PlayerArtSkinId
    : 'assassin_default';
}

export function artToRequest(
  asset: ArtManifestAsset,
  assetStyle: DisplaySettingsData['assetStyle'] = 'newArt',
  cacheVersion?: string,
): AssetRequest {
  const root = resolveArtStyleRoot(assetStyle);
  const path = appendCacheVersion(`${root}${asset.path}`, cacheVersion);

  if (asset.type === 'spritesheet') {
    return spritesheet(asset.key, path, asset.frameWidth, asset.frameHeight, asset.frames - 1);
  }

  return image(asset.key, path);
}

function createManifestAssetMap(
  assets: readonly ArtManifestAsset[] | undefined,
): Map<string, ArtManifestAsset> {
  const assetMap = new Map<string, ArtManifestAsset>();

  for (const asset of assets ?? []) {
    assetMap.set(asset.key, asset);
  }

  return assetMap;
}

function appendCacheVersion(path: string, cacheVersion: string | undefined): string {
  if (!cacheVersion) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';

  return `${path}${separator}v=${encodeURIComponent(cacheVersion)}`;
}

export function externalArtToRequest(asset: ExternalArtAsset): AssetRequest | undefined {
  const path = getExternalAssetPath(asset);

  if (asset.type === 'spritesheet') {
    if (!asset.frameWidth || !asset.frameHeight) {
      console.warn(`[external-art] Skipping spritesheet without frame size: ${asset.id}`);
      return undefined;
    }

    return spritesheet(
      asset.textureKey,
      path,
      asset.frameWidth,
      asset.frameHeight,
      asset.frameCount ? asset.frameCount - 1 : undefined,
    );
  }

  return image(asset.textureKey, path);
}

export function getExternalAssetPath(asset: ExternalArtAsset): string {
  const manifest = ExternalArtRegistry.loadManifest();
  const basePath = manifest?.basePath || 'assets/imports';

  return `${basePath.replace(/\/$/, '')}/${asset.path}`;
}

export function getExternalRuntimeAssets(): AssetRequest[] {
  return ExternalArtRegistry.getAssets()
    .map(externalArtToRequest)
    .filter((asset): asset is AssetRequest => asset !== undefined);
}

export function getAnimationKeys(textureKey: string): string[] {
  return [
    getUnifiedAnimationKey(textureKey),
    `${textureKey}_anim`,
  ].filter((animationKey, index, animationKeys) => (
    animationKeys.indexOf(animationKey) === index
  ));
}

export function getUnifiedAnimationKey(textureKey: string): string {
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

function image(key: string, path: string): AssetRequest {
  return { type: 'image', key, path };
}

function spritesheet(
  key: string,
  path: string,
  frameWidth: number,
  frameHeight: number,
  endFrame: number | undefined,
): AssetRequest {
  return { type: 'spritesheet', key, path, frameWidth, frameHeight, endFrame };
}

function audio(key: string, path: string): AssetRequest {
  return { type: 'audio', key, path };
}

function json(key: string, path: string): AssetRequest {
  return { type: 'json', key, path };
}

function artImage(path: string, key: string, frameWidth: number, frameHeight: number): ArtManifestAsset {
  return { path, key, type: 'image', frameWidth, frameHeight, frames: 1 };
}

function artSheet(
  path: string,
  key: string,
  frameWidth: number,
  frameHeight: number,
  frames: number,
): ArtManifestAsset {
  return { path, key, type: 'spritesheet', frameWidth, frameHeight, frames };
}
