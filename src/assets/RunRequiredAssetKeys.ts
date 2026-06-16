import { MapMechanicIconKind, MapMechanicVisualKind } from './AssetKeyMap';

export interface RunRequiredAssetKeys {
  textures: Set<string>;
  animations: Set<string>;
  audio: Set<string>;
  json: Set<string>;
}

export interface RunRequiredAssetKeyInput {
  characterId: string;
  skinId?: string;
  startingWeaponId?: string;
  finalBossId?: string;
  waveEnemyIds?: readonly string[];
  groundTileKey?: string;
  landmarkTypes?: readonly string[];
  mapMechanicVisualKinds?: readonly MapMechanicVisualKind[];
  mapMechanicMinimapIconKinds?: readonly MapMechanicIconKind[];
  audioEnabled?: boolean;
  minimapScale?: number;
  endlessMode?: boolean;
}

const ENEMY_TEXTURE_KEYS: Record<string, readonly string[]> = {
  slime: ['art_enemies_slime_walk_sheet', 'slime'],
  bat: ['art_enemies_bat_fly_sheet', 'bat'],
  golem: ['art_enemies_golem_walk_sheet', 'golem'],
  slime_boss: ['art_enemies_slime_boss_idle_sheet', 'art_enemies_slime_boss_placeholder'],
  bat_boss: ['art_enemies_bat_boss_idle_sheet', 'art_enemies_bat_boss_placeholder'],
  golem_boss: ['art_enemies_golem_boss_idle_sheet', 'art_enemies_golem_boss_placeholder'],
  boss: ['art_enemies_boss_lava_beast_idle_sheet', 'boss_lava_beast', 'boss'],
  endless_berserker: ['art_enemies_endless_berserker_idle_sheet', 'art_enemies_bat_boss_idle_sheet', 'art_enemies_bat_boss_placeholder'],
  endless_summoner: ['art_enemies_endless_summoner_idle_sheet', 'art_enemies_slime_boss_idle_sheet', 'art_enemies_slime_boss_placeholder'],
  endless_freezer: ['art_enemies_endless_freezer_idle_sheet', 'art_enemies_golem_boss_idle_sheet', 'art_enemies_golem_boss_placeholder'],
  endless_sniper: ['art_enemies_endless_sniper_idle_sheet', 'art_enemies_bat_boss_idle_sheet', 'art_enemies_bat_boss_placeholder'],
  endless_tanker: ['art_enemies_endless_tanker_idle_sheet', 'art_enemies_golem_boss_idle_sheet', 'art_enemies_golem_boss_placeholder'],
};

const ENEMY_ANIMATION_KEYS: Record<string, readonly string[]> = {
  slime: ['art_slime_walk'],
  bat: ['art_bat_fly'],
  golem: ['art_golem_walk'],
  slime_boss: ['art_enemies_slime_boss_idle_sheet_anim'],
  bat_boss: ['art_enemies_bat_boss_idle_sheet_anim'],
  golem_boss: ['art_enemies_golem_boss_idle_sheet_anim'],
  boss: ['art_boss_lava_beast_idle'],
  endless_berserker: ['art_enemies_endless_berserker_idle_sheet_anim'],
  endless_summoner: ['art_enemies_endless_summoner_idle_sheet_anim'],
  endless_freezer: ['art_enemies_endless_freezer_idle_sheet_anim'],
  endless_sniper: ['art_enemies_endless_sniper_idle_sheet_anim'],
  endless_tanker: ['art_enemies_endless_tanker_idle_sheet_anim'],
};

const WEAPON_TEXTURE_KEYS: Record<string, readonly string[]> = {
  knife: ['art_weapons_knife_projectile_sheet', 'knife_projectile', 'knife_icon'],
  garlic: ['art_weapons_garlic_core_sheet', 'garlic_icon'],
  bible: ['art_weapons_bible_orbit_book_sheet', 'bible_orbit_projectile', 'bible_icon'],
  magic_wand: ['art_weapons_magic_wand_projectile_sheet', 'art_weapons_magic_wand_icon', 'magic_wand_projectile', 'magic_wand_icon'],
  axe: ['art_weapons_axe_projectile_sheet', 'art_weapons_axe_icon', 'axe_projectile', 'axe_icon'],
  thousand_edge: ['art_weapons_thousand_edge_projectile_sheet', 'art_weapons_thousand_edge_icon', 'thousand_edge_projectile', 'thousand_edge_icon'],
  holy_wand: ['art_weapons_holy_wand_projectile_sheet', 'art_weapons_holy_wand_icon', 'holy_wand_projectile', 'holy_wand_icon'],
  death_spiral: ['art_weapons_death_spiral_projectile_sheet', 'art_weapons_death_spiral_icon', 'death_spiral_projectile', 'death_spiral_icon'],
  unholy_vespers: ['art_weapons_unholy_vespers_orbit_book_sheet', 'art_weapons_unholy_vespers_icon', 'unholy_vespers_orbit_book', 'unholy_vespers_icon'],
  soul_eater: ['art_weapons_soul_eater_core_sheet', 'art_weapons_soul_eater_icon', 'soul_eater_core', 'soul_eater_icon'],
};

const WEAPON_ANIMATION_KEYS: Record<string, readonly string[]> = {
  knife: ['art_knife_projectile_spin'],
  garlic: ['art_garlic_core'],
  bible: ['art_bible_orbit_book_spin'],
  magic_wand: ['art_magic_wand_projectile'],
  axe: ['art_axe_projectile_spin'],
  thousand_edge: ['art_thousand_edge_projectile_spin', 'art_knife_projectile_spin'],
  holy_wand: ['art_holy_wand_projectile'],
  death_spiral: ['art_death_spiral_projectile_spin'],
  unholy_vespers: ['art_unholy_vespers_orbit_book_spin'],
  soul_eater: ['art_soul_eater_core'],
};

const WEAPON_AUDIO_KEYS: Record<string, readonly string[]> = {
  knife: ['knife_attack'],
  thousand_edge: ['thousand_edge_attack'],
  axe: ['axe_throw'],
  death_spiral: ['death_spiral_throw'],
  magic_wand: ['magic_wand_shot'],
  holy_wand: ['holy_wand_shot'],
  bible: ['bible_orbit_hit'],
  unholy_vespers: ['unholy_vespers_hit'],
  garlic: ['garlic_aura_tick'],
  soul_eater: ['soul_eater_tick'],
};

const MAP_MECHANIC_VISUAL_TEXTURE_KEYS: Record<MapMechanicVisualKind, readonly string[]> = {
  river: ['art_map_mechanics_river_tile', 'art_map_mechanics_river_bank', 'art_map_mechanics_river_ripple'],
  swamp: ['art_map_mechanics_swamp_pool', 'art_map_mechanics_swamp_bubble'],
  mud: ['art_map_mechanics_mud_patch', 'art_map_mechanics_mud_spot'],
  ink: ['art_map_mechanics_ink_pool', 'art_map_mechanics_ink_spot', 'art_map_mechanics_mud_patch'],
  portalBlue: ['art_map_mechanics_portal_blue'],
  portalPurple: ['art_map_mechanics_portal_purple'],
  portalGreen: ['art_map_mechanics_portal_green'],
  portalGold: ['art_map_mechanics_portal_gold'],
  lightLamp: ['art_map_mechanics_light_lamp'],
  lightTorch: ['art_map_mechanics_light_torch'],
  lightCrystal: ['art_map_mechanics_light_crystal'],
  lightCandle: ['art_map_mechanics_light_cathedral_candle'],
  lightArcaneLamp: ['art_map_mechanics_light_arcane_lamp', 'art_map_mechanics_light_crystal'],
  obstacleTree: ['art_map_mechanics_obstacle_tree'],
  obstacleRock: ['art_map_mechanics_obstacle_rock'],
  obstacleGrave: ['art_map_mechanics_obstacle_grave'],
  obstacleWall: ['art_map_mechanics_obstacle_wall'],
  obstacleCathedralWall: ['art_map_mechanics_obstacle_cathedral_wall'],
  obstacleCathedralPillar: ['art_map_mechanics_obstacle_cathedral_pillar'],
  obstacleBookshelf: ['art_map_mechanics_obstacle_bookshelf', 'art_map_mechanics_obstacle_wall'],
  obstacleArchivePillar: ['art_map_mechanics_obstacle_archive_pillar', 'art_map_mechanics_obstacle_wall'],
  hazardSpike: ['art_map_mechanics_hazard_spike'],
  hazardFire: ['art_map_mechanics_hazard_fire'],
  hazardPoison: ['art_map_mechanics_hazard_poison'],
  altar: ['art_map_mechanics_altar_basic'],
  altarCathedral: ['art_map_mechanics_altar_cathedral'],
  altarLibrary: ['art_map_mechanics_altar_library', 'art_map_mechanics_altar_cathedral', 'art_map_mechanics_altar_basic'],
  spawner: ['art_map_mechanics_spawner_nest'],
};

const MAP_MECHANIC_MINIMAP_TEXTURE_KEYS: Record<MapMechanicIconKind, readonly string[]> = {
  river: ['art_map_mechanics_river_minimap'],
  swamp: ['art_map_mechanics_swamp_minimap'],
  mud: ['art_map_mechanics_mud_minimap'],
  ink: ['art_map_mechanics_ink_minimap', 'art_map_mechanics_mud_minimap'],
  portalBlue: ['art_map_mechanics_portal_minimap_blue'],
  portalPurple: ['art_map_mechanics_portal_minimap_purple'],
  portalGreen: ['art_map_mechanics_portal_minimap_green'],
  portalGold: ['art_map_mechanics_portal_minimap_gold'],
  light: ['art_map_mechanics_light_minimap'],
  obstacle: ['art_map_mechanics_obstacle_minimap'],
  hazard: ['art_map_mechanics_hazard_minimap'],
  altar: ['art_map_mechanics_altar_cathedral_minimap', 'art_map_mechanics_altar_minimap'],
  altarLibrary: ['art_map_mechanics_altar_library_minimap', 'art_map_mechanics_altar_minimap'],
  spawner: ['art_map_mechanics_spawner_minimap'],
};

const LANDMARK_TEXTURE_KEYS: Record<string, string> = {
  tree: 'art_world_tree_landmark',
  rock: 'art_world_rock_landmark',
  grave: 'art_world_grave_landmark',
};

const RELIC_TEXTURE_KEYS = [
  'art_relics_blood_pact_icon',
  'art_relics_void_compass_icon',
  'art_relics_golden_scarab_icon',
  'art_relics_thorn_crown_icon',
  'art_relics_frozen_hourglass_icon',
  'art_relics_berserker_charm_icon',
  'art_relics_magnet_pearl_icon',
  'art_relics_iron_shell_icon',
  'art_relics_scholar_candle_icon',
  'art_relics_rift_coin_icon',
] as const;

export function buildRunRequiredAssetKeys(input: RunRequiredAssetKeyInput): RunRequiredAssetKeys {
  const result: RunRequiredAssetKeys = {
    textures: new Set<string>(),
    animations: new Set<string>(),
    audio: new Set<string>(),
    json: new Set<string>(),
  };
  const skinId = input.skinId ?? 'assassin_default';

  add(result.textures, [
    'player',
    'exp_gem',
    'treasure_chest',
    'hit_flash',
    'art_player_player_walk_sheet',
    `art_player_${skinId}_walk_sheet`,
    `art_player_${skinId}_portrait`,
    `art_player_${skinId}_hit_fx`,
    ...getPlayerDirectionalTextureKeys(skinId),
    ...getPlayerSkillTextureKeys(skinId),
    'art_pickups_exp_gem',
    'art_pickups_treasure_chest',
    'art_effects_hit_flash_sheet',
    'art_effects_level_up_glow_sheet',
    ...RELIC_TEXTURE_KEYS,
  ]);
  add(result.animations, [
    'art_player_walk',
    `art_player_${skinId}_walk`,
    'art_hit_flash',
    'art_level_up_glow',
  ]);

  for (const enemyId of new Set([
    ...(input.waveEnemyIds ?? []),
    input.finalBossId,
    ...(input.endlessMode ? [
      'endless_berserker',
      'endless_summoner',
      'endless_freezer',
      'endless_sniper',
      'endless_tanker',
    ] : []),
  ].filter((id): id is string => typeof id === 'string' && id.length > 0))) {
    add(result.textures, ENEMY_TEXTURE_KEYS[enemyId] ?? [enemyId]);
    add(result.animations, ENEMY_ANIMATION_KEYS[enemyId] ?? []);
  }

  if (input.startingWeaponId) {
    add(result.textures, WEAPON_TEXTURE_KEYS[input.startingWeaponId] ?? []);
    add(result.textures, getTieredWeaponTextureKeys(input.startingWeaponId));
    add(result.animations, WEAPON_ANIMATION_KEYS[input.startingWeaponId] ?? []);
    add(result.animations, getTieredWeaponAnimationKeys(input.startingWeaponId));
  }

  if (input.groundTileKey) {
    result.textures.add(`art_world_${input.groundTileKey}`);
  }
  result.textures.add('art_world_ground_tile');

  for (const landmarkType of input.landmarkTypes ?? []) {
    const textureKey = LANDMARK_TEXTURE_KEYS[landmarkType];

    if (textureKey) {
      result.textures.add(textureKey);
    }
  }

  for (const kind of input.mapMechanicVisualKinds ?? []) {
    add(result.textures, MAP_MECHANIC_VISUAL_TEXTURE_KEYS[kind] ?? []);
  }

  if ((input.minimapScale ?? 1) > 0) {
    for (const kind of input.mapMechanicMinimapIconKinds ?? []) {
      add(result.textures, MAP_MECHANIC_MINIMAP_TEXTURE_KEYS[kind] ?? []);
    }
  }

  if (input.finalBossId) {
    add(result.textures, [
      'art_effects_boss_dash_warning',
      'art_effects_boss_dash_impact_sheet',
    ]);
    result.animations.add('art_boss_dash_impact');
  }

  if (input.audioEnabled) {
    add(result.audio, [
      'enemy_hit',
      'enemy_killed',
      'player_hit',
      'level_up',
      'upgrade_selected',
      'treasure_open',
      'victory',
      'game_over',
      'gameplay_bgm',
      'boss_bgm',
    ]);

    if (input.finalBossId) {
      add(result.audio, ['boss_spawn', 'boss_dash']);
    }

    if (input.startingWeaponId) {
      add(result.audio, WEAPON_AUDIO_KEYS[input.startingWeaponId] ?? []);
    }
  }

  return result;
}

function add(target: Set<string>, keys: readonly string[]): void {
  for (const key of keys) {
    target.add(key);
  }
}

function getPlayerDirectionalTextureKeys(skinId: string): string[] {
  return [
    'up',
    'up_right',
    'right',
    'down_right',
    'down',
    'down_left',
    'left',
    'up_left',
  ].flatMap((direction) => [
    `art_player_${skinId}_walk_${direction}`,
    `art_player_${skinId}_idle_${direction}`,
  ]);
}

function getPlayerSkillTextureKeys(skinId: string): string[] {
  switch (skinId) {
    case 'assassin_default':
      return [
        'art_player_assassin_default_blink_trail',
        'art_player_assassin_default_blink_flash',
      ];
    case 'witch_default':
      return ['art_player_witch_default_slow_zone'];
    case 'priest_default':
      return ['art_player_priest_default_sanctuary_circle'];
    case 'warrior_default':
      return ['art_player_warrior_default_counter_wave'];
    default:
      return [];
  }
}

function getTieredWeaponTextureKeys(weaponId: string): string[] {
  return [1, 2, 3].flatMap((tier) => [
    `art_weapons_${weaponId}_icon_tier${tier}`,
    `art_weapons_${weaponId}_projectile_tier${tier}_sheet`,
  ]);
}

function getTieredWeaponAnimationKeys(weaponId: string): string[] {
  return [1, 2, 3].map((tier) => (
    `art_weapons_${weaponId}_projectile_tier${tier}_sheet_anim`
  ));
}
