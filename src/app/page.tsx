'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, Check, X, Download, Loader2, Info } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast, { Toaster } from 'react-hot-toast';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { getTranslation, detectLanguage } from '@/lib/translations';
import { formatFileSize, fileToBase64, downloadFile } from '@/lib/utils';
import type { ImageType, ProcessingStatus, Language } from '@/types';

export default function StudioNexora() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<ImageType>('person');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedProcessedImage, setSelectedProcessedImage] = useState<string | null>(null);

  const { language, setLanguage } = useStore();

  // Detect browser language on mount
  useEffect(() => {
    const detectedLang = detectLanguage();
    setLanguage(detectedLang as Language);
  }, [setLanguage]);

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG, or WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setImageFile(file);
      setProcessedImages([]);
      setSelectedProcessedImage(null);
      toast.success('Image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Process image with AI
  const processImage = async () => {
    if (!image || !consent) {
      toast.error(getTranslation('error', language));
      return;
    }

    if (!imageFile) {
      toast.error('Please upload an image first');
      return;
    }

    setStatus('uploading');
    setProgress(0);

    try {
      // Step 1: Upload image
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('imageType', selectedType);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const { url: uploadedUrl } = await uploadResponse.json();
      setProgress(25);

      // Step 2: Process with AI
      setStatus('processing');
      const processResponse = await fetch('/api/studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedUrl,
          imageType: selectedType,
        }),
      });

      if (!processResponse.ok) {
        throw new Error('Failed to process image');
      }

      const { processedUrls } = await processResponse.json();
      setProgress(100);
      setStatus('completed');
      setProcessedImages(processedUrls);
      setSelectedProcessedImage(processedUrls[0]);

      toast.success(getTranslation('success', language));
    } catch (error) {
      console.error('Error processing image:', error);
      setStatus('error');
      toast.error('Failed to process image. Please try again.');
    }
  };

  // Download processed image
  const handleDownload = (url: string) => {
    downloadFile(url, `studio-nexora-${Date.now()}.jpg`);
    toast.success('Image downloaded successfully!');
  };

  const t = (key: string) => getTranslation(key as any, language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
      <Toaster position="top-center" />

      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 relative z-10">
        {/* Header */}
        <motion.header
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 mb-4"
            whileHover={{ scale: 1.05 }}
          >
            <Sparkles className="w-8 h-8 text-cyan-400" />
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400">
              {t('title')}
            </h1>
          </motion.div>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Upload & Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl">
              {/* Image Type Selector */}
              <div className="flex gap-3 mb-6">
                <motion.button
                  onClick={() => setSelectedType('person')}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                    selectedType === 'person'
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/50'
                      : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('soloMe')}
                </motion.button>
                <motion.button
                  onClick={() => setSelectedType('person-pet')}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                    selectedType === 'person-pet'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {t('meAndPet')}
                </motion.button>
              </div>

              {/* Upload Area */}
              <div
                {...getRootProps()}
                className={`relative border-2 border-dashed rounded-2xl p-8 mb-6 transition-all cursor-pointer ${
                  isDragActive
                    ? 'border-cyan-400 bg-cyan-400/10'
                    : 'border-slate-600 hover:border-slate-500 bg-slate-900/30'
                }`}
              >
                <input {...getInputProps()} />
                {image ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden">
                    <Image
                      src={image}
                      alt="Preview"
                      fill
                      className="object-contain"
                      priority
                    />
                    {status === 'processing' && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
                        <p className="text-center px-4">{t('processingMessage')}</p>
                        <div className="w-64 h-2 bg-slate-700 rounded-full mt-4 overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <p className="text-lg font-medium text-slate-300 mb-2">
                      {isDragActive ? 'Drop your image here' : t('uploadPlaceholder')}
                    </p>
                    <p className="text-sm text-slate-500">
                      JPEG, PNG, or WebP (Max 10MB)
                    </p>
                  </div>
                )}
              </div>

              {/* File Info */}
              {imageFile && (
                <motion.div
                  className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{imageFile.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(imageFile.size)}</p>
                    </div>
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                </motion.div>
              )}

              {/* Consent */}
              <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer"
                    />
                    {consent && (
                      <Check className="w-3 h-3 text-white absolute pointer-events-none" />
                    )}
                  </div>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    {t('disclaimer')}
                  </span>
                </label>
              </div>

              {/* Action Button */}
              <motion.button
                onClick={processImage}
                disabled={!image || !consent || status === 'processing'}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
                whileHover={{ scale: !image || !consent ? 1 : 1.02 }}
                whileTap={{ scale: !image || !consent ? 1 : 0.98 }}
              >
                {status === 'processing' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('processing')}
                  </span>
                ) : (
                  t('createStudioPhoto')
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Right Column - Results & Pricing */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-8"
          >
            {/* Processed Images */}
            {processedImages.length > 0 && (
              <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                  Your Studio Photos
                </h3>

                {/* Main Preview */}
                {selectedProcessedImage && (
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
                    <Image
                      src={selectedProcessedImage}
                      alt="Processed"
                      fill
                      className="object-contain"
                    />
                    <motion.button
                      onClick={() => handleDownload(selectedProcessedImage)}
                      className="absolute top-4 right-4 p-3 bg-black/50 backdrop-blur-sm rounded-full hover:bg-black/70 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Download className="w-5 h-5" />
                    </motion.button>
                  </div>
                )}

                {/* Thumbnails */}
                <div className="grid grid-cols-3 gap-3">
                  {processedImages.map((url, index) => (
                    <motion.div
                      key={index}
                      className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer border-2 ${
                        selectedProcessedImage === url
                          ? 'border-cyan-400'
                          : 'border-transparent'
                      }`}
                      onClick={() => setSelectedProcessedImage(url)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Image src={url} alt={`Result ${index + 1}`} fill className="object-cover" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Plans */}
            <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-6 border border-slate-700/50 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6">{t('pricingPlans')}</h3>
              <div className="space-y-4">
                {[
                  { name: 'basic', price: '$5', desc: 'basicDesc', color: 'from-blue-600 to-cyan-500' },
                  { name: 'pro', price: '$15', desc: 'proDesc', color: 'from-purple-600 to-pink-500', popular: true },
                  { name: 'vip', price: '$30', desc: 'vipDesc', color: 'from-orange-600 to-red-500' },
                ].map((plan) => (
                  <motion.div
                    key={plan.name}
                    className={`relative p-5 rounded-xl border ${
                      plan.popular
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-slate-700 bg-slate-900/40'
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-500 rounded-full text-xs font-bold">
                        POPULAR
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-lg">{t(plan.name)}</h4>
                      <span className={`text-2xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent`}>
                        {plan.price}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">{t(plan.desc)}</p>
                    <motion.button
                      className={`w-full py-2 rounded-lg font-semibold bg-gradient-to-r ${plan.color} hover:shadow-lg transition-all`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Choose Plan
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          className="mt-16 text-center text-sm text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {t('footer')}
        </motion.footer>
      </div>
    </div>
  );
}
