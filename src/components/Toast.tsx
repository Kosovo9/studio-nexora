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
  Wifi
  // WifiOff, Zap - removed unused imports
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
  loading: 'bg-gray-900/90 border-gray-500/50 text-gray-100',
  network: 'bg-orange-900/90 border-orange-500/50 text-orange-100'
};

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
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
    if (persistent) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300);
    }, duration);

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 100));
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [duration, persistent, onClose, id]);

  const progressPercentage = persistent ? 100 : (timeLeft / duration) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -50, scale: isVisible ? 1 : 0.95 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'fixed z-50 w-96 max-w-sm p-4 rounded-lg border backdrop-blur-sm shadow-lg',
        toastStyles[type],
        positionClasses[position]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Icon 
            className={cn(
              'w-5 h-5',
              type === 'loading' && 'animate-spin'
            )} 
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm leading-5">{title}</h4>
          {message && (
            <p className="mt-1 text-sm opacity-90 leading-4">{message}</p>
          )}
          
          {typeof progress === 'number' && (
            <div className="mt-2">
              <div className="w-full bg-white/20 rounded-full h-1.5">
                <div 
                  className="bg-white/60 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: {progress}% }}
                />
              </div>
              <p className="text-xs opacity-75 mt-1">{progress}% complete</p>
            </div>
          )}
          
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            >
              {action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 300);
          }}
          className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {!persistent && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-white/40 transition-all duration-100 ease-linear"
            style={{ width: {progressPercentage}% }}
          />
        </div>
      )}
    </motion.div>
  );
}

// Toast Container Component
interface ToastContainerProps {
  position?: ToastProps['position'];
}

export function ToastContainer({ position = 'top-right' }: ToastContainerProps) {
  const { toasts } = useToast();

  return (
    <div className={cn('fixed z-50', positionClasses[position])}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            {...toast}
            position={position}
            onClose={useToast().removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Toast Hook
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
