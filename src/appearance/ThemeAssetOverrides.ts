export interface ThemeAssetOverrides {
  textures?: Record<string, string>;
  animations?: Record<string, string>;
  icons?: Record<string, string>;
  ui?: Record<string, string>;
  world?: Record<string, string>;
  audio?: Record<string, string>;
}

export type ThemeAssetOverrideDomain = keyof ThemeAssetOverrides;
