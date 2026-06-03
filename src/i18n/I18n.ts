import enUS from './translations/en-US.json';
import jaJP from './translations/ja-JP.json';
import zhCN from './translations/zh-CN.json';
import {
  DEFAULT_LOCALE,
  LOCALE_DISPLAY_NAMES,
  SUPPORTED_LOCALES,
  SupportedLocale,
} from './Locale';
import { PlaytestSettings } from '../settings/PlaytestSettings';

type TranslationNode = string | { [key: string]: TranslationNode };
type TranslationMap = { [key: string]: TranslationNode };
type Params = Record<string, string | number>;

const TRANSLATIONS: Record<SupportedLocale, TranslationMap> = {
  'en-US': enUS,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
};

export class I18n {
  static getLocale(): SupportedLocale {
    return PlaytestSettings.get().locale;
  }

  static getLocaleDisplayName(locale: SupportedLocale = I18n.getLocale()): string {
    return LOCALE_DISPLAY_NAMES[locale];
  }

  static setLocale(locale: SupportedLocale): SupportedLocale {
    return PlaytestSettings.setLocale(locale).locale;
  }

  static cycleLocale(): SupportedLocale {
    const currentLocale = I18n.getLocale();
    const currentIndex = SUPPORTED_LOCALES.indexOf(currentLocale);
    const nextLocale = SUPPORTED_LOCALES[(currentIndex + 1) % SUPPORTED_LOCALES.length];

    return I18n.setLocale(nextLocale);
  }

  static t(key: string, params: Params = {}): string {
    const currentLocale = I18n.getLocale();
    const text = I18n.resolve(TRANSLATIONS[currentLocale], key)
      ?? I18n.resolve(TRANSLATIONS[DEFAULT_LOCALE], key)
      ?? key;

    return I18n.interpolate(text, params);
  }

  private static resolve(translations: TranslationMap, key: string): string | undefined {
    const value = key.split('.').reduce<TranslationNode | undefined>((node, part) => {
      if (!node || typeof node === 'string') {
        return undefined;
      }

      return node[part];
    }, translations);

    return typeof value === 'string' ? value : undefined;
  }

  private static interpolate(text: string, params: Params): string {
    return text.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name];

      return value === undefined ? match : String(value);
    });
  }
}
