import { DEFAULT_LOCALE, SupportedLocale } from '../i18n/Locale';
import { AssetStyle, DisplayQuality } from '../visual/DisplayQuality';

export interface DisplaySettingsData {
  locale: SupportedLocale;
  showDamageNumbers: boolean;
  showMinimap: boolean;
  showDebugOverlay: boolean;
  visualScalePreset: string;
  themeId: string;
  displayQuality: DisplayQuality;
  assetStyle: AssetStyle;
  shadowsEnabled: boolean;
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
  shadowsEnabled: true,
};
