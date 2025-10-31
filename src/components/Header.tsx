'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Sparkles, 
  Home, 
  Image, 
  CreditCard, 
  Info, 
  Mail, 
  User, 
  Settings,
  Shield,
  FileText,
  Users,
  Globe,
  Zap
} from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { ReliableButton } from './ReliableButton';
import { cn } from '@/lib/utils';

interface HeaderProps {
  currentLocale?: string;
  isAuthenticated?: boolean;
  userRole?: 'user' | 'admin' | 'premium';
  className?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
  adminOnly?: boolean;
  external?: boolean;
}

function Header({ 
  currentLocale = 'en', 
  isAuthenticated = false, 
  userRole = 'user',
  className 
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = [
    {
      href: `/${currentLocale}`,
      label: 'Home',
      icon: <Home className="w-4 h-4" />
    },
    {
      href: `/${currentLocale}/gallery`,
      label: 'Gallery',
      icon: <Image className="w-4 h-4" />
    },
    {
      href: `/${currentLocale}/pricing`,
      label: 'Pricing',
      icon: <CreditCard className="w-4 h-4" />
    },
    {
      href: `/${currentLocale}/about`,
      label: 'About',
      icon: <Info className="w-4 h-4" />
    },
    {
      href: `/${currentLocale}/contact`,
      label: 'Contact',
      icon: <Mail className="w-4 h-4" />
    },
    {
      href: `/${currentLocale}/affiliates`,
      label: 'Affiliates',
      icon: <Users className="w-4 h-4" />
    },
    {
      href: `/${currentLocale}/legal`,
      label: 'Legal',
      icon: <FileText className="w-4 h-4" />
    }
  ];

  const authNavItems: NavItem[] = [
    {
      href: `/${currentLocale}/profile`,
      label: 'Profile',
      icon: <User className="w-4 h-4" />,
      requiresAuth: true
    },
    {
      href: `/${currentLocale}/settings`,
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      requiresAuth: true
    },
    {
      href: `/${currentLocale}/admin`,
      label: 'Admin',
      icon: <Shield className="w-4 h-4" />,
      requiresAuth: true,
      adminOnly: true
    }
  ];

  const isActiveRoute = (href: string) => {
    if (href === `/${currentLocale}`) {
      return pathname === href || pathname === `/${currentLocale}/`;
    }
    return pathname.startsWith(href);
  };

  const filteredAuthItems = authNavItems.filter(item => {
    if (!isAuthenticated && item.requiresAuth) return false;
    if (item.adminOnly && userRole !== 'admin') return false;
    return true;
  });

  return (
    <header 
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled 
          ? 'bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 shadow-lg' 
          : 'bg-transparent',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            href={`/${currentLocale}`}
            className="flex items-center space-x-2 group"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Nexora Studio
              </h1>
              <p className="text-xs text-gray-400 -mt-1">AI Photo Studio</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActiveRoute(item.href)
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <LanguageSelector 
              currentLocale={currentLocale}
              variant="header"
              showSearch={false}
              showStats={false}
            />

            {/* Auth Actions */}
            {isAuthenticated ? (
              <div className="hidden lg:flex items-center space-x-2">
                {filteredAuthItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActiveRoute(item.href)
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    )}
                  >
                    {item.icon}
                    <span className="hidden xl:inline">{item.label}</span>
                  </Link>
                ))}
                <ReliableButton
                  variant="secondary"
                  size="sm"
                  onClick={() => {/* Handle logout */}}
                  className="ml-2"
                >
                  Logout
                </ReliableButton>
              </div>
            ) : (
              <div className="hidden lg:flex items-center space-x-2">
                <Link href={`/${currentLocale}/auth/signin`}>
                  <ReliableButton variant="secondary" size="sm">
                    Sign In
                  </ReliableButton>
                </Link>
                <Link href={`/${currentLocale}/auth/signup`}>
                  <ReliableButton variant="primary" size="sm">
                    Get Started
                  </ReliableButton>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu Panel */}
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-16 right-0 bottom-0 w-80 bg-gray-900/95 backdrop-blur-md border-l border-gray-700 lg:hidden overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {/* Navigation Links */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Navigation
                  </h3>
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                        isActiveRoute(item.href)
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800'
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>

                {/* Auth Section */}
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                      Account
                    </h3>
                    {filteredAuthItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                          isActiveRoute(item.href)
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:text-white hover:bg-gray-800'
                        )}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ))}
                    <div className="pt-2">
                      <ReliableButton
                        variant="danger"
                        size="sm"
                        fullWidth
                        onClick={() => {/* Handle logout */}}
                      >
                        Logout
                      </ReliableButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                      Get Started
                    </h3>
                    <Link href={`/${currentLocale}/auth/signin`}>
                      <ReliableButton variant="secondary" size="md" fullWidth>
                        Sign In
                      </ReliableButton>
                    </Link>
                    <Link href={`/${currentLocale}/auth/signup`}>
                      <ReliableButton variant="primary" size="md" fullWidth>
                        Create Account
                      </ReliableButton>
                    </Link>
                  </div>
                )}

                {/* Footer Info */}
                <div className="pt-6 border-t border-gray-700">
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Zap className="w-4 h-4" />
                    <span>Powered by AI</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-400 mt-2">
                    <Globe className="w-4 h-4" />
                    <span>Available in 12 languages</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}


export default Header;