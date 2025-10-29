'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  ChevronDown, 
  Check, 
  Search, 
  Star, 
  TrendingUp,
  Users,
  Zap,
  Shield,
  Volume2,
  VolumeX
} from 'lucide-react';
import Cookies from 'js-cookie';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
  popularity?: number;
  region?: string;
  completion?: number;
  beta?: boolean;
  premium?: boolean;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', popularity: 100, region: 'Global', completion: 100 },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', popularity: 95, region: 'Americas, Europe', completion: 100 },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷', popularity: 85, region: 'Americas, Europe', completion: 95 },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', popularity: 90, region: 'Europe, Africa', completion: 98 },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', popularity: 80, region: 'Europe', completion: 95 },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', popularity: 75, region: 'Europe', completion: 90 },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', popularity: 85, region: 'Asia', completion: 92 },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', popularity: 70, region: 'Asia', completion: 88 },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', popularity: 95, region: 'Asia', completion: 94 },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', popularity: 80, region: 'Middle East, Africa', completion: 85, rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', popularity: 75, region: 'Asia', completion: 80, beta: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', popularity: 70, region: 'Europe, Asia', completion: 82, beta: true },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', popularity: 60, region: 'Europe', completion: 75, premium: true },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', popularity: 55, region: 'Europe', completion: 70, premium: true },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', popularity: 50, region: 'Europe', completion: 68, premium: true },
];

interface LanguageSelectorProps {
  currentLocale: string;
  variant?: 'header' | 'footer' | 'mobile' | 'premium';
  showSearch?: boolean;
  showStats?: boolean;
  showRegions?: boolean;
  autoDetect?: boolean;
  soundEnabled?: boolean;
  onLanguageChange?: (language: Language) => void;
}

export function LanguageSelector({ 
  currentLocale, 
  variant = 'header',
  showSearch = true,
  showStats = true,
  showRegions = false,
  autoDetect = true,
  soundEnabled = false,
  onLanguageChange
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>(languages[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLanguages, setFilteredLanguages] = useState(languages);
  const [recentLanguages, setRecentLanguages] = useState<string[]>([]);
  const [favoriteLanguages, setFavoriteLanguages] = useState<string[]>([]);
  const [soundOn, setSoundOn] = useState(soundEnabled);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Auto-detect browser language
  useEffect(() => {
    if (!autoDetect) return;
    
    const detectLanguage = () => {
      const savedLanguage = Cookies.get('language') || currentLocale;
      const language = languages.find(lang => lang.code === savedLanguage) || languages[0];
      setCurrentLanguage(language);
      
      // Load recent languages
      const recent = JSON.parse(localStorage.getItem('recentLanguages') || '[]');
      setRecentLanguages(recent);
      
      // Load favorite languages
      const favorites = JSON.parse(localStorage.getItem('favoriteLanguages') || '[]');
      setFavoriteLanguages(favorites);
    };

    detectLanguage();
  }, [autoDetect, currentLocale]);

  // Filter languages based on search
  useEffect(() => {
    const filtered = languages.filter(lang => 
      lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lang.region && lang.region.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredLanguages(filtered);
  }, [searchTerm]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, showSearch]);

  const playSound = useCallback((type: 'click' | 'change' | 'error') => {
    if (!soundOn) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = { click: 800, change: 1000, error: 400 };
      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Sound not available:', error);
    }
  }, [soundOn]);

  const handleLocaleChange = useCallback((language: Language) => {
    playSound('change');
    
    setCurrentLanguage(language);
    Cookies.set('locale', language.code, { expires: 365 });
    
    // Update recent languages
    const recent = [language.code, ...recentLanguages.filter(code => code !== language.code)].slice(0, 5);
    setRecentLanguages(recent);
    localStorage.setItem('recentLanguages', JSON.stringify(recent));
    
    // Get current path without locale
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '') || '/';
    
    // Navigate to new locale
    router.push(`/${language.code}${pathWithoutLocale}`);
    setIsOpen(false);
    setSearchTerm('');
    
    // Call custom handler
    onLanguageChange?.(language);
    
    // Apply RTL if needed
    if (language.rtl) {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = language.code;
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = language.code;
    }
  }, [playSound, recentLanguages, onLanguageChange, pathname, currentLocale, router]);

  const toggleFavorite = useCallback((languageCode: string, event: React.MouseEvent) => {
    event.stopPropagation();
    playSound('click');
    
    const newFavorites = favoriteLanguages.includes(languageCode)
      ? favoriteLanguages.filter(code => code !== languageCode)
      : [...favoriteLanguages, languageCode];
    
    setFavoriteLanguages(newFavorites);
    localStorage.setItem('favoriteLanguages', JSON.stringify(newFavorites));
  }, [favoriteLanguages, playSound]);

  const getVariantClasses = () => {
    switch (variant) {
      case 'footer':
        return 'flex items-center gap-2 px-2 py-1 text-sm text-gray-400 hover:text-white transition-colors';
      case 'mobile':
        return 'flex items-center gap-2 px-3 py-2 text-base w-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 rounded-lg';
      case 'premium':
        return 'flex items-center gap-2 px-4 py-3 text-base bg-gradient-to-r from-gold-50 to-gold-100 border-gold-300 hover:from-gold-100 hover:to-gold-200 transition-all duration-200 rounded-lg';
      default:
        return 'flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200';
    }
  };

  const sortedLanguages = [...filteredLanguages].sort((a, b) => {
    // Favorites first
    const aFav = favoriteLanguages.includes(a.code);
    const bFav = favoriteLanguages.includes(b.code);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    
    // Recent languages next
    const aRecent = recentLanguages.indexOf(a.code);
    const bRecent = recentLanguages.indexOf(b.code);
    if (aRecent !== -1 && bRecent === -1) return -1;
    if (aRecent === -1 && bRecent !== -1) return 1;
    if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
    
    // Then by popularity
    return (b.popularity || 0) - (a.popularity || 0);
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => {
          playSound('click');
          setIsOpen(!isOpen);
        }}
        className={getVariantClasses()}
        aria-label="Select language"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Globe className="w-4 h-4" />
        <span className="text-sm font-medium flex items-center gap-1">
          <span className="text-lg">{currentLanguage.flag}</span>
          <span className="hidden sm:inline">{currentLanguage.nativeName}</span>
          {currentLanguage.beta && (
            <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">BETA</span>
          )}
          {currentLanguage.premium && (
            <span className="text-xs bg-gold-100 text-gold-800 px-1 rounded">PRO</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {soundEnabled && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setSoundOn(!soundOn);
            }}
            className="ml-2 p-1 rounded hover:bg-white/20 cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setSoundOn(!soundOn);
              }
            }}
          >
            {soundOn ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 right-0 z-50 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white flex items-center space-x-2">
                    <Globe className="w-4 h-4" />
                    <span>Select Language</span>
                  </h3>
                  {showStats && (
                    <div className="text-xs text-gray-400">
                      {filteredLanguages.length} languages
                    </div>
                  )}
                </div>
                
                {/* Search */}
                {showSearch && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search languages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-white placeholder-gray-400"
                    />
                  </div>
                )}
              </div>

              {/* Language List */}
              <div className="max-h-64 overflow-y-auto">
                {/* Favorites Section */}
                {favoriteLanguages.length > 0 && !searchTerm && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-400 mb-2 px-2 flex items-center space-x-1">
                      <Star className="w-3 h-3" />
                      <span>Favorites</span>
                    </div>
                    {languages.filter(lang => favoriteLanguages.includes(lang.code)).map((language) => (
                      <LanguageItem
                        key={`fav-${language.code}`}
                        language={language}
                        currentLanguage={currentLanguage}
                        onSelect={handleLocaleChange}
                        onToggleFavorite={toggleFavorite}
                        isFavorite={true}
                        showStats={showStats}
                        showRegions={showRegions}
                      />
                    ))}
                    <div className="border-t border-gray-700 my-2" />
                  </div>
                )}

                {/* Recent Section */}
                {recentLanguages.length > 0 && !searchTerm && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-400 mb-2 px-2 flex items-center space-x-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Recent</span>
                    </div>
                    {languages.filter(lang => recentLanguages.includes(lang.code)).map((language) => (
                      <LanguageItem
                        key={`recent-${language.code}`}
                        language={language}
                        currentLanguage={currentLanguage}
                        onSelect={handleLocaleChange}
                        onToggleFavorite={toggleFavorite}
                        isFavorite={favoriteLanguages.includes(language.code)}
                        showStats={showStats}
                        showRegions={showRegions}
                      />
                    ))}
                    <div className="border-t border-gray-700 my-2" />
                  </div>
                )}

                {/* All Languages */}
                <div className="p-2">
                  {!searchTerm && (
                    <div className="text-xs font-medium text-gray-400 mb-2 px-2 flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>All Languages</span>
                    </div>
                  )}
                  {sortedLanguages.map((language) => (
                    <LanguageItem
                      key={language.code}
                      language={language}
                      currentLanguage={currentLanguage}
                      onSelect={handleLocaleChange}
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favoriteLanguages.includes(language.code)}
                      showStats={showStats}
                      showRegions={showRegions}
                    />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-700 bg-gray-800/50 text-xs text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Missing a language? Let us know!</span>
                  <div className="flex items-center space-x-2">
                    <Shield className="w-3 h-3" />
                    <span>Secure</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LanguageItemProps {
  language: Language;
  currentLanguage: Language;
  onSelect: (language: Language) => void;
  onToggleFavorite: (code: string, event: React.MouseEvent) => void;
  isFavorite: boolean;
  showStats: boolean;
  showRegions: boolean;
}

function LanguageItem({ 
  language, 
  currentLanguage, 
  onSelect, 
  onToggleFavorite, 
  isFavorite, 
  showStats, 
  showRegions 
}: LanguageItemProps) {
  return (
    <motion.button
      onClick={() => onSelect(language)}
      className={`
        w-full px-3 py-2 text-left flex items-center justify-between rounded-lg
        hover:bg-gray-800 transition-colors duration-150 group
        ${currentLanguage.code === language.code ? 'bg-gray-800 text-blue-400 ring-1 ring-blue-500' : 'text-gray-300'}
      `}
      whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
    >
      <div className="flex items-center space-x-3 flex-1">
        <span className="text-lg">{language.flag}</span>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{language.nativeName}</span>
            {language.beta && (
              <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">BETA</span>
            )}
            {language.premium && (
              <span className="text-xs bg-gold-100 text-gold-800 px-1 rounded">PRO</span>
            )}
          </div>
          <div className="text-sm text-gray-500 flex items-center space-x-2">
            <span>{language.name}</span>
            {showRegions && language.region && (
              <>
                <span>•</span>
                <span>{language.region}</span>
              </>
            )}
          </div>
          {showStats && (
            <div className="flex items-center space-x-3 mt-1">
              <div className="flex items-center space-x-1">
                <div className="w-16 h-1 bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${language.completion}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">{language.completion}%</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-400">{language.popularity}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <div
          onClick={(e) => onToggleFavorite(language.code, e)}
          className="p-1 rounded hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleFavorite(language.code, e as any);
            }
          }}
        >
          <Star 
            className={`w-4 h-4 ${isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} 
          />
        </div>
        {currentLanguage.code === language.code && (
          <Check className="w-4 h-4 text-blue-400" />
        )}
      </div>
    </motion.button>
  );
}