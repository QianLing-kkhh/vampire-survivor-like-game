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
    defaultUnlocked: true,
  },
  {
    id: 'unlock_character_priest',
    type: 'character',
    targetId: 'priest',
    nameKey: 'unlock.character.priest.name',
    defaultUnlocked: true,
  },
  {
    id: 'unlock_character_warrior',
    type: 'character',
    targetId: 'warrior',
    nameKey: 'unlock.character.warrior.name',
    defaultUnlocked: true,
  },
  {
    id: 'unlock_stage_stage_001',
    type: 'stage',
    targetId: DEFAULT_CONTENT_IDS.stage,
    nameKey: 'unlock.stage.stage_001.name',
    defaultUnlocked: true,
  },
  {
    id: 'unlock_map_prototype_field',
    type: 'map',
    targetId: DEFAULT_CONTENT_IDS.map,
    nameKey: 'unlock.map.prototype_field.name',
    defaultUnlocked: true,
  },
  {
    id: 'unlock_theme_default',
    type: 'theme',
    targetId: DEFAULT_THEME_ID,
    nameKey: 'unlock.theme.default.name',
    defaultUnlocked: true,
  },
];
