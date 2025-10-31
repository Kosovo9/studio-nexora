import { getRequestConfig } from 'next-intl/server';
import { LOCALES, DEFAULT_LOCALE, isValidLocale } from './i18n/locales';

export default getRequestConfig(async ({ locale }) => {
  // Validar que el locale es válido
  if (!isValidLocale(locale)) {
    locale = DEFAULT_LOCALE;
  }

  return {
    messages: (await import(`./i18n/messages/${locale}.json`)).default
  };
});

export { LOCALES, DEFAULT_LOCALE };