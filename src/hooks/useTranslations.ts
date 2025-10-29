'use client';

import { usePathname } from 'next/navigation';
import { locales, defaultLocale, type Locale } from '@/i18n/config';

// Import all translations
import esMessages from '@/i18n/messages/es.json';
import enMessages from '@/i18n/messages/en.json';

const messages = {
  es: esMessages,
  en: enMessages,
  // For now, fallback other languages to English
  pt: enMessages,
  fr: enMessages,
  it: enMessages,
  de: enMessages,
  nl: enMessages,
  sv: enMessages,
  no: enMessages,
  da: enMessages,
  ja: enMessages,
  ko: enMessages,
};

export function useTranslations() {
  const pathname = usePathname();
  
  // Extract locale from pathname
  const locale = locales.find(loc => pathname.startsWith(`/${loc}`)) || defaultLocale;
  
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = messages[locale as keyof typeof messages];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    // Fallback to English if translation not found
    if (!value && locale !== 'en') {
      let fallbackValue: any = messages.en;
      for (const k of keys) {
        fallbackValue = fallbackValue?.[k];
      }
      value = fallbackValue;
    }
    
    return value || key;
  };

  return { t, locale: locale as Locale };
}