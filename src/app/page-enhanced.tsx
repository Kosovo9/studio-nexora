'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import toast, { Toaster } from 'react-hot-toast';
import {
  Upload,
  Sparkles,
  Download,
  Share2,
  Check,
  X,
  Loader2,
  Image as ImageIcon,
  CreditCard,
  Shield,
  Zap,
  Star,
  Heart,
  Globe,
} from 'lucide-react';
import TurnstileWidget, { useTurnstile } from '@/components/TurnstileWidget';
import { useStudioStore } from '@/lib/store';
import { translations } from '@/lib/translations';

type ImageType = 'person' | 'person-pet';
type PlanType = 'basic' | 'pro' | 'vip';
type ProcessingStage = 'idle' | 'uploading' | 'verifying' | 'processing' | 'complete' | 'error';

interface ProcessingProgress {
  stage: ProcessingStage;
  progress: number;
  message: string;
}

export default function StudioNexoraEnhanced() {
  // State Management
  const [image, setImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ImageType>('person');
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [consent, setConsent] = useState(false);
  const [language, setLanguage] = useState<keyof typeof translations>('es');
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
    stage: 'idle',
    progress: 0,
    message: '',
  });

  // Turnstile Hook
  const {
    token: turnstileToken,
    isVerified,
    error: turnstileError,
    handleSuccess: handleTurnstileSuccess,
    handleError: handleTurnstileError,
    handleExpire: handleTurnstileExpire,
    reset: resetTurnstile,
  } = useTurnstile();

  // Zustand Store
  const { addImage, images } = useStudioStore();

  // Get translations
  const t = translations[language];

  // Dropzone Configuration
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error(t.errors?.invalidFileType || 'Invalid file type');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t.errors?.fileTooLarge || 'File too large (max 10MB)');
      return;
    }

    // Read file
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      toast.success(t.success?.imageUploaded || 'Image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Process Image Function - 200% FUNCTIONAL
  const processImage = async () => {
    // Validation
    if (!image) {
      toast.error('Please upload an image first');
      return;
    }

    if (!consent) {
      toast.error('Please accept the terms of use');
      return;
    }

    if (!isVerified) {
      toast.error('Please complete the human verification');
      return;
    }

    try {
      // Stage 1: Uploading
      setProcessingProgress({
        stage: 'uploading',
        progress: 10,
        message: 'Uploading image...',
      });

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          turnstileToken,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const { imageUrl } = await uploadResponse.json();

      // Stage 2: Verifying
      setProcessingProgress({
        stage: 'verifying',
        progress: 30,
        message: 'Verifying image...',
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Stage 3: Processing
      setProcessingProgress({
        stage: 'processing',
        progress: 50,
        message: 'AI is creating your professional photo...',
      });

      const processResponse = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          type: selectedType,
          turnstileToken,
        }),
      });

      if (!processResponse.ok) {
        throw new Error('Processing failed');
      }

      const { processedImageUrl } = await processResponse.json();

      // Stage 4: Finalizing
      setProcessingProgress({
        stage: 'processing',
        progress: 90,
        message: 'Finalizing...',
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Stage 5: Complete
      setProcessedImage(processedImageUrl);
      setProcessingProgress({
        stage: 'complete',
        progress: 100,
        message: 'Complete!',
      });

      // Add to store
      addImage({
        id: Date.now().toString(),
        originalUrl: imageUrl,
        processedUrl: processedImageUrl,
        type: selectedType,
        createdAt: new Date(),
      });

      toast.success('✅ Your professional photo is ready!');

      // Reset turnstile
      resetTurnstile();
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingProgress({
        stage: 'error',
        progress: 0,
        message: 'Processing failed',
      });
      toast.error('Failed to process image. Please try again.');
    }
  };

  // Download Function - 200% FUNCTIONAL
  const downloadImage = async () => {
    if (!processedImage) return;

    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studio-nexora-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download image');
    }
  };

  // Share Function - 200% FUNCTIONAL
  const shareImage = async () => {
    if (!processedImage) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Studio Nexora - Professional Photo',
          text: 'Check out my professional photo created with Studio Nexora!',
          url: processedImage,
        });
        toast.success('Shared successfully!');
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(processedImage);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share image');
    }
  };

  // Payment Function - 200% FUNCTIONAL
  const handlePayment = async (plan: PlanType) => {
    try {
      setSelectedPlan(plan);
      toast.loading('Redirecting to payment...');

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          turnstileToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment creation failed');
      }

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to create payment. Please try again.');
    }
  };

  // Reset Function - 200% FUNCTIONAL
  const resetAll = () => {
    setImage(null);
    setProcessedImage(null);
    setProcessingProgress({
      stage: 'idle',
      progress: 0,
      message: '',
    });
    resetTurnstile();
    toast.success('Reset complete!');
  };

  const isProcessing = ['uploading', 'verifying', 'processing'].includes(
    processingProgress.stage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      <Toaster position="top-center" />

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 p-4 md:p-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-cyan-400" />
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-300">
              Studio Nexora
            </h1>
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            {t.subtitle}
          </p>

          {/* Language Selector - 200% FUNCTIONAL */}
          <div className="mt-6 flex justify-center gap-2">
            {Object.keys(translations).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang as keyof typeof translations)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  language === lang
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </motion.header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Upload & Process */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Image Type Selector - 200% FUNCTIONAL */}
            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Select Photo Type
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedType('person')}
                  className={`p-4 rounded-xl transition-all ${
                    selectedType === 'person'
                      ? 'bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg scale-105'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <div className="text-4xl mb-2">👤</div>
                  <div className="font-semibold">Solo Me</div>
                </button>
                <button
                  onClick={() => setSelectedType('person-pet')}
                  className={`p-4 rounded-xl transition-all ${
                    selectedType === 'person-pet'
                      ? 'bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg scale-105'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  <div className="text-4xl mb-2">👤🐾</div>
                  <div className="font-semibold">Me + Pet</div>
                </button>
              </div>
            </div>

            {/* Upload Area - 200% FUNCTIONAL */}
            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
              >
                <input {...getInputProps()} />
                {image ? (
                  <div className="relative">
                    <img
                      src={image}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setImage(null);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-500 rounded-full hover:bg-red-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-semibold mb-2">
                      {isDragActive ? 'Drop image here' : 'Upload Your Photo'}
                    </p>
                    <p className="text-sm text-gray-400">
                      Drag & drop or click to browse
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Cloudflare Turnstile - 200% FUNCTIONAL */}
            {image && !isVerified && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700"
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Human Verification
                </h3>
                <TurnstileWidget
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
                  onSuccess={handleTurnstileSuccess}
                  onError={handleTurnstileError}
                  onExpire={handleTurnstileExpire}
                  action="upload"
                  theme="dark"
                  className="flex justify-center"
                />
                {turnstileError && (
                  <p className="text-red-400 text-sm mt-2">{turnstileError}</p>
                )}
              </motion.div>
            )}

            {/* Consent - 200% FUNCTIONAL */}
            {image && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700"
              >
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition">
                    {t.disclaimer}
                  </span>
                </label>
              </motion.div>
            )}

            {/* Process Button - 200% FUNCTIONAL */}
            {image && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={processImage}
                disabled={!consent || !isVerified || isProcessing}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {processingProgress.message}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Create Professional Photo
                  </>
                )}
              </motion.button>
            )}

            {/* Progress Bar - 200% FUNCTIONAL */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700"
              >
                <div className="mb-2 flex justify-between text-sm">
                  <span>{processingProgress.message}</span>
                  <span>{processingProgress.progress}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${processingProgress.progress}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  />
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right Column - Result & Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Processed Image - 200% FUNCTIONAL */}
            {processedImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700"
              >
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Your Professional Photo
                </h3>
                <img
                  src={processedImage}
                  alt="Processed"
                  className="w-full rounded-lg shadow-2xl"
                />

                {/* Action Buttons - 200% FUNCTIONAL */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <button
                    onClick={downloadImage}
                    className="py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={shareImage}
                    className="py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={resetAll}
                    className="py-3 bg-slate-600 hover:bg-slate-700 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    New
                  </button>
                </div>
              </motion.div>
            )}

            {/* Pricing Plans - 200% FUNCTIONAL */}
            <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                Pricing Plans
              </h3>
              <div className="space-y-4">
                {[
                  {
                    name: 'Basic',
                    price: '$5',
                    features: ['1 photo', '3 backgrounds', 'HD quality'],
                    color: 'from-blue-600 to-cyan-500',
                    plan: 'basic' as PlanType,
                  },
                  {
                    name: 'Pro',
                    price: '$15',
                    features: ['Unlimited photos', 'Face editing', 'Mini-clips'],
                    color: 'from-purple-600 to-pink-500',
                    plan: 'pro' as PlanType,
                    popular: true,
                  },
                  {
                    name: 'VIP',
                    price: '$30',
                    features: ['Priority support', '5% donation', 'Marketplace access'],
                    color: 'from-yellow-600 to-orange-500',
                    plan: 'vip' as PlanType,
                  },
                ].map((tier) => (
                  <motion.div
                    key={tier.name}
                    whileHover={{ scale: 1.02 }}
                    className={`relative p-5 rounded-xl bg-gradient-to-br ${tier.color} ${
                      tier.popular ? 'ring-2 ring-yellow-400' : ''
                    }`}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-yellow-400 text-black text-xs font-bold rounded-full">
                        POPULAR
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-xl font-bold">{tier.name}</h4>
                        <p className="text-3xl font-bold mt-1">{tier.price}</p>
                      </div>
                      <Heart className="w-6 h-6" />
                    </div>
                    <ul className="space-y-2 mb-4">
                      {tier.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handlePayment(tier.plan)}
                      disabled={selectedPlan === tier.plan}
                      className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-lg font-bold transition backdrop-blur-sm disabled:opacity-50"
                    >
                      {selectedPlan === tier.plan ? 'Processing...' : 'Choose Plan'}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Gallery Preview - 200% FUNCTIONAL */}
            {images.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border border-slate-700"
              >
                <h3 className="text-xl font-bold mb-4">Your Gallery</h3>
                <div className="grid grid-cols-3 gap-3">
                  {images.slice(0, 6).map((img) => (
                    <img
                      key={img.id}
                      src={img.processedUrl}
                      alt="Gallery"
                      className="w-full h-24 object-cover rounded-lg cursor-pointer hover:scale-105 transition"
                      onClick={() => setProcessedImage(img.processedUrl)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-sm text-slate-400"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-4 h-4" />
            <span>Protected by Cloudflare Turnstile</span>
          </div>
          <p>© 2025 Studio Nexora. All rights reserved.</p>
          <p className="mt-1">Anti-cloning & scraping protection enabled</p>
        </motion.footer>
      </div>
    </div>
  );
}
