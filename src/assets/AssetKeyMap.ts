export type AssetKeyEntry = {
  primary: string;
  fallbacks?: readonly string[];
  logicalKey?: string;
};

export type PlayerAnimationState = 'idle' | 'walk';
export type PlayerDirection8 =
  | 'right'
  | 'down_right'
  | 'down'
  | 'down_left'
  | 'left'
  | 'up_left'
  | 'up'
  | 'up_right';

export type WeaponAssetEntry = {
  projectileTexture?: AssetKeyEntry;
  projectileAnimation?: AssetKeyEntry;
  icon?: AssetKeyEntry;
};

export type MapMechanicVisualKind =
  | 'river'
  | 'swamp'
  | 'mud'
  | 'ink'
  | 'portalBlue'
  | 'portalPurple'
  | 'portalGreen'
  | 'portalGold'
  | 'lightLamp'
  | 'lightTorch'
  | 'lightCrystal'
  | 'lightCandle'
  | 'lightArcaneLamp'
  | 'obstacleTree'
  | 'obstacleRock'
  | 'obstacleGrave'
  | 'obstacleWall'
  | 'obstacleCathedralWall'
  | 'obstacleCathedralPillar'
  | 'obstacleBookshelf'
  | 'obstacleArchivePillar'
  | 'hazardSpike'
  | 'hazardFire'
  | 'hazardPoison'
  | 'altar'
  | 'altarCathedral'
  | 'altarLibrary'
  | 'spawner';

export type MapMechanicIconKind =
  | 'river'
  | 'swamp'
  | 'mud'
  | 'ink'
  | 'portalBlue'
  | 'portalPurple'
  | 'portalGreen'
  | 'portalGold'
  | 'light'
  | 'obstacle'
  | 'hazard'
  | 'altar'
  | 'altarLibrary'
  | 'spawner';

export const PLAYER_DIRECTIONS_8: readonly PlayerDirection8[] = [
  'right',
  'down_right',
  'down',
  'down_left',
  'left',
  'up_left',
  'up',
  'up_right',
];

export const PLAYER_SKIN_IDS = [
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

export type PlayerSkinId = typeof PLAYER_SKIN_IDS[number];

export const getPlayerSkinLogicalKey = (
  skinId: string,
  state: PlayerAnimationState,
  direction: PlayerDirection8,
): string => `player.${skinId}.${state}.${direction}`;

export const PLAYER_SKIN_TEXTURE_KEYS: readonly string[] = PLAYER_SKIN_IDS.map(
  (skinId) => `art_player_${skinId}_walk_sheet`,
);

export const PLAYER_SKIN_DIRECTION_TEXTURE_KEYS: readonly string[] = PLAYER_SKIN_IDS.flatMap(
  (skinId) => PLAYER_DIRECTIONS_8.flatMap((direction) => [
    `art_player_${skinId}_walk_${direction}`,
    `art_player_${skinId}_idle_${direction}`,
  ]),
);

export const PLAYER_SKIN_IMAGE_KEYS: readonly string[] = [
  ...PLAYER_SKIN_IDS.flatMap((skinId) => [
    `art_player_${skinId}_portrait`,
    `art_player_${skinId}_hit_fx`,
  ]),
  'art_player_assassin_default_blink_trail',
  'art_player_assassin_default_blink_flash',
  'art_player_witch_default_slow_zone',
  'art_player_priest_default_sanctuary_circle',
  'art_player_warrior_default_counter_wave',
];

const ADDITIONAL_WEAPON_IDS = [
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

const ADDITIONAL_PASSIVE_IDS = [
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

const createTieredWeaponEntry = (weaponId: string): WeaponAssetEntry => ({
  projectileTexture: {
    primary: `art_weapons_${weaponId}_projectile_tier1_sheet`,
    fallbacks: ['art_weapons_knife_projectile_sheet', 'knife_projectile'],
  },
  projectileAnimation: {
    primary: `art_weapons_${weaponId}_projectile_tier1_sheet_anim`,
    fallbacks: ['art_knife_projectile_spin'],
  },
  icon: {
    primary: `art_weapons_${weaponId}_icon_tier1`,
    fallbacks: ['art_weapons_knife_projectile_sheet', 'knife_icon'],
  },
});

const ADDITIONAL_WEAPON_ASSET_ENTRIES = Object.fromEntries(
  ADDITIONAL_WEAPON_IDS.map((weaponId) => [weaponId, createTieredWeaponEntry(weaponId)]),
) as Record<typeof ADDITIONAL_WEAPON_IDS[number], WeaponAssetEntry>;

const ADDITIONAL_PASSIVE_ASSET_ENTRIES = ADDITIONAL_PASSIVE_IDS.reduce(
  (entries, passiveId) => {
    entries[passiveId] = {
      primary: `art_passives_${passiveId}_icon_tier1`,
      fallbacks: ['art_passives_spinach_icon', 'spinach_icon'],
    };
    return entries;
  },
  {} as Record<typeof ADDITIONAL_PASSIVE_IDS[number], AssetKeyEntry>,
);

const createPlayerAnimationMap = (
  state: PlayerAnimationState,
): Record<PlayerDirection8, AssetKeyEntry> => PLAYER_DIRECTIONS_8.reduce(
  (animations, direction) => ({
    ...animations,
    [direction]: {
      primary: `art_player_${state}_${direction}`,
      fallbacks: state === 'walk' ? ['art_player_walk'] : ['art_player_idle_down', 'art_player_walk'],
    },
  }),
  {} as Record<PlayerDirection8, AssetKeyEntry>,
);

export const DEFAULT_ASSET_KEY_MAP = {
  player: {
    texture: {
      primary: 'art_player_player_walk_sheet',
      fallbacks: ['player'],
    },
    animations: {
      idle: createPlayerAnimationMap('idle'),
      walk: createPlayerAnimationMap('walk'),
    },
  },
  enemies: {
    slime: {
      texture: { primary: 'art_enemies_slime_walk_sheet', fallbacks: ['slime'] },
      animation: { primary: 'art_slime_walk' },
    },
    bat: {
      texture: { primary: 'art_enemies_bat_fly_sheet', fallbacks: ['bat'] },
      animation: { primary: 'art_bat_fly' },
    },
    golem: {
      texture: { primary: 'art_enemies_golem_walk_sheet', fallbacks: ['golem'] },
      animation: { primary: 'art_golem_walk' },
    },
    slime_boss: {
      texture: { primary: 'art_enemies_slime_boss_idle_sheet', fallbacks: ['art_enemies_slime_boss_placeholder'] },
      animation: { primary: 'art_enemies_slime_boss_idle_sheet_anim' },
    },
    bat_boss: {
      texture: { primary: 'art_enemies_bat_boss_idle_sheet', fallbacks: ['art_enemies_bat_boss_placeholder'] },
      animation: { primary: 'art_enemies_bat_boss_idle_sheet_anim' },
    },
    golem_boss: {
      texture: { primary: 'art_enemies_golem_boss_idle_sheet', fallbacks: ['art_enemies_golem_boss_placeholder'] },
      animation: { primary: 'art_enemies_golem_boss_idle_sheet_anim' },
    },
    endless_berserker: {
      texture: { primary: 'art_enemies_endless_berserker_idle_sheet', fallbacks: ['art_enemies_bat_boss_idle_sheet', 'art_enemies_bat_boss_placeholder'] },
      animation: { primary: 'art_enemies_endless_berserker_idle_sheet_anim' },
    },
    endless_summoner: {
      texture: { primary: 'art_enemies_endless_summoner_idle_sheet', fallbacks: ['art_enemies_slime_boss_idle_sheet', 'art_enemies_slime_boss_placeholder'] },
      animation: { primary: 'art_enemies_endless_summoner_idle_sheet_anim' },
    },
    endless_freezer: {
      texture: { primary: 'art_enemies_endless_freezer_idle_sheet', fallbacks: ['art_enemies_golem_boss_idle_sheet', 'art_enemies_golem_boss_placeholder'] },
      animation: { primary: 'art_enemies_endless_freezer_idle_sheet_anim' },
    },
    endless_sniper: {
      texture: { primary: 'art_enemies_endless_sniper_idle_sheet', fallbacks: ['art_enemies_bat_boss_idle_sheet', 'art_enemies_bat_boss_placeholder'] },
      animation: { primary: 'art_enemies_endless_sniper_idle_sheet_anim' },
    },
    endless_tanker: {
      texture: { primary: 'art_enemies_endless_tanker_idle_sheet', fallbacks: ['art_enemies_golem_boss_idle_sheet', 'art_enemies_golem_boss_placeholder'] },
      animation: { primary: 'art_enemies_endless_tanker_idle_sheet_anim' },
    },
    boss: {
      texture: {
        primary: 'art_enemies_boss_lava_beast_idle_sheet',
        fallbacks: ['boss_lava_beast', 'boss'],
      },
      animation: { primary: 'art_boss_lava_beast_idle' },
    },
  },
  weapons: {
    knife: {
      projectileTexture: {
        primary: 'art_weapons_knife_projectile_tier1_sheet',
        fallbacks: ['art_weapons_knife_projectile_sheet', 'knife_projectile'],
      },
      projectileAnimation: { primary: 'art_weapons_knife_projectile_tier1_sheet_anim', fallbacks: ['art_knife_projectile_spin'] },
      icon: { primary: 'art_weapons_knife_icon_tier1', fallbacks: ['art_weapons_knife_projectile_sheet', 'knife_icon', 'knife_projectile'] },
    },
    garlic: {
      projectileTexture: {
        primary: 'art_weapons_garlic_projectile_tier1_sheet',
        fallbacks: ['art_weapons_garlic_core_sheet', 'garlic_icon'],
      },
      projectileAnimation: { primary: 'art_weapons_garlic_projectile_tier1_sheet_anim', fallbacks: ['art_garlic_core'] },
      icon: { primary: 'art_weapons_garlic_icon_tier1', fallbacks: ['art_weapons_garlic_core_sheet', 'garlic_icon'] },
    },
    bible: {
      projectileTexture: {
        primary: 'art_weapons_bible_projectile_tier1_sheet',
        fallbacks: ['art_weapons_bible_orbit_book_sheet', 'bible_orbit_projectile'],
      },
      projectileAnimation: { primary: 'art_weapons_bible_projectile_tier1_sheet_anim', fallbacks: ['art_bible_orbit_book_spin'] },
      icon: { primary: 'art_weapons_bible_icon_tier1', fallbacks: ['art_weapons_bible_orbit_book_sheet', 'bible_icon', 'bible_orbit_projectile'] },
    },
    magic_wand: {
      projectileTexture: {
        primary: 'art_weapons_magic_wand_projectile_tier1_sheet',
        fallbacks: ['art_weapons_magic_wand_projectile_sheet', 'magic_wand_projectile'],
      },
      projectileAnimation: { primary: 'art_weapons_magic_wand_projectile_tier1_sheet_anim', fallbacks: ['art_magic_wand_projectile'] },
      icon: { primary: 'art_weapons_magic_wand_icon_tier1', fallbacks: ['art_weapons_magic_wand_icon', 'magic_wand_icon', 'magic_wand_projectile'] },
    },
    axe: {
      projectileTexture: {
        primary: 'art_weapons_axe_projectile_tier1_sheet',
        fallbacks: ['art_weapons_axe_projectile_sheet', 'axe_projectile'],
      },
      projectileAnimation: { primary: 'art_weapons_axe_projectile_tier1_sheet_anim', fallbacks: ['art_axe_projectile_spin'] },
      icon: { primary: 'art_weapons_axe_icon_tier1', fallbacks: ['art_weapons_axe_icon', 'axe_icon', 'axe_projectile'] },
    },
    thousand_edge: {
      projectileTexture: {
        primary: 'art_weapons_thousand_edge_projectile_tier1_sheet',
        fallbacks: ['art_weapons_thousand_edge_projectile_sheet', 'thousand_edge_projectile'],
      },
      projectileAnimation: {
        primary: 'art_weapons_thousand_edge_projectile_tier1_sheet_anim',
        fallbacks: ['art_thousand_edge_projectile_spin', 'art_knife_projectile_spin'],
      },
      icon: {
        primary: 'art_weapons_thousand_edge_icon_tier1',
        fallbacks: ['art_weapons_thousand_edge_icon', 'thousand_edge_icon', 'thousand_edge_projectile'],
      },
    },
    holy_wand: {
      projectileTexture: {
        primary: 'art_weapons_holy_wand_projectile_tier1_sheet',
        fallbacks: ['art_weapons_holy_wand_projectile_sheet', 'holy_wand_projectile'],
      },
      projectileAnimation: { primary: 'art_weapons_holy_wand_projectile_tier1_sheet_anim', fallbacks: ['art_holy_wand_projectile'] },
      icon: { primary: 'art_weapons_holy_wand_icon_tier1', fallbacks: ['art_weapons_holy_wand_icon', 'holy_wand_icon', 'holy_wand_projectile'] },
    },
    death_spiral: {
      projectileTexture: {
        primary: 'art_weapons_death_spiral_projectile_tier1_sheet',
        fallbacks: ['art_weapons_death_spiral_projectile_sheet', 'death_spiral_projectile'],
      },
      projectileAnimation: { primary: 'art_weapons_death_spiral_projectile_tier1_sheet_anim', fallbacks: ['art_death_spiral_projectile_spin'] },
      icon: {
        primary: 'art_weapons_death_spiral_icon_tier1',
        fallbacks: ['art_weapons_death_spiral_icon', 'death_spiral_icon', 'death_spiral_projectile'],
      },
    },
    unholy_vespers: {
      projectileTexture: {
        primary: 'art_weapons_unholy_vespers_projectile_tier1_sheet',
        fallbacks: ['art_weapons_unholy_vespers_orbit_book_sheet', 'unholy_vespers_orbit_book'],
      },
      projectileAnimation: { primary: 'art_weapons_unholy_vespers_projectile_tier1_sheet_anim', fallbacks: ['art_unholy_vespers_orbit_book_spin'] },
      icon: {
        primary: 'art_weapons_unholy_vespers_icon_tier1',
        fallbacks: ['art_weapons_unholy_vespers_icon', 'unholy_vespers_icon', 'unholy_vespers_orbit_book'],
      },
    },
    soul_eater: {
      projectileTexture: {
        primary: 'art_weapons_soul_eater_projectile_tier1_sheet',
        fallbacks: ['art_weapons_soul_eater_core_sheet', 'soul_eater_core'],
      },
      projectileAnimation: { primary: 'art_weapons_soul_eater_projectile_tier1_sheet_anim', fallbacks: ['art_soul_eater_core'] },
      icon: { primary: 'art_weapons_soul_eater_icon_tier1', fallbacks: ['art_weapons_soul_eater_icon', 'soul_eater_icon', 'soul_eater_core'] },
    },
    ...ADDITIONAL_WEAPON_ASSET_ENTRIES,
  } satisfies Record<string, WeaponAssetEntry>,
  passives: {
    spinach: { primary: 'art_passives_spinach_icon_tier1', fallbacks: ['art_passives_spinach_icon', 'spinach_icon'] },
    empty_tome: { primary: 'art_passives_empty_tome_icon_tier1', fallbacks: ['art_passives_empty_tome_icon', 'empty_tome_icon'] },
    bracer: { primary: 'art_passives_bracer_icon_tier1', fallbacks: ['art_passives_bracer_icon', 'bracer_icon'] },
    clover: { primary: 'art_passives_clover_icon_tier1', fallbacks: ['art_passives_clover_icon', 'clover_icon'] },
    pummarola: { primary: 'art_passives_pummarola_icon_tier1', fallbacks: ['art_passives_pummarola_icon', 'pummarola_icon'] },
    ...ADDITIONAL_PASSIVE_ASSET_ENTRIES,
  },
  pickups: {
    exp_gem: { primary: 'art_pickups_exp_gem', fallbacks: ['exp_gem'] },
    treasure_chest: { primary: 'art_pickups_treasure_chest', fallbacks: ['treasure_chest'] },
  },
  world: {
    tree: { primary: 'art_world_tree_landmark' },
    rock: { primary: 'art_world_rock_landmark' },
    grave: { primary: 'art_world_grave_landmark' },
    grass_tile: { primary: 'art_world_grass_tile' },
    ground_tile: { primary: 'art_world_ground_tile' },
    graveyard_ground_tile: {
      primary: 'art_world_graveyard_ground_tile',
      fallbacks: ['art_world_ground_tile'],
    },
    swamp_ground_tile: {
      primary: 'art_world_swamp_ground_tile',
      fallbacks: ['art_world_graveyard_ground_tile', 'art_world_ground_tile'],
    },
    ruins_ground_tile: {
      primary: 'art_world_ruins_ground_tile',
      fallbacks: ['art_world_ground_tile'],
    },
    cathedral_ground_tile: {
      primary: 'art_world_cathedral_ground_tile',
      fallbacks: ['art_world_ruins_ground_tile', 'art_world_ground_tile'],
    },
    library_ground_tile: {
      primary: 'art_world_library_ground_tile',
      fallbacks: ['art_world_cathedral_ground_tile', 'art_world_ruins_ground_tile', 'art_world_ground_tile'],
    },
    desert_ground_tile: {
      primary: 'art_world_desert_ground_tile',
      fallbacks: ['art_world_ground_tile'],
    },
    coast_ground_tile: {
      primary: 'art_world_coast_ground_tile',
      fallbacks: ['art_world_swamp_ground_tile', 'art_world_ground_tile'],
    },
    bastion_ground_tile: {
      primary: 'art_world_bastion_ground_tile',
      fallbacks: ['art_world_ruins_ground_tile', 'art_world_ground_tile'],
    },
    fungal_ground_tile: {
      primary: 'art_world_fungal_ground_tile',
      fallbacks: ['art_world_swamp_ground_tile', 'art_world_ground_tile'],
    },
    mirror_ground_tile: {
      primary: 'art_world_mirror_ground_tile',
      fallbacks: ['art_world_library_ground_tile', 'art_world_ruins_ground_tile', 'art_world_ground_tile'],
    },
  },
  effects: {
    hit_flash: {
      texture: { primary: 'art_effects_hit_flash_sheet', fallbacks: ['hit_flash'] },
      animation: { primary: 'art_hit_flash' },
    },
    boss_dash_warning: {
      texture: { primary: 'art_effects_boss_dash_warning' },
    },
    boss_dash_impact: {
      texture: { primary: 'art_effects_boss_dash_impact_sheet' },
      animation: { primary: 'art_boss_dash_impact' },
    },
    level_up_glow: {
      texture: { primary: 'art_effects_level_up_glow_sheet' },
      animation: { primary: 'art_level_up_glow' },
    },
  },
  mapMechanics: {
    visuals: {
      river: { primary: 'art_map_mechanics_river_tile' },
      swamp: { primary: 'art_map_mechanics_swamp_pool' },
      mud: { primary: 'art_map_mechanics_mud_patch' },
      ink: { primary: 'art_map_mechanics_ink_pool', fallbacks: ['art_map_mechanics_mud_patch'] },
      portalBlue: { primary: 'art_map_mechanics_portal_blue' },
      portalPurple: { primary: 'art_map_mechanics_portal_purple' },
      portalGreen: { primary: 'art_map_mechanics_portal_green' },
      portalGold: { primary: 'art_map_mechanics_portal_gold', fallbacks: ['art_map_mechanics_portal_purple'] },
      lightLamp: { primary: 'art_map_mechanics_light_lamp' },
      lightTorch: { primary: 'art_map_mechanics_light_torch' },
      lightCrystal: { primary: 'art_map_mechanics_light_crystal' },
      lightCandle: { primary: 'art_map_mechanics_light_cathedral_candle', fallbacks: ['art_map_mechanics_light_torch'] },
      lightArcaneLamp: { primary: 'art_map_mechanics_light_arcane_lamp', fallbacks: ['art_map_mechanics_light_crystal'] },
      obstacleTree: { primary: 'art_map_mechanics_obstacle_tree' },
      obstacleRock: { primary: 'art_map_mechanics_obstacle_rock' },
      obstacleGrave: { primary: 'art_map_mechanics_obstacle_grave' },
      obstacleWall: { primary: 'art_map_mechanics_obstacle_wall' },
      obstacleCathedralWall: { primary: 'art_map_mechanics_obstacle_cathedral_wall', fallbacks: ['art_map_mechanics_obstacle_wall'] },
      obstacleCathedralPillar: { primary: 'art_map_mechanics_obstacle_cathedral_pillar', fallbacks: ['art_map_mechanics_obstacle_wall'] },
      obstacleBookshelf: { primary: 'art_map_mechanics_obstacle_bookshelf', fallbacks: ['art_map_mechanics_obstacle_wall'] },
      obstacleArchivePillar: { primary: 'art_map_mechanics_obstacle_archive_pillar', fallbacks: ['art_map_mechanics_obstacle_wall'] },
      hazardSpike: { primary: 'art_map_mechanics_hazard_spike' },
      hazardFire: { primary: 'art_map_mechanics_hazard_fire' },
      hazardPoison: { primary: 'art_map_mechanics_hazard_poison' },
      altar: { primary: 'art_map_mechanics_altar_basic' },
      altarCathedral: { primary: 'art_map_mechanics_altar_cathedral', fallbacks: ['art_map_mechanics_altar_basic'] },
      altarLibrary: { primary: 'art_map_mechanics_altar_library', fallbacks: ['art_map_mechanics_altar_cathedral', 'art_map_mechanics_altar_basic'] },
      spawner: { primary: 'art_map_mechanics_spawner_nest' },
    } satisfies Record<MapMechanicVisualKind, AssetKeyEntry>,
    minimapIcons: {
      river: { primary: 'art_map_mechanics_river_minimap' },
      swamp: { primary: 'art_map_mechanics_swamp_minimap' },
      mud: { primary: 'art_map_mechanics_mud_minimap' },
      ink: { primary: 'art_map_mechanics_ink_minimap', fallbacks: ['art_map_mechanics_mud_minimap'] },
      portalBlue: { primary: 'art_map_mechanics_portal_minimap_blue' },
      portalPurple: { primary: 'art_map_mechanics_portal_minimap_purple' },
      portalGreen: { primary: 'art_map_mechanics_portal_minimap_green' },
      portalGold: { primary: 'art_map_mechanics_portal_minimap_gold', fallbacks: ['art_map_mechanics_portal_minimap_purple'] },
      light: { primary: 'art_map_mechanics_light_minimap' },
      obstacle: { primary: 'art_map_mechanics_obstacle_minimap' },
      hazard: { primary: 'art_map_mechanics_hazard_minimap' },
      altar: { primary: 'art_map_mechanics_altar_cathedral_minimap', fallbacks: ['art_map_mechanics_altar_minimap'] },
      altarLibrary: { primary: 'art_map_mechanics_altar_library_minimap', fallbacks: ['art_map_mechanics_altar_minimap'] },
      spawner: { primary: 'art_map_mechanics_spawner_minimap' },
    } satisfies Record<MapMechanicIconKind, AssetKeyEntry>,
  },
} as const;

export const TEXTURE_STATUS_KEYS: readonly string[] = [
  DEFAULT_ASSET_KEY_MAP.player.texture.primary,
  ...(DEFAULT_ASSET_KEY_MAP.player.texture.fallbacks ?? []),
  ...PLAYER_SKIN_TEXTURE_KEYS,
  ...PLAYER_SKIN_DIRECTION_TEXTURE_KEYS,
  ...PLAYER_SKIN_IMAGE_KEYS,
  ...Object.values(DEFAULT_ASSET_KEY_MAP.enemies).flatMap((entry) => [
    entry.texture.primary,
    ...(entry.texture.fallbacks ?? []),
  ]),
  ...Object.values(DEFAULT_ASSET_KEY_MAP.weapons).flatMap((entry) => [
    entry.projectileTexture?.primary,
    ...(entry.projectileTexture?.fallbacks ?? []),
    entry.icon?.primary,
    ...(entry.icon?.fallbacks ?? []),
  ].filter((key): key is string => key !== undefined)),
  ...Object.values(DEFAULT_ASSET_KEY_MAP.passives).flatMap((entry) => [
    entry.primary,
    ...(entry.fallbacks ?? []),
  ]),
  ...Object.values(DEFAULT_ASSET_KEY_MAP.pickups).flatMap((entry) => [
    entry.primary,
    ...(entry.fallbacks ?? []),
  ]),
  ...Object.values(DEFAULT_ASSET_KEY_MAP.world).map((entry) => entry.primary),
  ...Object.values(DEFAULT_ASSET_KEY_MAP.effects).flatMap((entry) => {
    const keys: string[] = [entry.texture.primary];

    if ('fallbacks' in entry.texture) {
      keys.push(...entry.texture.fallbacks);
    }

    return keys;
  }),
  ...Object.values(DEFAULT_ASSET_KEY_MAP.mapMechanics.visuals).map((entry) => entry.primary),
  ...Object.values(DEFAULT_ASSET_KEY_MAP.mapMechanics.minimapIcons).map((entry) => entry.primary),
];

export const HELP_ICON_KEYS = {
  time: 'time_icon',
  health: 'hp_icon',
  experience: 'exp_icon',
  panel: 'art_ui_panel_bg',
  treasureChest: DEFAULT_ASSET_KEY_MAP.pickups.treasure_chest.fallbacks?.[0]
    ?? DEFAULT_ASSET_KEY_MAP.pickups.treasure_chest.primary,
  boss: DEFAULT_ASSET_KEY_MAP.enemies.boss.texture.fallbacks?.[0]
    ?? DEFAULT_ASSET_KEY_MAP.enemies.boss.texture.primary,
} as const;

export const UPGRADE_DISPLAY_ICON_KEYS = {
  weapons: {
    knife: 'knife_icon',
    garlic: DEFAULT_ASSET_KEY_MAP.weapons.garlic.icon.fallbacks?.[0]
      ?? DEFAULT_ASSET_KEY_MAP.weapons.garlic.icon.primary,
    bible: DEFAULT_ASSET_KEY_MAP.weapons.bible.icon.fallbacks?.[0]
      ?? DEFAULT_ASSET_KEY_MAP.weapons.bible.icon.primary,
    axe: DEFAULT_ASSET_KEY_MAP.weapons.axe.icon.fallbacks?.[0]
      ?? DEFAULT_ASSET_KEY_MAP.weapons.axe.icon.primary,
    magic_wand: DEFAULT_ASSET_KEY_MAP.weapons.magic_wand.icon.fallbacks?.[0]
      ?? DEFAULT_ASSET_KEY_MAP.weapons.magic_wand.icon.primary,
    thousand_edge: DEFAULT_ASSET_KEY_MAP.weapons.thousand_edge.icon.fallbacks?.[0]
      ?? DEFAULT_ASSET_KEY_MAP.weapons.thousand_edge.icon.primary,
    holy_wand: DEFAULT_ASSET_KEY_MAP.weapons.holy_wand.icon.fallbacks?.[0]
      ?? DEFAULT_ASSET_KEY_MAP.weapons.holy_wand.icon.primary,
    death_spiral: DEFAULT_ASSET_KEY_MAP.weapons.death_spiral.icon.fallbacks?.[0]
      ?? DEFAULT_ASSET_KEY_MAP.weapons.death_spiral.icon.primary,
    unholy_vespers: DEFAULT_ASSET_KEY_MAP.weapons.unholy_vespers.icon.fallbacks?.[0]
      ?? DEFAULT_ASSET_KEY_MAP.weapons.unholy_vespers.icon.primary,
    soul_eater: DEFAULT_ASSET_KEY_MAP.weapons.soul_eater.icon.fallbacks?.[0]
      ?? DEFAULT_ASSET_KEY_MAP.weapons.soul_eater.icon.primary,
  },
  passives: Object.fromEntries(
    Object.entries(DEFAULT_ASSET_KEY_MAP.passives).map(([passiveId, entry]) => [
      passiveId,
      entry.fallbacks?.[0] ?? entry.primary,
    ]),
  ) as Record<string, string>,
} as const;

export const getUpgradeDisplayWeaponIconKey = (weaponId: string): string => (
  (UPGRADE_DISPLAY_ICON_KEYS.weapons as Record<string, string>)[weaponId] ?? weaponId
);

export const getUpgradeDisplayPassiveIconKey = (passiveId: string): string => (
  UPGRADE_DISPLAY_ICON_KEYS.passives[passiveId] ?? passiveId
);

export const getTieredUpgradeDisplayWeaponIconKey = (
  weaponId: string,
  visualTier: 1 | 2 | 3,
): string => `art_weapons_${weaponId}_icon_tier${visualTier}`;

export const getTieredUpgradeDisplayPassiveIconKey = (
  passiveId: string,
  visualTier: 1 | 2 | 3,
): string => `art_passives_${passiveId}_icon_tier${visualTier}`;
