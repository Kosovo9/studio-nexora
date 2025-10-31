export const LOCALES = ['es', 'en', 'pt', 'fr', 'it', 'de', 'nl', 'sv', 'no', 'da', 'ja', 'ko', 'zh'] as const;
export const DEFAULT_LOCALE = 'es' as const;

export type Locale = typeof LOCALES[number];

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}
