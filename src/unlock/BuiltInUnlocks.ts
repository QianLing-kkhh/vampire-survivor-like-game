import { DEFAULT_THEME_ID } from '../appearance/ThemeDefinition';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';

import { UnlockDefinition } from './UnlockDefinition';

const BUILT_IN_CHARACTER_IDS = [
  DEFAULT_CONTENT_IDS.character,
  'witch',
  'priest',
  'warrior',
  'arcanist',
  'ranger',
  'engineer',
  'necromancer',
  'monk',
  'alchemist',
  'duelist',
  'geomancer',
  'stormcaller',
  'sentinel',
];

const BUILT_IN_STAGE_IDS = [
  DEFAULT_CONTENT_IDS.stage,
  'graveyard_stage',
  'swamp_marsh_stage',
  'ruined_gate_stage',
  'cursed_cathedral_stage',
  'sunken_library_stage',
  'crystal_caverns_stage',
  'ash_foundry_stage',
  'moonlit_rooftops_stage',
  'frost_monastery_stage',
  'blood_garden_stage',
  'desert_obelisk_stage',
  'storm_coast_stage',
  'clockwork_bastion_stage',
  'fungal_depths_stage',
  'mirror_labyrinth_stage',
];

const BUILT_IN_MAP_IDS = [
  DEFAULT_CONTENT_IDS.map,
  'graveyard_map',
  'swamp_marsh_map',
  'ruined_gate_map',
  'cursed_cathedral_map',
  'sunken_library_map',
  'crystal_caverns_map',
  'ash_foundry_map',
  'moonlit_rooftops_map',
  'frost_monastery_map',
  'blood_garden_map',
  'desert_obelisk_map',
  'storm_coast_map',
  'clockwork_bastion_map',
  'fungal_depths_map',
  'mirror_labyrinth_map',
];

export const BUILT_IN_UNLOCKS: UnlockDefinition[] = [
  ...BUILT_IN_CHARACTER_IDS.map((characterId) => ({
    id: `unlock_character_${characterId}`,
    type: 'character' as const,
    targetId: characterId,
    nameKey: `unlock.character.${characterId}.name`,
    defaultUnlocked: true,
  })),
  ...BUILT_IN_STAGE_IDS.map((stageId) => ({
    id: `unlock_stage_${stageId}`,
    type: 'stage' as const,
    targetId: stageId,
    nameKey: `unlock.stage.${stageId}.name`,
    defaultUnlocked: true,
  })),
  ...BUILT_IN_MAP_IDS.map((mapId) => ({
    id: `unlock_map_${mapId}`,
    type: 'map' as const,
    targetId: mapId,
    nameKey: `unlock.map.${mapId}.name`,
    defaultUnlocked: true,
  })),
  {
    id: 'unlock_theme_default',
    type: 'theme',
    targetId: DEFAULT_THEME_ID,
    nameKey: 'unlock.theme.default.name',
    defaultUnlocked: true,
  },
];
