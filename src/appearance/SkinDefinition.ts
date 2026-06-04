import { ThemeAssetOverrides } from './ThemeAssetOverrides';

export type SkinTargetType =
  | 'character'
  | 'weapon'
  | 'enemy'
  | 'boss'
  | 'ui'
  | 'world'
  | 'effect';

export interface SkinDefinition {
  id: string;
  targetType: SkinTargetType;
  targetId: string;
  nameKey: string;
  descriptionKey?: string;
  themeId?: string;
  assetOverrides: ThemeAssetOverrides;
}
