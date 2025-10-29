'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Lock,
  Eye,
  EyeOff,
  Clock,
  Zap,
  Globe,
  Cpu,
  Activity,
  TrendingUp
} from 'lucide-react';

interface TurnstileWidgetProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
  action?: string;
  cData?: string;
  className?: string;
  retry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
  showAnalytics?: boolean;
  showPrivacyInfo?: boolean;
  customMessages?: {
    loading?: string;
    success?: string;
    error?: string;
    expired?: string;
  };
  onAnalytics?: (event: string, data: any) => void;
  debugMode?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface AnalyticsData {
  attempts: number;
  successRate: number;
  averageTime: number;
  errors: string[];
  lastSuccess: Date | null;
  totalTime: number;
}

declare global {
  interface Window {
    turnstile: {
      render: (element: string | HTMLElement, options: any) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
      isExpired: (widgetId?: string) => boolean;
    };
  }
}

/**
 * Enhanced Cloudflare Turnstile Widget Component
 * Open-source CAPTCHA alternative for human verification with comprehensive features
 */
export default function TurnstileWidget({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
  action,
  cData,
  className = '',
  retry = true,
  retryInterval = 5000,
  maxRetries = 3,
  showAnalytics = false,
  showPrivacyInfo = true,
  customMessages = {},
  onAnalytics,
  debugMode = false,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [verificationTime, setVerificationTime] = useState<number | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(debugMode);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    attempts: 0,
    successRate: 0,
    averageTime: 0,
    errors: [],
    lastSuccess: null,
    totalTime: 0
  });

  const autoRefreshRef = useRef<NodeJS.Timeout>();
  const performanceRef = useRef<{
    renderStart: number;
    renderEnd: number;
    verificationStart: number;
    verificationEnd: number;
  }>({
    renderStart: 0,
    renderEnd: 0,
    verificationStart: 0,
    verificationEnd: 0
  });

  // Track analytics
  const trackEvent = useCallback((event: string, data: any = {}) => {
    if (showAnalytics) {
      const eventData = {
        timestamp: new Date(),
        event,
        widgetId,
        retryCount,
        ...data
      };
      
      if (debugMode) {
        console.log('Turnstile Analytics:', eventData);
      }
      
      onAnalytics?.(event, eventData);
    }
  }, [showAnalytics, widgetId, retryCount, debugMode, onAnalytics]);

  // Update analytics data
  const updateAnalytics = useCallback((type: 'attempt' | 'success' | 'error', data?: any) => {
    setAnalytics(prev => {
      const newAnalytics = { ...prev };
      
      switch (type) {
        case 'attempt':
          newAnalytics.attempts += 1;
          break;
        case 'success':
          newAnalytics.lastSuccess = new Date();
          if (verificationTime) {
            newAnalytics.totalTime += verificationTime;
            newAnalytics.averageTime = newAnalytics.totalTime / (newAnalytics.attempts || 1);
          }
          newAnalytics.successRate = ((newAnalytics.attempts - newAnalytics.errors.length) / newAnalytics.attempts) * 100;
          break;
        case 'error':
          if (data?.error && !newAnalytics.errors.includes(data.error)) {
            newAnalytics.errors.push(data.error);
          }
          newAnalytics.successRate = ((newAnalytics.attempts - newAnalytics.errors.length) / newAnalytics.attempts) * 100;
          break;
      }
      
      return newAnalytics;
    });
  }, [verificationTime]);

  // Load Cloudflare Turnstile script with enhanced error handling
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if script is already loaded
    if (window.turnstile) {
      setScriptLoaded(true);
      trackEvent('script_already_loaded');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    
    const loadStart = performance.now();
    
    script.onload = () => {
      const loadTime = performance.now() - loadStart;
      setScriptLoaded(true);
      trackEvent('script_loaded', { loadTime });
      
      if (debugMode) {
        console.log(`Turnstile script loaded in ${loadTime.toFixed(2)}ms`);
      }
    };
    
    script.onerror = (event) => {
      const errorMsg = 'Failed to load Cloudflare Turnstile service';
      setError(errorMsg);
      setIsLoading(false);
      trackEvent('script_load_error', { error: errorMsg, event });
      
      if (debugMode) {
        console.error('Turnstile script load error:', event);
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [trackEvent, debugMode]);

  // Initialize Turnstile widget with enhanced features
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.turnstile) return;

    const initWidget = () => {
      try {
        setIsLoading(true);
        setError(null);
        setStartTime(new Date());
        performanceRef.current.renderStart = performance.now();
        
        updateAnalytics('attempt');
        trackEvent('widget_init_start');

        const id = window.turnstile.render(containerRef.current!, {
          sitekey: siteKey,
          theme: theme === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme,
          size,
          action,
          cData,
          callback: (token: string) => {
            const endTime = new Date();
            const timeTaken = startTime ? endTime.getTime() - startTime.getTime() : 0;
            
            performanceRef.current.verificationEnd = performance.now();
            setVerificationTime(timeTaken);
            setIsVerified(true);
            setIsLoading(false);
            setError(null);
            setRetryCount(0);
            
            updateAnalytics('success');
            trackEvent('verification_success', { 
              token: token.substring(0, 10) + '...', 
              timeTaken,
              attempts: retryCount + 1
            });
            
            onSuccess(token);
            
            if (debugMode) {
              console.log(`Verification successful in ${timeTaken}ms`);
            }
          },
          'error-callback': (error: string) => {
            const errorMsg = error || 'Verification failed';
            setIsVerified(false);
            setIsLoading(false);
            setError(errorMsg);
            
            updateAnalytics('error', { error: errorMsg });
            trackEvent('verification_error', { error: errorMsg, attempt: retryCount + 1 });
            
            onError?.(errorMsg);
            
            if (debugMode) {
              console.error('Turnstile error:', errorMsg);
            }
            
            // Auto-retry with exponential backoff
            if (retry && retryCount < maxRetries) {
              const delay = retryInterval * Math.pow(1.5, retryCount);
              setTimeout(() => {
                setRetryCount(prev => prev + 1);
                handleRetry();
              }, delay);
            }
          },
          'expired-callback': () => {
            setIsVerified(false);
            setError(customMessages.expired || 'Verification expired');
            
            trackEvent('verification_expired');
            onExpire?.();
            
            if (debugMode) {
              console.warn('Turnstile verification expired');
            }
            
            // Auto-retry on expiration
            if (retry) {
              setTimeout(() => {
                handleRetry();
              }, 1000);
            }
          },
          'timeout-callback': () => {
            const timeoutMsg = 'Verification timed out';
            setIsVerified(false);
            setError(timeoutMsg);
            
            trackEvent('verification_timeout');
            onError?.(timeoutMsg);
            
            if (debugMode) {
              console.warn('Turnstile verification timeout');
            }
          },
          'before-interactive-callback': () => {
            performanceRef.current.verificationStart = performance.now();
            trackEvent('verification_start');
          },
          'after-interactive-callback': () => {
            performanceRef.current.renderEnd = performance.now();
            const renderTime = performanceRef.current.renderEnd - performanceRef.current.renderStart;
            trackEvent('widget_rendered', { renderTime });
          }
        });

        setWidgetId(id);
        setIsLoading(false);
        
        trackEvent('widget_init_success', { widgetId: id });
        
        if (debugMode) {
          console.log('Turnstile widget initialized:', id);
        }
        
      } catch (err) {
        const errorMsg = 'Failed to initialize verification widget';
        setError(errorMsg);
        setIsLoading(false);
        
        trackEvent('widget_init_error', { error: err });
        
        if (debugMode) {
          console.error('Turnstile initialization error:', err);
        }
      }
    };

    const timer = setTimeout(initWidget, 100);
    return () => clearTimeout(timer);
  }, [
    scriptLoaded, siteKey, theme, size, action, cData, onSuccess, onError, onExpire, 
    retry, retryInterval, maxRetries, retryCount, startTime, customMessages, 
    trackEvent, updateAnalytics, debugMode
  ]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !isVerified) return;

    autoRefreshRef.current = setTimeout(() => {
      if (window.turnstile && widgetId) {
        trackEvent('auto_refresh');
        handleRetry();
      }
    }, refreshInterval);

    return () => {
      if (autoRefreshRef.current) {
        clearTimeout(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, isVerified, refreshInterval, widgetId, trackEvent]);

  const handleRetry = useCallback(() => {
    if (!window.turnstile || !widgetId) return;
    
    try {
      window.turnstile.reset(widgetId);
      setError(null);
      setIsVerified(false);
      setIsLoading(true);
      setStartTime(new Date());
      
      trackEvent('manual_retry', { attempt: retryCount + 1 });
      
      if (debugMode) {
        console.log('Turnstile widget reset');
      }
    } catch (err) {
      const errorMsg = 'Failed to reset verification';
      setError(errorMsg);
      trackEvent('retry_error', { error: err });
      
      if (debugMode) {
        console.error('Turnstile reset error:', err);
      }
    }
  }, [widgetId, retryCount, trackEvent, debugMode]);

  const handleManualRetry = () => {
    setRetryCount(0);
    handleRetry();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshRef.current) {
        clearTimeout(autoRefreshRef.current);
      }
      
      if (window.turnstile && widgetId) {
        try {
          window.turnstile.remove(widgetId);
          trackEvent('widget_cleanup');
        } catch (err) {
          if (debugMode) {
            console.error('Turnstile cleanup error:', err);
          }
        }
      }
    };
  }, [widgetId, trackEvent, debugMode]);

  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />;
    if (error) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (isVerified) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <Shield className="w-5 h-5 text-gray-500" />;
  };

  const getStatusText = () => {
    if (isLoading) return customMessages.loading || 'Loading verification...';
    if (error) return customMessages.error || `Error: ${error}`;
    if (isVerified) return customMessages.success || 'Verification successful';
    return 'Human verification required';
  };

  const getPerformanceColor = (time: number) => {
    if (time < 2000) return 'text-green-500';
    if (time < 5000) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      className={`turnstile-container ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Enhanced Status Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-700">
            {getStatusText()}
          </span>
          {retryCount > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Attempt {retryCount + 1}/{maxRetries + 1}
            </span>
          )}
          {verificationTime && (
            <span className={`text-xs ${getPerformanceColor(verificationTime)}`}>
              {verificationTime}ms
            </span>
          )}
        </div>
        
        {/* Debug Toggle */}
        {debugMode && (
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showDebugInfo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Turnstile Widget Container */}
      <div className="relative">
        <div 
          ref={containerRef}
          className={`turnstile-widget transition-opacity duration-300 ${isLoading ? 'opacity-50' : ''}`}
          style={{ 
            minHeight: size === 'compact' ? '65px' : size === 'flexible' ? 'auto' : '65px',
            maxWidth: size === 'flexible' ? '100%' : 'auto'
          }}
        />
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">Initializing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
              <div className="flex items-center space-x-2">
                {retryCount < maxRetries && (
                  <span className="text-xs text-red-600">
                    {maxRetries - retryCount} retries left
                  </span>
                )}
                <button
                  onClick={handleManualRetry}
                  disabled={retryCount >= maxRetries}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-3 h-3 inline mr-1" />
                  Retry
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Success State */}
      <AnimatePresence>
        {isVerified && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-700">
                  Verification completed successfully
                </span>
                {verificationTime && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {(verificationTime / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              {autoRefresh && (
                <div className="text-xs text-green-600">
                  <Activity className="w-3 h-3 inline mr-1" />
                  Auto-refresh enabled
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Dashboard */}
      <AnimatePresence>
        {showAnalytics && analytics.attempts > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                <span>Success Rate: {analytics.successRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <span>Avg Time: {(analytics.averageTime / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-blue-500" />
                <span>Attempts: {analytics.attempts}</span>
              </div>
              <div className="flex items-center space-x-1">
                <AlertCircle className="w-3 h-3 text-blue-500" />
                <span>Errors: {analytics.errors.length}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Information */}
      <AnimatePresence>
        {showDebugInfo && debugMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <div className="text-xs space-y-1">
              <div className="font-medium text-gray-700 mb-2">Debug Information</div>
              <div>Widget ID: {widgetId || 'Not initialized'}</div>
              <div>Site Key: {siteKey.substring(0, 10)}...</div>
              <div>Theme: {theme}</div>
              <div>Size: {size}</div>
              <div>Action: {action || 'None'}</div>
              <div>Retry Count: {retryCount}</div>
              <div>Script Loaded: {scriptLoaded ? 'Yes' : 'No'}</div>
              <div>Auto Refresh: {autoRefresh ? 'Enabled' : 'Disabled'}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Privacy Notice */}
      {showPrivacyInfo && (
        <div className="mt-3 text-xs text-gray-500">
          <div className="flex items-center space-x-1 mb-1">
            <Shield className="w-3 h-3" />
            <span className="font-medium">Protected by Cloudflare Turnstile</span>
            <Lock className="w-3 h-3" />
          </div>
          <p className="leading-relaxed">
            This verification helps protect against automated abuse while respecting your privacy. 
            No personal data is collected or stored during this process.
          </p>
          <div className="flex items-center space-x-3 mt-2">
            <div className="flex items-center space-x-1">
              <Globe className="w-3 h-3" />
              <span>Global CDN</span>
            </div>
            <div className="flex items-center space-x-1">
              <Cpu className="w-3 h-3" />
              <span>Edge Computing</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Fast Response</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
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
