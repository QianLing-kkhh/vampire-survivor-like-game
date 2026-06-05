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
] as const;

export type PlayerSkinId = typeof PLAYER_SKIN_IDS[number];

export const PLAYER_SKIN_TEXTURE_KEYS: readonly string[] = PLAYER_SKIN_IDS.map(
  (skinId) => `art_player_${skinId}_walk_sheet`,
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
      texture: { primary: 'slime_boss', fallbacks: ['art_enemies_slime_boss_placeholder'] },
    },
    bat_boss: {
      texture: { primary: 'bat_boss', fallbacks: ['art_enemies_bat_boss_placeholder'] },
    },
    golem_boss: {
      texture: { primary: 'golem_boss', fallbacks: ['art_enemies_golem_boss_placeholder'] },
    },
    endless_berserker: {
      texture: { primary: 'bat_boss', fallbacks: ['art_enemies_bat_boss_placeholder'] },
    },
    endless_summoner: {
      texture: { primary: 'slime_boss', fallbacks: ['art_enemies_slime_boss_placeholder'] },
    },
    endless_freezer: {
      texture: { primary: 'golem_boss', fallbacks: ['art_enemies_golem_boss_placeholder'] },
    },
    endless_sniper: {
      texture: { primary: 'bat_boss', fallbacks: ['art_enemies_bat_boss_placeholder'] },
    },
    endless_tanker: {
      texture: { primary: 'golem_boss', fallbacks: ['art_enemies_golem_boss_placeholder'] },
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
      projectileTexture: { primary: 'art_weapons_knife_projectile_sheet', fallbacks: ['knife_projectile'] },
      projectileAnimation: { primary: 'art_knife_projectile_spin' },
      icon: { primary: 'knife_icon', fallbacks: ['art_weapons_knife_projectile_sheet', 'knife_projectile'] },
    },
    garlic: {
      projectileTexture: { primary: 'art_weapons_garlic_core_sheet', fallbacks: ['garlic_icon'] },
      projectileAnimation: { primary: 'art_garlic_core' },
      icon: { primary: 'garlic_icon', fallbacks: ['art_weapons_garlic_core_sheet'] },
    },
    bible: {
      projectileTexture: {
        primary: 'art_weapons_bible_orbit_book_sheet',
        fallbacks: ['bible_orbit_projectile'],
      },
      projectileAnimation: { primary: 'art_bible_orbit_book_spin' },
      icon: { primary: 'bible_icon', fallbacks: ['art_weapons_bible_orbit_book_sheet'] },
    },
    magic_wand: {
      projectileTexture: {
        primary: 'art_weapons_magic_wand_projectile_sheet',
        fallbacks: ['magic_wand_projectile'],
      },
      projectileAnimation: { primary: 'art_magic_wand_projectile' },
      icon: { primary: 'art_weapons_magic_wand_icon', fallbacks: ['magic_wand_icon', 'magic_wand_projectile'] },
    },
    axe: {
      projectileTexture: { primary: 'art_weapons_axe_projectile_sheet', fallbacks: ['axe_projectile'] },
      projectileAnimation: { primary: 'art_axe_projectile_spin' },
      icon: { primary: 'art_weapons_axe_icon', fallbacks: ['axe_icon', 'axe_projectile'] },
    },
    thousand_edge: {
      projectileTexture: {
        primary: 'art_weapons_thousand_edge_projectile_sheet',
        fallbacks: ['thousand_edge_projectile'],
      },
      projectileAnimation: { primary: 'art_thousand_edge_projectile_spin', fallbacks: ['art_knife_projectile_spin'] },
      icon: {
        primary: 'art_weapons_thousand_edge_icon',
        fallbacks: ['thousand_edge_icon', 'thousand_edge_projectile'],
      },
    },
    holy_wand: {
      projectileTexture: {
        primary: 'art_weapons_holy_wand_projectile_sheet',
        fallbacks: ['holy_wand_projectile'],
      },
      projectileAnimation: { primary: 'art_holy_wand_projectile' },
      icon: { primary: 'art_weapons_holy_wand_icon', fallbacks: ['holy_wand_icon', 'holy_wand_projectile'] },
    },
    death_spiral: {
      projectileTexture: {
        primary: 'art_weapons_death_spiral_projectile_sheet',
        fallbacks: ['death_spiral_projectile'],
      },
      projectileAnimation: { primary: 'art_death_spiral_projectile_spin' },
      icon: {
        primary: 'art_weapons_death_spiral_icon',
        fallbacks: ['death_spiral_icon', 'death_spiral_projectile'],
      },
    },
    unholy_vespers: {
      projectileTexture: {
        primary: 'art_weapons_unholy_vespers_orbit_book_sheet',
        fallbacks: ['unholy_vespers_orbit_book'],
      },
      projectileAnimation: { primary: 'art_unholy_vespers_orbit_book_spin' },
      icon: {
        primary: 'art_weapons_unholy_vespers_icon',
        fallbacks: ['unholy_vespers_icon', 'unholy_vespers_orbit_book'],
      },
    },
    soul_eater: {
      projectileTexture: { primary: 'art_weapons_soul_eater_core_sheet', fallbacks: ['soul_eater_core'] },
      projectileAnimation: { primary: 'art_soul_eater_core' },
      icon: { primary: 'art_weapons_soul_eater_icon', fallbacks: ['soul_eater_icon', 'soul_eater_core'] },
    },
  } satisfies Record<string, WeaponAssetEntry>,
  passives: {
    spinach: { primary: 'art_passives_spinach_icon', fallbacks: ['spinach_icon'] },
    empty_tome: { primary: 'art_passives_empty_tome_icon', fallbacks: ['empty_tome_icon'] },
    bracer: { primary: 'art_passives_bracer_icon', fallbacks: ['bracer_icon'] },
    clover: { primary: 'art_passives_clover_icon', fallbacks: ['clover_icon'] },
    pummarola: { primary: 'art_passives_pummarola_icon', fallbacks: ['pummarola_icon'] },
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
} as const;

export const TEXTURE_STATUS_KEYS: readonly string[] = [
  DEFAULT_ASSET_KEY_MAP.player.texture.primary,
  ...(DEFAULT_ASSET_KEY_MAP.player.texture.fallbacks ?? []),
  ...PLAYER_SKIN_TEXTURE_KEYS,
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
];
