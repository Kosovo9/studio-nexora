/**
 * NEXORA INTERNATIONALIZATION SYSTEM
 * 12 Global Languages with RTL/LTR Support
 */

import { z } from 'zod';

export const SupportedLanguages = {
  en: { name: 'English', nativeName: 'English', rtl: false, flag: '🇺🇸' },
  es: { name: 'Spanish', nativeName: 'Español', rtl: false, flag: '🇪🇸' },
  fr: { name: 'French', nativeName: 'Français', rtl: false, flag: '🇫🇷' },
  de: { name: 'German', nativeName: 'Deutsch', rtl: false, flag: '🇩🇪' },
  it: { name: 'Italian', nativeName: 'Italiano', rtl: false, flag: '🇮🇹' },
  pt: { name: 'Portuguese', nativeName: 'Português', rtl: false, flag: '🇵🇹' },
  ru: { name: 'Russian', nativeName: 'Русский', rtl: false, flag: '🇷🇺' },
  zh: { name: 'Chinese', nativeName: '中文', rtl: false, flag: '🇨🇳' },
  ja: { name: 'Japanese', nativeName: '日本語', rtl: false, flag: '🇯🇵' },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true, flag: '🇸🇦' },
  he: { name: 'Hebrew', nativeName: 'עברית', rtl: true, flag: '🇮🇱' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', rtl: false, flag: '🇮🇳' },
} as const;

export type LanguageCode = keyof typeof SupportedLanguages;

export const translations = {
  en: {
    // Navigation
    home: 'Home',
    about: 'About',
    services: 'Services',
    contact: 'Contact',
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',
    
    // Buttons
    getStarted: 'Get Started',
    learnMore: 'Learn More',
    tryNow: 'Try Now',
    download: 'Download',
    upload: 'Upload',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    
    // Forms
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    firstName: 'First Name',
    lastName: 'Last Name',
    phoneNumber: 'Phone Number',
    
    // Messages
    welcome: 'Welcome to Nexora Studio',
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Success!',
    
    // Payment
    paymentIndicator: '20% Payment Required',
    subscriptionActive: 'Subscription Active',
    upgradeNow: 'Upgrade Now',
    
    // Footer
    disclaimer: 'This website and its services are provided "as is" without any warranties. By using our services, you agree to our terms and conditions. Nexora Studio is not responsible for any damages or losses.',
    allRightsReserved: 'All rights reserved',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    
    // Affiliation
    affiliateProgram: 'Affiliate Program',
    referralCode: 'Referral Code',
    earnCommission: 'Earn Commission',
  },
  es: {
    // Navigation
    home: 'Inicio',
    about: 'Acerca de',
    services: 'Servicios',
    contact: 'Contacto',
    login: 'Iniciar Sesión',
    signup: 'Registrarse',
    logout: 'Cerrar Sesión',
    
    // Buttons
    getStarted: 'Comenzar',
    learnMore: 'Saber Más',
    tryNow: 'Probar Ahora',
    download: 'Descargar',
    upload: 'Subir',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    delete: 'Eliminar',
    edit: 'Editar',
    
    // Forms
    email: 'Correo Electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    firstName: 'Nombre',
    lastName: 'Apellido',
    phoneNumber: 'Número de Teléfono',
    
    // Messages
    welcome: 'Bienvenido a Nexora Studio',
    loading: 'Cargando...',
    error: 'Ocurrió un error',
    success: '¡Éxito!',
    
    // Payment
    paymentIndicator: 'Pago del 20% Requerido',
    subscriptionActive: 'Suscripción Activa',
    upgradeNow: 'Actualizar Ahora',
    
    // Footer
    disclaimer: 'Este sitio web y sus servicios se proporcionan "tal como están" sin garantías. Al usar nuestros servicios, acepta nuestros términos y condiciones. Nexora Studio no es responsable de daños o pérdidas.',
    allRightsReserved: 'Todos los derechos reservados',
    privacyPolicy: 'Política de Privacidad',
    termsOfService: 'Términos de Servicio',
    
    // Affiliation
    affiliateProgram: 'Programa de Afiliados',
    referralCode: 'Código de Referencia',
    earnCommission: 'Ganar Comisión',
  },
  // ... (I'll add more languages in the next part)
} as const;

// Language detection and management
export class NexoraI18n {
  private static instance: NexoraI18n;
  private currentLanguage: LanguageCode = 'en';
  private fallbackLanguage: LanguageCode = 'en';

  private constructor() {
    this.detectLanguage();
  }

  public static getInstance(): NexoraI18n {
    if (!NexoraI18n.instance) {
      NexoraI18n.instance = new NexoraI18n();
    }
    return NexoraI18n.instance;
  }

  private detectLanguage(): void {
    // Browser language detection
    const browserLang = navigator.language.split('-')[0] as LanguageCode;
    
    // Local storage preference
    const storedLang = localStorage.getItem('nexora-language') as LanguageCode;
    
    // URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang') as LanguageCode;

    // Priority: URL > Stored > Browser > Default
    const detectedLang = urlLang || storedLang || browserLang || 'en';
    
    if (this.isValidLanguage(detectedLang)) {
      this.setLanguage(detectedLang);
    }
  }

  private isValidLanguage(lang: string): lang is LanguageCode {
    return lang in SupportedLanguages;
  }

  public setLanguage(lang: LanguageCode): void {
    this.currentLanguage = lang;
    localStorage.setItem('nexora-language', lang);
    
    // Update document attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = SupportedLanguages[lang].rtl ? 'rtl' : 'ltr';
    
    // Dispatch language change event
    window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: lang } }));
  }

  public getCurrentLanguage(): LanguageCode {
    return this.currentLanguage;
  }

  public translate(key: string): string {
    const keys = key.split('.');
    let value: any = translations[this.currentLanguage];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    // Fallback to English if translation not found
    if (!value && this.currentLanguage !== this.fallbackLanguage) {
      value = translations[this.fallbackLanguage];
      for (const k of keys) {
        value = value?.[k];
      }
    }
    
    return value || key;
  }

  public getLanguageInfo(lang?: LanguageCode) {
    return SupportedLanguages[lang || this.currentLanguage];
  }

  public getAllLanguages() {
    return Object.entries(SupportedLanguages).map(([code, info]) => ({
      code: code as LanguageCode,
      ...info,
    }));
  }
}

// Export singleton instance
export const i18n = NexoraI18n.getInstance();

// React hook for translations
export const useTranslation = () => {
  const [language, setLanguage] = React.useState(i18n.getCurrentLanguage());

  React.useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setLanguage(event.detail.language);
    };

    window.addEventListener('languageChange', handleLanguageChange as EventListener);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener);
    };
  }, []);

  return {
    t: (key: string) => i18n.translate(key),
    language,
    setLanguage: (lang: LanguageCode) => i18n.setLanguage(lang),
    languages: i18n.getAllLanguages(),
    isRTL: SupportedLanguages[language].rtl,
  };
};