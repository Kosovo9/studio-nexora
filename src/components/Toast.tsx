'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  Loader2,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'network';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  progress?: number; // 0-100 for loading toasts
}

interface ToastProps extends ToastData {
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  loading: Loader2,
  network: Wifi
};

const toastStyles = {
  success: 'bg-green-900/90 border-green-500/50 text-green-100',
  error: 'bg-red-900/90 border-red-500/50 text-red-100',
  warning: 'bg-yellow-900/90 border-yellow-500/50 text-yellow-100',
  info: 'bg-blue-900/90 border-blue-500/50 text-blue-100',
  loading: 'bg-purple-900/90 border-purple-500/50 text-purple-100',
  network: 'bg-gray-900/90 border-gray-500/50 text-gray-100'
};

const iconStyles = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
  loading: 'text-purple-400 animate-spin',
  network: 'text-gray-400'
};

export function Toast({ 
  id, 
  type, 
  title, 
  message, 
  duration = 5000, 
  persistent = false,
  action,
  progress,
  onClose,
  position = 'top-right'
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState(duration);

  const Icon = toastIcons[type];

  useEffect(() => {
    if (persistent || type === 'loading') return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300);
    }, duration);

    const countdown = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 100));
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(countdown);
    };
  }, [id, duration, persistent, type, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const progressPercentage = persistent ? 0 : ((duration - timeLeft) / duration) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'relative max-w-sm w-full rounded-lg border backdrop-blur-md shadow-xl overflow-hidden',
            toastStyles[type]
          )}
          role="alert"
          aria-live="polite"
        >
          {/* Progress bar */}
          {!persistent && type !== 'loading' && (
            <div className="absolute top-0 left-0 h-1 bg-white/20 w-full">
              <motion.div
                className="h-full bg-white/60"
                initial={{ width: '0%' }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>
          )}

          {/* Loading progress bar */}
          {type === 'loading' && typeof progress === 'number' && (
            <div className="absolute top-0 left-0 h-1 bg-white/20 w-full">
              <motion.div
                className="h-full bg-purple-400"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          )}

          <div className="p-4">
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                <Icon className={cn('w-5 h-5', iconStyles[type])} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold mb-1">
                  {title}
                </h4>
                {message && (
                  <p className="text-sm opacity-90 leading-relaxed">
                    {message}
                  </p>
                )}

                {/* Action button */}
                {action && (
                  <button
                    onClick={action.onClick}
                    className="mt-3 text-sm font-medium underline hover:no-underline transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
                  >
                    {action.label}
                  </button>
                )}

                {/* Loading progress text */}
                {type === 'loading' && typeof progress === 'number' && (
                  <div className="mt-2 text-xs opacity-75">
                    {Math.round(progress)}% complete
                  </div>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={handleClose}
                className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Glow effect for special types */}
          {(type === 'success' || type === 'loading') && (
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast Container Component
interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export function ToastContainer({ 
  toasts, 
  onClose, 
  position = 'top-right',
  maxToasts = 5 
}: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const visibleToasts = toasts.slice(0, maxToasts);

  return (
    <div 
      className={cn(
        'fixed z-50 pointer-events-none',
        positionClasses[position]
      )}
    >
      <div className="space-y-3 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {visibleToasts.map((toast) => (
            <Toast
              key={toast.id}
              {...toast}
              onClose={onClose}
              position={position}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const updateToast = (id: string, updates: Partial<ToastData>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods
  const success = (title: string, message?: string, options?: Partial<ToastData>) => 
    addToast({ type: 'success', title, message, ...options });

  const error = (title: string, message?: string, options?: Partial<ToastData>) => 
    addToast({ type: 'error', title, message, ...options });

  const warning = (title: string, message?: string, options?: Partial<ToastData>) => 
    addToast({ type: 'warning', title, message, ...options });

  const info = (title: string, message?: string, options?: Partial<ToastData>) => 
    addToast({ type: 'info', title, message, ...options });

  const loading = (title: string, message?: string, options?: Partial<ToastData>) => 
    addToast({ type: 'loading', title, message, persistent: true, ...options });

  const networkStatus = (isOnline: boolean) => {
    const existingNetworkToast = toasts.find(t => t.type === 'network');
    if (existingNetworkToast) {
      removeToast(existingNetworkToast.id);
    }

    if (!isOnline) {
      addToast({
        type: 'network',
        title: 'Connection Lost',
        message: 'You are currently offline. Some features may not work.',
        persistent: true
      });
    }
  };

  return {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    loading,
    networkStatus
  };
}