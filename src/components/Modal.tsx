'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle, Info, XCircle, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReliableButton } from './ReliableButton';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalVariant = 'default' | 'confirmation' | 'alert' | 'success' | 'error';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  variant?: ModalVariant;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  overlayClassName?: string;
  preventScroll?: boolean;
  footer?: React.ReactNode;
  icon?: LucideIcon;
}

interface ConfirmationModalProps extends Omit<ModalProps, 'variant' | 'children'> {
  variant: 'confirmation';
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmVariant?: 'primary' | 'danger' | 'success';
  isLoading?: boolean;
}

interface AlertModalProps extends Omit<ModalProps, 'variant' | 'children'> {
  variant: 'alert' | 'success' | 'error';
  message: string;
  buttonText?: string;
  onAction?: () => void;
}

type AllModalProps = ModalProps | ConfirmationModalProps | AlertModalProps;

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-7xl mx-4'
};

const variantConfig = {
  default: {
    icon: null as LucideIcon | null,
    iconColor: '',
    borderColor: 'border-gray-700'
  },
  confirmation: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/30'
  },
  alert: {
    icon: Info,
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-500/30'
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    borderColor: 'border-green-500/30'
  },
  error: {
    icon: XCircle,
    iconColor: 'text-red-500',
    borderColor: 'border-red-500/30'
  }
};

export function Modal(props: AllModalProps) {
  const {
    isOpen,
    onClose,
    title,
    size = 'md',
    variant = 'default',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    className,
    overlayClassName,
    preventScroll = true,
    footer,
    icon
  } = props;

  const modalRef = useRef<HTMLDivElement>(null);
  const config = variantConfig[variant];
  const IconComponent = icon || config.icon;

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Handle body scroll
  useEffect(() => {
    if (!preventScroll) return;

    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, preventScroll]);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
    }
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderContent = () => {
    if (variant === 'confirmation') {
      const confirmProps = props as ConfirmationModalProps;
      return (
        <>
          <div className="flex items-start space-x-4">
            {IconComponent && (
              <div className="flex-shrink-0 mt-1">
                <IconComponent className={cn('w-6 h-6', config.iconColor)} />
              </div>
            )}
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  {title}
                </h3>
              )}
              <p className="text-gray-300 leading-relaxed">
                {confirmProps.message}
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <ReliableButton
              variant="secondary"
              onClick={confirmProps.onCancel || onClose}
              disabled={confirmProps.isLoading}
            >
              {confirmProps.cancelText || 'Cancel'}
            </ReliableButton>
            <ReliableButton
              variant={confirmProps.confirmVariant || 'primary'}
              onClick={confirmProps.onConfirm}
              loading={confirmProps.isLoading}
            >
              {confirmProps.confirmText || 'Confirm'}
            </ReliableButton>
          </div>
        </>
      );
    }

    if (variant === 'alert' || variant === 'success' || variant === 'error') {
      const alertProps = props as AlertModalProps;
      return (
        <>
          <div className="flex items-start space-x-4">
            {IconComponent && (
              <div className="flex-shrink-0 mt-1">
                <IconComponent className={cn('w-6 h-6', config.iconColor)} />
              </div>
            )}
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-100 mb-2">
                  {title}
                </h3>
              )}
              <p className="text-gray-300 leading-relaxed">
                {alertProps.message}
              </p>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <ReliableButton
              variant="primary"
              onClick={alertProps.onAction || onClose}
            >
              {alertProps.buttonText || 'OK'}
            </ReliableButton>
          </div>
        </>
      );
    }

    // Default modal content
    const defaultProps = props as ModalProps;
    return (
      <>
        {(title || IconComponent) && (
          <div className="flex items-start space-x-4 mb-4">
            {IconComponent && (
              <div className="flex-shrink-0 mt-1">
                <IconComponent className={cn('w-6 h-6', config.iconColor)} />
              </div>
            )}
            {title && (
              <h3 className="text-lg font-semibold text-gray-100 flex-1">
                {title}
              </h3>
            )}
          </div>
        )}
        <div className="text-gray-300">
          {defaultProps.children}
        </div>
        {footer && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            {footer}
          </div>
        )}
      </>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed inset-0 bg-black/60 backdrop-blur-sm',
              overlayClassName
            )}
            onClick={handleOverlayClick}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={cn(
                'relative w-full bg-gray-800 rounded-xl shadow-2xl border',
                sizeClasses[size],
                config.borderColor,
                className
              )}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
            >
              {/* Close button */}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Content */}
              <div className={cn(
                'p-6',
                showCloseButton ? 'pr-14' : ''
              )}>
                {renderContent()}
              </div>

              {/* Glow effect for special variants */}
              {variant !== 'default' && (
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-xl" />
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

// Hook for managing modal state
export function useModal() {
  const [isOpen, setIsOpen] = React.useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  const toggleModal = () => setIsOpen(prev => !prev);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal
  };
}

// Convenience components
export function ConfirmationModal(props: Omit<ConfirmationModalProps, 'variant'>) {
  return <Modal {...props} variant="confirmation" />;
}

export function AlertModal(props: Omit<AlertModalProps, 'variant'>) {
  return <Modal {...props} variant="alert" />;
}

export function SuccessModal(props: Omit<AlertModalProps, 'variant'>) {
  return <Modal {...props} variant="success" />;
}

export function ErrorModal(props: Omit<AlertModalProps, 'variant'>) {
  return <Modal {...props} variant="error" />;
}