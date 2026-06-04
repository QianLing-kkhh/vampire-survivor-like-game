import { DEFAULT_THEME_ID } from './ThemeDefinition';

export interface AppearanceSelection {
  selectedThemeId: string;
  selectedCharacterSkinByCharacterId: Record<string, string>;
  selectedWeaponSkinByWeaponId: Record<string, string>;
  selectedEnemySkinByEnemyId: Record<string, string>;
  selectedUiThemeId?: string;
  selectedWorldThemeId?: string;
}

export const DEFAULT_APPEARANCE_SELECTION: AppearanceSelection = {
  selectedThemeId: DEFAULT_THEME_ID,
  selectedCharacterSkinByCharacterId: {},
  selectedWeaponSkinByWeaponId: {},
  selectedEnemySkinByEnemyId: {},
};
