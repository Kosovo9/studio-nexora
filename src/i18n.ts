import { getRequestConfig } from 'next-intl/server';
import { locales, type Locale } from './i18n/config';

export default getRequestConfig(async ({ requestLocale }) => {
  // This function can be called before the locale is available
  let locale = await requestLocale;
  
  // Provide a fallback locale if none is available
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en';
  }

  return {
    locale,
    messages: (await import(`./i18n/messages/${locale}.json`)).default
  };
});