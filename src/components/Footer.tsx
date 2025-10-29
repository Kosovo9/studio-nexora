/**
 * NEXORA FOOTER COMPONENT - SAFE-SHIP MODE
 * Professional multi-language disclaimer and links with 12 languages
 * Legal disclaimers, terms, privacy, refunds, IP, AI usage, watermarks, security
 */

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { PaymentIndicator } from './PaymentIndicator';
import { LanguageSelector } from './LanguageSelector';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface FooterProps {
  isUserSubscribed?: boolean;
  showAffiliateInfo?: boolean;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  isUserSubscribed = false,
  showAffiliateInfo = true,
  className,
}) => {
  const { t, isRTL } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'bg-gray-900 text-white',
        isRTL && 'text-right',
        className
      )}
    >
      {/* Language Selector Bar */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              {t('selectLanguage')}
            </div>
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className={cn(
          'grid grid-cols-1 md:grid-cols-5 gap-8',
          isRTL && 'text-right'
        )}>
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold">Nexora Studio</span>
            </div>
            
            <p className="text-gray-300 mb-4 max-w-md">
              {t('footer.description')}
            </p>

            {/* Payment Indicator */}
            <div className="mb-4">
              <PaymentIndicator isSubscribed={isUserSubscribed} />
            </div>

            {/* Security Badge */}
            <div className="mb-4">
              <div className="inline-flex items-center px-3 py-1 bg-green-900 text-green-300 rounded-full text-xs">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {t('footer.securePayments')}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-white transition-colors">
                  {t('home')}
                </a>
              </li>
              <li>
                <a href="/about" className="text-gray-300 hover:text-white transition-colors">
                  {t('about')}
                </a>
              </li>
              <li>
                <a href="/services" className="text-gray-300 hover:text-white transition-colors">
                  {t('services')}
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  {t('contact')}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="/privacy" className="text-gray-300 hover:text-white transition-colors">
                  {t('privacyPolicy')}
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-300 hover:text-white transition-colors">
                  {t('termsOfService')}
                </a>
              </li>
              <li>
                <a href="/security" className="text-gray-300 hover:text-white transition-colors">
                  Security Guide
                </a>
              </li>
              <li>
                <a href="/affiliate" className="text-gray-300 hover:text-white transition-colors">
                  {t('affiliateProgram')}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Comprehensive Legal Disclaimers Section */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* AI Usage Disclaimer */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              {t('footer.aiUsageTitle')}
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              {t('footer.aiUsageDisclaimer')}
            </p>
          </div>

          {/* Watermark Policy */}
          <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              {t('footer.watermarkTitle')}
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              {t('footer.watermarkDisclaimer')}
            </p>
          </div>

          {/* Processing Time & Limitations */}
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {t('footer.processingTitle')}
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              {t('footer.processingDisclaimer')}
            </p>
          </div>

          {/* Security & Privacy */}
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {t('footer.securityTitle')}
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              {t('footer.securityDisclaimer')}
            </p>
          </div>

          {/* Intellectual Property */}
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-red-400 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              {t('footer.intellectualPropertyTitle')}
            </h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              {t('footer.intellectualPropertyDisclaimer')}
            </p>
          </div>

          {/* Copyright and Social */}
          <div className={cn(
            'flex flex-col md:flex-row justify-between items-center pt-6 border-t border-gray-800',
            isRTL && 'md:flex-row-reverse'
          )}>
            <div className="text-sm text-gray-400 mb-4 md:mb-0">
              © {currentYear} Nexora Studio. {t('footer.allRightsReserved')}
              <br />
              <span className="text-xs">{t('footer.companyInfo')}</span>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              <a
                href="https://twitter.com/nexorastudio"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Twitter"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a
                href="https://github.com/nexorastudio"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="GitHub"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
              <a
                href="https://linkedin.com/company/nexorastudio"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="LinkedIn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};