'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Loader2, 
  Sparkles, 
  Zap, 
  Image, 
  Upload, 
  Download,
  Cpu,
  Wand2,
  Camera,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type LoadingType = 
  | 'default' 
  | 'upload' 
  | 'download' 
  | 'processing' 
  | 'generating' 
  | 'analyzing'
  | 'enhancing'
  | 'saving'
  | 'network';

export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingProps {
  type?: LoadingType;
  size?: LoadingSize;
  message?: string;
  progress?: number; // 0-100
  showProgress?: boolean;
  className?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  children?: React.ReactNode;
}

const loadingConfig = {
  default: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
    message: 'Loading...'
  },
  upload: {
    icon: Upload,
    color: 'text-green-500',
    bgColor: 'bg-green-500/20',
    message: 'Uploading your image...'
  },
  download: {
    icon: Download,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/20',
    message: 'Downloading...'
  },
  processing: {
    icon: Cpu,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/20',
    message: 'Processing with AI...'
  },
  generating: {
    icon: Wand2,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/20',
    message: 'Generating your photo...'
  },
  analyzing: {
    icon: Camera,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
    message: 'Analyzing image...'
  },
  enhancing: {
    icon: Palette,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/20',
    message: 'Enhancing quality...'
  },
  saving: {
    icon: Image,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/20',
    message: 'Saving your creation...'
  },
  network: {
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/20',
    message: 'Connecting...'
  }
};

const sizeConfig = {
  sm: {
    icon: 'w-4 h-4',
    container: 'p-3',
    text: 'text-sm',
    progress: 'h-1'
  },
  md: {
    icon: 'w-6 h-6',
    container: 'p-4',
    text: 'text-base',
    progress: 'h-2'
  },
  lg: {
    icon: 'w-8 h-8',
    container: 'p-6',
    text: 'text-lg',
    progress: 'h-3'
  },
  xl: {
    icon: 'w-12 h-12',
    container: 'p-8',
    text: 'text-xl',
    progress: 'h-4'
  }
};

export function Loading({
  type = 'default',
  size = 'md',
  message,
  progress,
  showProgress = false,
  className,
  fullScreen = false,
  overlay = false,
  children
}: LoadingProps) {
  const config = loadingConfig[type];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const displayMessage = message || config.message;

  const LoadingContent = () => (
    <div className={cn(
      'flex flex-col items-center justify-center space-y-4',
      sizeStyles.container,
      className
    )}>
      {/* Icon with animation */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className={cn(
            'rounded-full p-3',
            config.bgColor
          )}
        >
          <Icon className={cn(sizeStyles.icon, config.color)} />
        </motion.div>
        
        {/* Sparkle effects for certain types */}
        {(type === 'generating' || type === 'enhancing') && (
          <>
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="w-3 h-3 text-yellow-400" />
            </motion.div>
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="absolute -bottom-1 -left-1"
            >
              <Sparkles className="w-2 h-2 text-blue-400" />
            </motion.div>
          </>
        )}
      </div>

      {/* Message */}
      <div className="text-center space-y-2">
        <p className={cn(
          'font-medium text-gray-200',
          sizeStyles.text
        )}>
          {displayMessage}
        </p>

        {/* Progress bar */}
        {showProgress && typeof progress === 'number' && (
          <div className="w-48 max-w-full">
            <div className={cn(
              'w-full bg-gray-700 rounded-full overflow-hidden',
              sizeStyles.progress
            )}>
              <motion.div
                className={cn('h-full rounded-full', config.color.replace('text-', 'bg-'))}
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-center">
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Indeterminate progress for certain types */}
        {(type === 'processing' || type === 'analyzing') && !showProgress && (
          <div className={cn(
            'w-32 bg-gray-700 rounded-full overflow-hidden',
            sizeStyles.progress
          )}>
            <motion.div
              className={cn('h-full rounded-full', config.color.replace('text-', 'bg-'))}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '50%' }}
            />
          </div>
        )}
      </div>

      {/* Additional content */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
        <LoadingContent />
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-lg">
        <LoadingContent />
      </div>
    );
  }

  return <LoadingContent />;
}

// Skeleton Loading Component
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse'
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded',
    circular: 'rounded-full',
    rounded: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse',
    none: ''
  };

  return (
    <div
      className={cn(
        'bg-gray-700',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height
      }}
    />
  );
}

// Loading Dots Component
interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function LoadingDots({ 
  size = 'md', 
  color = 'bg-blue-500',
  className 
}: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const dotSize = sizeClasses[size];

  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn('rounded-full', dotSize, color)}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: index * 0.2
          }}
        />
      ))}
    </div>
  );
}

// Spinner Component
interface SpinnerProps {
  size?: LoadingSize;
  color?: string;
  className?: string;
}

export function Spinner({ 
  size = 'md', 
  color = 'text-blue-500',
  className 
}: SpinnerProps) {
  const sizeStyles = sizeConfig[size];

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={className}
    >
      <Loader2 className={cn(sizeStyles.icon, color)} />
    </motion.div>
  );
}

// Progress Ring Component
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showText?: boolean;
  className?: string;
}

export function ProgressRing({
  progress,
  size = 60,
  strokeWidth = 4,
  color = '#3b82f6',
  backgroundColor = '#374151',
  showText = true,
  className
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-200">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}