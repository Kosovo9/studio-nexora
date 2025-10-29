'use client';

import React, { useState, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle, 
  Search,
  Upload,
  X,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'file';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'underlined';

interface BaseInputProps {
  label?: string;
  placeholder?: string;
  helperText?: string;
  errorMessage?: string;
  successMessage?: string;
  size?: InputSize;
  variant?: InputVariant;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  className?: string;
  containerClassName?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
  showClearButton?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

interface TextInputProps extends BaseInputProps {
  type?: Exclude<InputType, 'file'>;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface FileInputProps extends BaseInputProps {
  type: 'file';
  accept?: string;
  multiple?: boolean;
  onChange?: (files: FileList | null) => void;
  onDrop?: (files: FileList) => void;
  dragActive?: boolean;
  maxSize?: number; // in MB
  allowedTypes?: string[];
}

type InputProps = TextInputProps | FileInputProps;

const sizeConfig = {
  sm: {
    input: 'h-9 px-3 text-sm',
    label: 'text-sm',
    helper: 'text-xs',
    icon: 'w-4 h-4'
  },
  md: {
    input: 'h-11 px-4 text-base',
    label: 'text-sm',
    helper: 'text-sm',
    icon: 'w-5 h-5'
  },
  lg: {
    input: 'h-13 px-5 text-lg',
    label: 'text-base',
    helper: 'text-base',
    icon: 'w-6 h-6'
  }
};

const variantConfig = {
  default: {
    base: 'border rounded-lg bg-gray-800 border-gray-600',
    focus: 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
    success: 'border-green-500 focus:border-green-500 focus:ring-green-500/20',
    disabled: 'bg-gray-700 border-gray-600 cursor-not-allowed opacity-50'
  },
  filled: {
    base: 'border-0 rounded-lg bg-gray-700',
    focus: 'ring-2 ring-blue-500/50',
    error: 'ring-2 ring-red-500/50',
    success: 'ring-2 ring-green-500/50',
    disabled: 'bg-gray-600 cursor-not-allowed opacity-50'
  },
  underlined: {
    base: 'border-0 border-b-2 rounded-none bg-transparent border-gray-600',
    focus: 'border-blue-500',
    error: 'border-red-500',
    success: 'border-green-500',
    disabled: 'border-gray-600 cursor-not-allowed opacity-50'
  }
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => {
    const {
      label,
      placeholder,
      helperText,
      errorMessage,
      successMessage,
      size = 'md',
      variant = 'default',
      disabled = false,
      required = false,
      loading = false,
      className,
      containerClassName,
      leftIcon,
      rightIcon,
      onClear,
      showClearButton = false,
      maxLength,
      showCharCount = false,
      ...restProps
    } = props;

    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isFileInput = props.type === 'file';
    const isPasswordInput = props.type === 'password';
    const hasError = !!errorMessage;
    const hasSuccess = !!successMessage && !hasError;
    const sizeStyles = sizeConfig[size];
    const variantStyles = variantConfig[variant];

    const getInputClasses = () => {
      let classes = cn(
        'w-full transition-all duration-200 text-gray-100 placeholder-gray-400',
        sizeStyles.input,
        variantStyles.base
      );

      if (hasError) {
        classes = cn(classes, variantStyles.error);
      } else if (hasSuccess) {
        classes = cn(classes, variantStyles.success);
      } else if (isFocused) {
        classes = cn(classes, variantStyles.focus);
      }

      if (disabled) {
        classes = cn(classes, variantStyles.disabled);
      }

      if (leftIcon) {
        classes = cn(classes, 'pl-10');
      }

      if (rightIcon || showClearButton || isPasswordInput || loading) {
        classes = cn(classes, 'pr-10');
      }

      return cn(classes, className);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      if (!isFileInput) {
        (props as TextInputProps).onFocus?.(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (!isFileInput) {
        (props as TextInputProps).onBlur?.(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isFileInput) {
        (props as FileInputProps).onChange?.(e.target.files);
      } else {
        (props as TextInputProps).onChange?.(e);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      if (isFileInput && !disabled) {
        setDragActive(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      
      if (isFileInput && !disabled) {
        const files = e.dataTransfer.files;
        (props as FileInputProps).onDrop?.(files);
        (props as FileInputProps).onChange?.(files);
      }
    };

    const currentValue = isFileInput ? '' : (props as TextInputProps).value || '';
    const charCount = currentValue.length;

    if (isFileInput) {
      const fileProps = props as FileInputProps;
      return (
        <div className={cn('space-y-2', containerClassName)}>
          {label && (
            <label className={cn('block font-medium text-gray-200', sizeStyles.label)}>
              {label}
              {required && <span className="text-red-400 ml-1">*</span>}
            </label>
          )}

          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer',
              dragActive || isFocused
                ? 'border-blue-500 bg-blue-500/10'
                : hasError
                ? 'border-red-500 bg-red-500/10'
                : 'border-gray-600 hover:border-gray-500',
              disabled && 'cursor-not-allowed opacity-50',
              sizeStyles.input.includes('h-9') ? 'p-4' : 'p-6'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={fileProps.accept}
              multiple={fileProps.multiple}
              disabled={disabled}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />

            <div className="text-center">
              <Upload className={cn('mx-auto mb-2 text-gray-400', sizeStyles.icon)} />
              <p className={cn('text-gray-300', sizeStyles.helper)}>
                {dragActive
                  ? 'Drop files here'
                  : 'Click to upload or drag and drop'
                }
              </p>
              {fileProps.accept && (
                <p className="text-xs text-gray-500 mt-1">
                  Accepted: {fileProps.accept}
                </p>
              )}
            </div>
          </div>

          {(helperText || errorMessage || successMessage) && (
            <div className="space-y-1">
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 text-red-400"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className={sizeStyles.helper}>{errorMessage}</span>
                </motion.div>
              )}
              {successMessage && !errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 text-green-400"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className={sizeStyles.helper}>{successMessage}</span>
                </motion.div>
              )}
              {helperText && !errorMessage && !successMessage && (
                <div className="flex items-center space-x-2 text-gray-400">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span className={sizeStyles.helper}>{helperText}</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    const textProps = props as TextInputProps;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {label && (
          <label className={cn('block font-medium text-gray-200', sizeStyles.label)}>
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={isPasswordInput && showPassword ? 'text' : textProps.type}
            value={textProps.value}
            defaultValue={textProps.defaultValue}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            maxLength={maxLength}
            className={getInputClasses()}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={textProps.onKeyDown}
            aria-invalid={hasError}
            aria-describedby={
              errorMessage ? 'error-message' : 
              successMessage ? 'success-message' : 
              helperText ? 'helper-text' : undefined
            }
          />

          {/* Right Icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {loading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              </motion.div>
            )}

            {showClearButton && currentValue && !loading && (
              <button
                type="button"
                onClick={onClear}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                aria-label="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {isPasswordInput && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}

            {rightIcon && !loading && !showClearButton && !isPasswordInput && (
              <div className="text-gray-400">
                {rightIcon}
              </div>
            )}
          </div>
        </div>

        {/* Helper Text, Error, Success Messages, Character Count */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {errorMessage && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center space-x-2 text-red-400"
                  id="error-message"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className={sizeStyles.helper}>{errorMessage}</span>
                </motion.div>
              )}
              {successMessage && !errorMessage && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center space-x-2 text-green-400"
                  id="success-message"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className={sizeStyles.helper}>{successMessage}</span>
                </motion.div>
              )}
              {helperText && !errorMessage && !successMessage && (
                <motion.div
                  key="helper"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center space-x-2 text-gray-400"
                  id="helper-text"
                >
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span className={sizeStyles.helper}>{helperText}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Character Count */}
          {showCharCount && maxLength && (
            <div className={cn(
              'text-gray-400 ml-4 flex-shrink-0',
              sizeStyles.helper,
              charCount > maxLength * 0.9 && 'text-yellow-400',
              charCount >= maxLength && 'text-red-400'
            )}>
              {charCount}/{maxLength}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

// Search Input Component
interface SearchInputProps extends Omit<TextInputProps, 'type' | 'leftIcon'> {
  onSearch?: (value: string) => void;
  searchDelay?: number;
}

export function SearchInput({ 
  onSearch, 
  searchDelay = 300, 
  ...props 
}: SearchInputProps) {
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.onChange?.(e);
    
    if (onSearch) {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      const timeout = setTimeout(() => {
        onSearch(e.target.value);
      }, searchDelay);
      
      setSearchTimeout(timeout);
    }
  };

  return (
    <Input
      {...props}
      type="search"
      leftIcon={<Search className="w-4 h-4" />}
      onChange={handleChange}
    />
  );
}