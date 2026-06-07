import { DEFAULT_THEME_ID } from '../appearance/ThemeDefinition';
import { DEFAULT_CONTENT_IDS } from '../content/ContentId';

import { UnlockDefinition } from './UnlockDefinition';

export const BUILT_IN_UNLOCKS: UnlockDefinition[] = [
  {
    id: 'unlock_character_default',
    type: 'character',
    targetId: DEFAULT_CONTENT_IDS.character,
    nameKey: 'unlock.character.default.name',
    defaultUnlocked: true,
  },
  {
    id: 'unlock_character_witch',
    type: 'character',
    targetId: 'witch',
    nameKey: 'unlock.character.witch.name',
  },
  {
    id: 'unlock_character_priest',
    type: 'character',
    targetId: 'priest',
    nameKey: 'unlock.character.priest.name',
  },
  {
    id: 'unlock_character_warrior',
    type: 'character',
    targetId: 'warrior',
    nameKey: 'unlock.character.warrior.name',
  },
  {
    id: 'unlock_stage_stage_001',
    type: 'stage',
    targetId: DEFAULT_CONTENT_IDS.stage,
    nameKey: 'unlock.stage.stage_001.name',
    defaultUnlocked: true,
  },
  {
    id: 'unlock_stage_graveyard_stage',
    type: 'stage',
    targetId: 'graveyard_stage',
    nameKey: 'unlock.stage.graveyard_stage.name',
  },
  {
    id: 'unlock_stage_swamp_marsh_stage',
    type: 'stage',
    targetId: 'swamp_marsh_stage',
    nameKey: 'unlock.stage.swamp_marsh_stage.name',
  },
  {
    id: 'unlock_stage_ruined_gate_stage',
    type: 'stage',
    targetId: 'ruined_gate_stage',
    nameKey: 'unlock.stage.ruined_gate_stage.name',
  },
  {
    id: 'unlock_map_prototype_field',
    type: 'map',
    targetId: DEFAULT_CONTENT_IDS.map,
    nameKey: 'unlock.map.prototype_field.name',
    defaultUnlocked: true,
  },
  {
    id: 'unlock_map_graveyard_map',
    type: 'map',
    targetId: 'graveyard_map',
    nameKey: 'unlock.map.graveyard_map.name',
  },
  {
    id: 'unlock_map_swamp_marsh_map',
    type: 'map',
    targetId: 'swamp_marsh_map',
    nameKey: 'unlock.map.swamp_marsh_map.name',
  },
  {
    id: 'unlock_map_ruined_gate_map',
    type: 'map',
    targetId: 'ruined_gate_map',
    nameKey: 'unlock.map.ruined_gate_map.name',
  },
  {
    id: 'unlock_theme_default',
    type: 'theme',
    targetId: DEFAULT_THEME_ID,
    nameKey: 'unlock.theme.default.name',
    defaultUnlocked: true,
  },
];
