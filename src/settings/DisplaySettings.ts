import { DEFAULT_LOCALE, SupportedLocale } from '../i18n/Locale';

export interface DisplaySettingsData {
  locale: SupportedLocale;
  showDamageNumbers: boolean;
  showMinimap: boolean;
  showDebugOverlay: boolean;
  visualScalePreset: string;
  themeId: string;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettingsData = {
  locale: DEFAULT_LOCALE,
  showDamageNumbers: true,
  showMinimap: true,
  showDebugOverlay: false,
  visualScalePreset: 'default',
  themeId: 'default',
};
