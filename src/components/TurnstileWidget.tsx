'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface TurnstileWidgetProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  action?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  className?: string;
}

/**
 * Cloudflare Turnstile Widget Component
 * Open-source CAPTCHA alternative for human verification
 */
export default function TurnstileWidget({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  action = 'verify',
  theme = 'dark',
  size = 'normal',
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    // @ts-ignore - Turnstile is loaded from CDN
    if (typeof window.turnstile === 'undefined') return;

    // Render Turnstile widget
    try {
      // @ts-ignore
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        theme,
        size,
        callback: (token: string) => {
          onSuccess(token);
        },
        'error-callback': (error: string) => {
          if (onError) onError(error);
        },
        'expired-callback': () => {
          if (onExpire) onExpire();
        },
      });
    } catch (error) {
      console.error('Failed to render Turnstile widget:', error);
      if (onError) onError('Failed to load verification widget');
    }

    // Cleanup
    return () => {
      if (widgetIdRef.current) {
        try {
          // @ts-ignore
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          console.error('Failed to remove Turnstile widget:', error);
        }
      }
    };
  }, [isLoaded, siteKey, action, theme, size, onSuccess, onError, onExpire]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        onLoad={() => setIsLoaded(true)}
        strategy="lazyOnload"
      />
      <div ref={containerRef} className={className} />
    </>
  );
}

/**
 * Hook for Turnstile verification
 */
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = (newToken: string) => {
    setToken(newToken);
    setIsVerified(true);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setToken(null);
    setIsVerified(false);
    setError(errorMessage);
  };

  const handleExpire = () => {
    setToken(null);
    setIsVerified(false);
    setError('Verification expired. Please try again.');
  };

  const reset = () => {
    setToken(null);
    setIsVerified(false);
    setError(null);
  };

  return {
    token,
    isVerified,
    error,
    handleSuccess,
    handleError,
    handleExpire,
    reset,
  };
}
