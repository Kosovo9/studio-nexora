'use client'
/**
 * NEXORA FOOTER COMPONENT - SAFE-SHIP MODE
 * Professional multi-language disclaimer and links with 12 languages
 * Legal disclaimers, terms, privacy, refunds, IP, AI usage, watermarks, security 
 */

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { PaymentIndicator } from './PaymentIndicator';
import { LanguageSelector } from './LanguageSelector';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface FooterProps {
  isUserSubscribed?: boolean;
  showAffiliateInfo?: boolean;
  className?: string;
}

const Footer: React.FC<FooterProps> = ({
  isUserSubscribed = false,
  showAffiliateInfo = true,
  className,
}) => {
  const t = useTranslations('common');
  const locale = useLocale();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 text-white py-12 px-4',
        className
      )}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold">Nexora Studio</span>
            </div>
            <p className="text-gray-300 text-sm">
              {t('footerDescription') || 'Professional AI-powered photo studio for creating stunning portraits.'}
            </p>
            <LanguageSelector />
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('legal') || 'Legal'}</h3>
            <div className="space-y-2">
              <Link href={`/${locale}/legal/terms`} className="block text-gray-300 hover:text-white transition-colors text-sm">
                {t('terms') || 'Terms of Service'}
              </Link>
              <Link href={`/${locale}/legal/privacy`} className="block text-gray-300 hover:text-white transition-colors text-sm">
                {t('privacy') || 'Privacy Policy'}
              </Link>
              <Link href={`/${locale}/legal/refunds`} className="block text-gray-300 hover:text-white transition-colors text-sm">
                {t('refunds') || 'Refund Policy'}
              </Link>
              <Link href={`/${locale}/legal/ip`} className="block text-gray-300 hover:text-white transition-colors text-sm">
                {t('intellectualProperty') || 'Intellectual Property'}
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('support') || 'Support'}</h3>
            <div className="space-y-2">
              <Link href={`/${locale}/help`} className="block text-gray-300 hover:text-white transition-colors text-sm">
                {t('help') || 'Help Center'}
              </Link>
              <Link href={`/${locale}/contact`} className="block text-gray-300 hover:text-white transition-colors text-sm">
                {t('contact') || 'Contact Us'}
              </Link>
              <Link href={`/${locale}/faq`} className="block text-gray-300 hover:text-white transition-colors text-sm">
                {t('faq') || 'FAQ'}
              </Link>
            </div>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{t('company') || 'Company'}</h3>
            <div className="space-y-2">
              <Link href={`/${locale}/about`} className="block text-gray-300 hover:text-white transition-colors text-sm">
                {t('about') || 'About Us'}
              </Link>
              {showAffiliateInfo && (
                <Link href={`/${locale}/affiliates`} className="block text-gray-300 hover:text-white transition-colors text-sm">
                  {t('affiliates') || 'Affiliate Program'}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-gray-700 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm">
            © {currentYear} Nexora Studio. {t('allRightsReserved') || 'All rights reserved.'}
          </div>
          <div className="text-gray-400 text-xs mt-2 md:mt-0">
            {t('aiDisclaimer') || 'AI-generated content. Results may vary.'}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;