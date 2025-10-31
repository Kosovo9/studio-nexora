export const locales = [
  'es', 'en', 'pt', 'fr', 'it', 'de', 'nl', 'sv', 'no', 'da', 'ja', 'ko'
] as const;

export type Locale = typeof locales[number];

export const defaultLocale: Locale = 'es';

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
  nl: 'Nederlands',
  sv: 'Svenska',
  no: 'Norsk',
  da: 'Dansk',
  ja: '日本語',
  ko: '한국어'
};

export const localeFlags: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇺🇸',
  pt: '🇧🇷',
  fr: '🇫🇷',
  it: '🇮🇹',
  de: '🇩🇪',
  nl: '🇳🇱',
  sv: '🇸🇪',
  no: '🇳🇴',
  da: '🇩🇰',
  ja: '🇯🇵',
  ko: '🇰🇷'
};
