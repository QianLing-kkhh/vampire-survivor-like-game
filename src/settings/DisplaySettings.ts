import { DEFAULT_LOCALE, SupportedLocale } from '../i18n/Locale';
import { UIStyle } from '../ui/theme/UIStyle';
import { AssetStyle, DisplayQuality } from '../visual/DisplayQuality';

export type VisualModelScale = 1 | 1.5 | 2;

export interface DisplaySettingsData {
  locale: SupportedLocale;
  showDamageNumbers: boolean;
  showMinimap: boolean;
  showDebugOverlay: boolean;
  visualScalePreset: string;
  themeId: string;
  displayQuality: DisplayQuality;
  assetStyle: AssetStyle;
  uiStyle: UIStyle;
  shadowsEnabled: boolean;
  visualModelScale: VisualModelScale;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettingsData = {
  locale: DEFAULT_LOCALE,
  showDamageNumbers: true,
  showMinimap: true,
  showDebugOverlay: false,
  visualScalePreset: 'default',
  themeId: 'default',
  displayQuality: 'high',
  assetStyle: 'newArt',
  uiStyle: 'classic',
  shadowsEnabled: true,
  visualModelScale: 1,
};
