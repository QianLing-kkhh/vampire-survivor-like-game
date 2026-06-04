import { ThemeAssetOverrides } from './ThemeAssetOverrides';

export const DEFAULT_THEME_ID = 'default';

export interface ThemeDefinition {
  id: string;
  nameKey: string;
  descriptionKey?: string;
  uiThemeId?: string;
  worldThemeId?: string;
  playerSkinSetId?: string;
  enemySkinSetId?: string;
  weaponSkinSetId?: string;
  passiveIconSetId?: string;
  effectSkinSetId?: string;
  assetOverrides?: ThemeAssetOverrides;
}

export const DEFAULT_THEME: ThemeDefinition = {
  id: DEFAULT_THEME_ID,
  nameKey: 'appearance.theme.default',
};
