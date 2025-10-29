'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Zap,
  Globe,
  Lock,
  Download,
  Copy,
  ExternalLink,
  RefreshCw,
  DollarSign,
  Calendar,
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  QrCode,
  Smartphone,
  Wifi,
  WifiOff,
  Activity,
  TrendingUp,
  Eye,
  EyeOff,
  Settings,
  Bell,
  Star,
  Heart,
  Share2,
  Bookmark
} from 'lucide-react';

interface PaymentIndicatorProps {
  status: 'idle' | 'processing' | 'success' | 'error' | 'pending' | 'cancelled' | 'refunded' | 'expired';
  method?: 'stripe' | 'lemon-squeezy' | 'oxxo' | 'paypal' | 'apple-pay' | 'google-pay' | 'bank-transfer' | 'crypto';
  amount?: number;
  currency?: string;
  transactionId?: string;
  orderId?: string;
  customerEmail?: string;
  customerName?: string;
  paymentDate?: Date;
  expiryDate?: Date;
  onRetry?: () => void;
  onCancel?: () => void;
  onDownloadReceipt?: () => void;
  onViewDetails?: () => void;
  className?: string;
  showDetails?: boolean;
  showAnalytics?: boolean;
  realTimeUpdates?: boolean;
  customMessages?: {
    [key: string]: string;
  };
  metadata?: {
    [key: string]: any;
  };
  onStatusChange?: (status: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'compact' | 'normal' | 'expanded';
  showQRCode?: boolean;
  enableNotifications?: boolean;
  showProgress?: boolean;
  animationPreset?: 'minimal' | 'standard' | 'enhanced';
}

interface PaymentAnalytics {
  attempts: number;
  successRate: number;
  averageTime: number;
  lastPayment: Date | null;
  totalAmount: number;
  preferredMethod: string;
}

export default function PaymentIndicator({
  status,
  method = 'stripe',
  amount,
  currency = 'USD',
  transactionId,
  orderId,
  customerEmail,
  customerName,
  paymentDate,
  expiryDate,
  onRetry,
  onCancel,
  onDownloadReceipt,
  onViewDetails,
  className = '',
  showDetails = false,
  showAnalytics = false,
  realTimeUpdates = true,
  customMessages = {},
  metadata = {},
  onStatusChange,
  autoRefresh = false,
  refreshInterval = 30000,
  theme = 'auto',
  size = 'normal',
  showQRCode = false,
  enableNotifications = true,
  showProgress = true,
  animationPreset = 'standard'
}: PaymentIndicatorProps) {
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [showDetailsPanel, setShowDetailsPanel] = useState(showDetails);
  const [analytics, setAnalytics] = useState<PaymentAnalytics>({
    attempts: 0,
    successRate: 0,
    averageTime: 0,
    lastPayment: null,
    totalAmount: 0,
    preferredMethod: method
  });
  const [notifications, setNotifications] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const intervalRef = useRef<NodeJS.Timeout>();
  const refreshRef = useRef<NodeJS.Timeout>();
  const notificationRef = useRef<NodeJS.Timeout>();

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Progress and timing logic
  useEffect(() => {
    if (status === 'processing') {
      intervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
        setTimeElapsed(prev => prev + 1);
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else if (status === 'success') {
      setProgress(100);
    } else if (status === 'error' || status === 'cancelled') {
      setProgress(0);
    }
  }, [status]);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && realTimeUpdates && (status === 'processing' || status === 'pending')) {
      refreshRef.current = setInterval(() => {
        setLastUpdate(new Date());
        // Simulate status check - in real app, this would call an API
        if (Math.random() > 0.8) {
          onStatusChange?.('success');
        }
      }, refreshInterval);

      return () => {
        if (refreshRef.current) {
          clearInterval(refreshRef.current);
        }
      };
    }
  }, [autoRefresh, realTimeUpdates, status, refreshInterval, onStatusChange]);

  // Notifications
  const addNotification = useCallback((message: string) => {
    if (enableNotifications) {
      setNotifications(prev => [...prev.slice(-2), message]);
      
      if (notificationRef.current) {
        clearTimeout(notificationRef.current);
      }
      
      notificationRef.current = setTimeout(() => {
        setNotifications(prev => prev.slice(1));
      }, 5000);
    }
  }, [enableNotifications]);

  // Status change notifications
  useEffect(() => {
    switch (status) {
      case 'processing':
        addNotification('Payment is being processed...');
        break;
      case 'success':
        addNotification('Payment completed successfully!');
        break;
      case 'error':
        addNotification('Payment failed. Please try again.');
        break;
      case 'pending':
        addNotification('Payment is pending confirmation.');
        break;
      case 'cancelled':
        addNotification('Payment was cancelled.');
        break;
      case 'refunded':
        addNotification('Payment has been refunded.');
        break;
      case 'expired':
        addNotification('Payment session has expired.');
        break;
    }
  }, [status, addNotification]);

  const getStatusIcon = () => {
    const iconClass = size === 'compact' ? 'w-4 h-4' : 'w-5 h-5';
    
    switch (status) {
      case 'processing':
        return <RefreshCw className={`${iconClass} animate-spin text-blue-500`} />;
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-500`} />;
      case 'pending':
        return <Clock className={`${iconClass} text-yellow-500`} />;
      case 'cancelled':
        return <AlertCircle className={`${iconClass} text-gray-500`} />;
      case 'refunded':
        return <RefreshCw className={`${iconClass} text-blue-500`} />;
      case 'expired':
        return <Clock className={`${iconClass} text-red-500`} />;
      default:
        return <CreditCard className={`${iconClass} text-gray-500`} />;
    }
  };

  const getMethodIcon = () => {
    const iconClass = 'w-4 h-4';
    
    switch (method) {
      case 'stripe':
        return <CreditCard className={`${iconClass} text-blue-600`} />;
      case 'lemon-squeezy':
        return <Zap className={`${iconClass} text-yellow-500`} />;
      case 'oxxo':
        return <Building className={`${iconClass} text-red-500`} />;
      case 'paypal':
        return <Shield className={`${iconClass} text-blue-500`} />;
      case 'apple-pay':
        return <Smartphone className={`${iconClass} text-gray-800`} />;
      case 'google-pay':
        return <Smartphone className={`${iconClass} text-green-500`} />;
      case 'bank-transfer':
        return <Building className={`${iconClass} text-blue-700`} />;
      case 'crypto':
        return <DollarSign className={`${iconClass} text-orange-500`} />;
      default:
        return <CreditCard className={`${iconClass} text-gray-500`} />;
    }
  };

  const getStatusMessage = () => {
    const customMessage = customMessages[status];
    if (customMessage) return customMessage;

    switch (status) {
      case 'processing':
        return `Processing payment via ${method.replace('-', ' ')}...`;
      case 'success':
        return 'Payment completed successfully!';
      case 'error':
        return 'Payment failed. Please try again.';
      case 'pending':
        return 'Payment is pending confirmation...';
      case 'cancelled':
        return 'Payment was cancelled by user.';
      case 'refunded':
        return 'Payment has been refunded.';
      case 'expired':
        return 'Payment session has expired.';
      default:
        return 'Ready to process payment';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
      case 'expired':
        return 'border-red-200 bg-red-50';
      case 'processing':
        return 'border-blue-200 bg-blue-50';
      case 'pending':
        return 'border-yellow-200 bg-yellow-50';
      case 'cancelled':
        return 'border-gray-200 bg-gray-50';
      case 'refunded':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const containerClass = `
    payment-indicator rounded-lg border shadow-sm transition-all duration-300
    ${getStatusColor()}
    ${size === 'compact' ? 'p-3' : size === 'expanded' ? 'p-6' : 'p-4'}
    ${className}
  `;

  return (
    <motion.div
      className={containerClass}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: animationPreset === 'minimal' ? 0.1 : animationPreset === 'enhanced' ? 0.5 : 0.3 
      }}
    >
      {/* Notifications */}
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="mb-2 p-2 bg-blue-100 border border-blue-200 rounded text-sm text-blue-800"
          >
            <div className="flex items-center space-x-2">
              <Bell className="w-3 h-3" />
              <span>{notification}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`font-medium text-gray-900 ${size === 'compact' ? 'text-sm' : ''}`}>
            Payment Status
          </span>
          {!isOnline && (
            <WifiOff className="w-4 h-4 text-red-500" title="Offline" />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            {getMethodIcon()}
            <span className={`text-gray-600 capitalize ${size === 'compact' ? 'text-xs' : 'text-sm'}`}>
              {method.replace('-', ' ')}
            </span>
          </div>
          
          {size !== 'compact' && (
            <button
              onClick={() => setShowDetailsPanel(!showDetailsPanel)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showDetailsPanel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Status Message */}
      <p className={`text-gray-700 mb-3 ${size === 'compact' ? 'text-xs' : 'text-sm'}`}>
        {getStatusMessage()}
      </p>

      {/* Amount Display */}
      {amount && (
        <div className={`flex items-center justify-between mb-3 p-2 bg-gray-50 rounded ${size === 'compact' ? 'text-xs' : 'text-sm'}`}>
          <span className="text-gray-600">Amount:</span>
          <span className="font-semibold text-gray-900">
            {formatAmount(amount, currency)}
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <AnimatePresence>
        {showProgress && status === 'processing' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-600">Progress</span>
              <span className="text-xs text-gray-600">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">
                Elapsed: {timeElapsed}s
              </span>
              <span className="text-xs text-gray-500">
                Est: ~{Math.max(0, 30 - timeElapsed)}s
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Details Panel */}
      <AnimatePresence>
        {showDetailsPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2"
          >
            {transactionId && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Transaction ID:</span>
                <div className="flex items-center space-x-1">
                  <code className="text-xs font-mono text-gray-800">
                    {transactionId.length > 12 ? `${transactionId.slice(0, 12)}...` : transactionId}
                  </code>
                  <button
                    onClick={() => copyToClipboard(transactionId)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            
            {orderId && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Order ID:</span>
                <code className="text-xs font-mono text-gray-800">{orderId}</code>
              </div>
            )}
            
            {customerEmail && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Email:</span>
                <span className="text-xs text-gray-800">{customerEmail}</span>
              </div>
            )}
            
            {paymentDate && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Date:</span>
                <span className="text-xs text-gray-800">{formatDate(paymentDate)}</span>
              </div>
            )}
            
            {expiryDate && status === 'pending' && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Expires:</span>
                <span className="text-xs text-red-600">{formatDate(expiryDate)}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code for OXXO payments */}
      <AnimatePresence>
        {showQRCode && method === 'oxxo' && status === 'pending' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 bg-white border rounded-lg text-center"
          >
            <QrCode className="w-16 h-16 mx-auto mb-2 text-gray-400" />
            <p className="text-xs text-gray-600">
              Scan QR code at OXXO to pay
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics */}
      <AnimatePresence>
        {showAnalytics && analytics.attempts > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                <span>Success: {analytics.successRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <span>Avg: {(analytics.averageTime / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex items-center space-x-1">
                <Activity className="w-3 h-3 text-blue-500" />
                <span>Attempts: {analytics.attempts}</span>
              </div>
              <div className="flex items-center space-x-1">
                <DollarSign className="w-3 h-3 text-blue-500" />
                <span>Total: {formatAmount(analytics.totalAmount, currency)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Badge */}
      <div className="flex items-center justify-center space-x-1 text-xs text-gray-500 mb-3">
        <Lock className="w-3 h-3" />
        <span>Secured by SSL encryption</span>
        {isOnline ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-500" />
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <AnimatePresence>
          {status === 'error' && onRetry && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={onRetry}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Payment</span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(status === 'processing' || status === 'pending') && onCancel && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={onCancel}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm font-medium"
            >
              Cancel Payment
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-center space-x-2 text-green-600 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>Payment processed successfully!</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {onDownloadReceipt && (
                  <button
                    onClick={onDownloadReceipt}
                    className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Receipt</span>
                  </button>
                )}
                
                {onViewDetails && (
                  <button
                    onClick={onViewDetails}
                    className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Details</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OXXO Instructions */}
        <AnimatePresence>
          {status === 'pending' && method === 'oxxo' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm"
            >
              <div className="flex items-start space-x-2">
                <Building className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-yellow-800 font-medium mb-1">
                    OXXO Payment Instructions
                  </p>
                  <p className="text-yellow-700 text-xs mb-2">
                    Visit any OXXO store and provide the reference number to complete your payment.
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyToClipboard(transactionId || '')}
                      className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300 transition-colors flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copied ? 'Copied!' : 'Copy Ref'}</span>
                    </button>
                    {showQRCode && (
                      <button
                        onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                        className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs hover:bg-yellow-300 transition-colors flex items-center space-x-1"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>QR Code</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Last Update Indicator */}
      {realTimeUpdates && (
        <div className="mt-3 text-xs text-gray-400 text-center">
          Last updated: {formatDate(lastUpdate)}
        </div>
      )}
    </motion.div>
  );
}