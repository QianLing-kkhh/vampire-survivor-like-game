export const SUPPORTED_LOCALES = ['en-US', 'zh-CN', 'ja-JP'] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

export const LOCALE_DISPLAY_NAMES: Record<SupportedLocale, string> = {
  'en-US': 'English',
  'zh-CN': '简体中文',
  'ja-JP': '日本語',
};

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === 'string'
    && SUPPORTED_LOCALES.includes(value as SupportedLocale);
}
