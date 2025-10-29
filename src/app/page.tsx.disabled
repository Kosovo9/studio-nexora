'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { 
  Upload, Sparkles, Check, X, Download, Loader2, Info, 
  Zap, Star, Heart, Globe, Shield, CreditCard, Image as ImageIcon,
  Share2, Settings, User, Bell, Search, Menu, ChevronDown,
  Play, Pause, RotateCcw, Maximize, Eye, EyeOff
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { useTranslation } from '@/lib/i18n';
import { formatFileSize, fileToBase64, downloadFile } from '@/lib/utils';
import type { ImageType, ProcessingStatus, Language } from '@/types';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Import our new components
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useToast } from '@/components/Toast';
import { Loading, Skeleton, LoadingDots, Spinner, ProgressRing } from '@/components/Loading';
import { useModal, ConfirmationModal, AlertModal } from '@/components/Modal';
import { Input, SearchInput } from '@/components/Input';
import EarthCanvas from '@/components/EarthCanvas';

export default function StudioNexora() {
  // Core state
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<ImageType>('person');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [selectedProcessedImage, setSelectedProcessedImage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // UI state
  const [showStats, setShowStats] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'gallery' | 'stats' | 'settings'>('upload');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Hooks
  const { data: session } = useSession();
  const router = useRouter();
  const { addToast, toasts } = useToast();
  const { openModal, closeModal } = useModal();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  
  // Scroll animations
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '200%']);

  // Language configuration
  const languages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
    { code: 'no', name: 'Norsk', flag: '🇳🇴' },
    { code: 'da', name: 'Dansk', flag: '🇩🇰' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
  ];



  // Get current translation
  const { t } = useTranslation();

  // Initialization effect
  useEffect(() => {
    const initializeApp = async () => {
      setIsInitializing(true);
      
      // Simulate app initialization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsInitializing(false);
      
      addToast({
        type: 'success',
        title: 'Welcome to Nexora Studio!',
        message: 'Your AI-powered image transformation platform is ready',
        duration: 5000
      });
    };

    initializeApp();
  }, [addToast]);

  // Enhanced dropzone with animations
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please upload a valid image file',
        duration: 4000
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Maximum file size is 10MB',
        duration: 4000
      });
      return;
    }

    setStatus('uploading');
    setProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setImageFile(file);
        setProgress(100);
        setStatus('idle');
        clearInterval(progressInterval);
        
        addToast({
          type: 'success',
          title: 'Upload Complete',
          message: `${file.name} uploaded successfully`,
          duration: 3000
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      clearInterval(progressInterval);
      setStatus('idle');
      setProgress(0);
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload image. Please try again.',
        duration: 4000
      });
    }
  }, [addToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    },
    maxFiles: 1,
    multiple: false,
  });

  // Enhanced processing function
  const handleProcess = async () => {
    if (!image || !imageFile || !consent) {
      addToast({
        type: 'error',
        title: 'No Image Selected',
        message: 'Please select an image first',
        duration: 4000
      });
      return;
    }

    openModal({
      type: 'confirmation',
      title: 'Start Processing',
      message: 'Are you ready to transform your image with AI magic?',
      onConfirm: async () => {
        setStatus('processing');
        setProgress(0);
        
        addToast({
          type: 'loading',
          title: 'AI Processing',
          message: 'Your image is being transformed...',
          duration: 0,
          progress: 0
        });

        // Simulate AI processing with realistic stages
        const stages = [
          { name: 'Analyzing image...', duration: 2000, progress: 20 },
          { name: 'Applying AI filters...', duration: 3000, progress: 50 },
          { name: 'Enhancing details...', duration: 2500, progress: 75 },
          { name: 'Finalizing...', duration: 1500, progress: 100 }
        ];

        for (const stage of stages) {
          await new Promise(resolve => setTimeout(resolve, stage.duration));
          setProgress(stage.progress);
          
          addToast({
            type: 'loading',
            title: 'AI Processing',
            message: stage.name,
            duration: 0,
            progress: stage.progress
          });
        }

        // Simulate processed result
        setProcessedImages([image, image, image]); // Mock multiple results
        setStatus('completed');
        
        addToast({
          type: 'success',
          title: 'Processing Complete!',
          message: 'Your AI-enhanced images are ready',
          duration: 5000
        });

        closeModal();
      },
      onCancel: () => {
        addToast({
          type: 'info',
          title: 'Processing Cancelled',
          message: 'You can start processing anytime',
          duration: 3000
        });
      }
    });
  };

  // Stats data
  const stats = [
    { label: 'Images Processed', value: '2.5M+', icon: ImageIcon, color: 'text-blue-400' },
    { label: 'Happy Users', value: '150K+', icon: Heart, color: 'text-pink-400' },
    { label: 'Countries', value: '120+', icon: Globe, color: 'text-green-400' },
    { label: 'AI Models', value: '50+', icon: Sparkles, color: 'text-purple-400' }
  ];

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          style={{ y: backgroundY }}
          className="absolute -top-1/2 -left-1/2 w-full h-full"
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-2000" />
        </motion.div>
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="relative z-10 pt-20">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center px-4">
          <div className="absolute inset-0 z-0">
            <EarthCanvas />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center space-x-2 text-purple-400"
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-medium">AI-Powered Studio</span>
                </motion.div>
                
                <motion.h1
                  style={{ y: textY }}
                  className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent leading-tight"
                >
                  Transform Your
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Images
                  </span>
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-xl text-gray-300 leading-relaxed max-w-lg"
                >
                  Experience the future of image processing with our advanced AI technology. 
                  Create stunning visuals in seconds.
                </motion.p>
              </div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap gap-4"
              >
                <button
                  onClick={() => setActiveTab('upload')}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                >
                  <span className="flex items-center space-x-2">
                    <Upload className="w-5 h-5" />
                    <span>Start Creating</span>
                  </span>
                </button>
                
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-xl font-semibold hover:bg-white/20 transform hover:scale-105 transition-all duration-200 border border-white/20"
                >
                  <span className="flex items-center space-x-2">
                    <Star className="w-5 h-5" />
                    <span>View Stats</span>
                  </span>
                </button>
              </motion.div>

              {/* Stats Display */}
              <AnimatePresence>
                {showStats && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-4 pt-8"
                  >
                    {stats.map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
                      >
                        <div className="flex items-center space-x-3">
                          <stat.icon className={`w-6 h-6 ${stat.color}`} />
                          <div>
                            <div className="text-2xl font-bold text-white">{stat.value}</div>
                            <div className="text-sm text-gray-300">{stat.label}</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right Column - Interactive Panel */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
                {/* Tab Navigation */}
                <div className="flex space-x-1 mb-8 bg-white/5 rounded-lg p-1">
                  {[
                    { id: 'upload', label: 'Upload', icon: Upload },
                    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
                    { id: 'stats', label: 'Stats', icon: Star },
                    { id: 'settings', label: 'Settings', icon: Settings }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                  {activeTab === 'upload' && (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {/* Upload Area */}
                      <div
                        {...getRootProps()}
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                          isDragActive
                            ? 'border-purple-400 bg-purple-500/10'
                            : 'border-gray-600 hover:border-purple-500 hover:bg-purple-500/5'
                        }`}
                      >
                        <input {...getInputProps()} />
                        
                        <motion.div
                          animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
                          className="space-y-4"
                        >
                          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            <Upload className="w-8 h-8 text-white" />
                          </div>
                          
                          <div>
                            <p className="text-lg font-semibold text-white mb-2">
                              {isDragActive ? 'Drop your image here' : 'Upload your image'}
                            </p>
                            <p className="text-sm text-gray-400">
                              Drag & drop or click to browse • PNG, JPG, WEBP up to 10MB
                            </p>
                          </div>
                        </motion.div>

                        {/* Upload Progress */}
                        {status === 'uploading' && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center"
                          >
                            <div className="text-center space-y-4">
                              <Spinner size="lg" />
                              <div className="space-y-2">
                                <p className="text-white font-medium">Uploading...</p>
                                <ProgressRing progress={progress} size={40} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Image Preview */}
                      {image && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative rounded-xl overflow-hidden"
                        >
                          <Image
                            src={image}
                            alt="Uploaded image"
                            width={400}
                            height={300}
                            className="w-full h-48 object-cover"
                          />
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          
                          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                            <div className="text-white">
                              <p className="font-medium">{imageFile?.name}</p>
                              <p className="text-sm opacity-75">
                                {imageFile && formatFileSize(imageFile.size)}
                              </p>
                            </div>
                            
                            <button
                              onClick={() => setShowPreview(!showPreview)}
                              className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                            >
                              {showPreview ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-white" />}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Image Type Selection */}
                      {image && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          <label className="block text-sm font-medium text-gray-300">
                            Image Type
                          </label>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { value: 'person', label: 'Person', icon: User },
                              { value: 'person-pet', label: 'Person + Pet', icon: Heart }
                            ].map((type) => (
                              <button
                                key={type.value}
                                onClick={() => setSelectedType(type.value as ImageType)}
                                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                                  selectedType === type.value
                                    ? 'border-purple-500 bg-purple-500/20 text-white'
                                    : 'border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white'
                                }`}
                              >
                                <type.icon className="w-6 h-6 mx-auto mb-2" />
                                <span className="text-sm font-medium">{type.label}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* Consent Checkbox */}
                      {image && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start space-x-3"
                        >
                          <button
                            onClick={() => setConsent(!consent)}
                            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                              consent
                                ? 'bg-purple-600 border-purple-600'
                                : 'border-gray-600 hover:border-purple-500'
                            }`}
                          >
                            {consent && <Check className="w-3 h-3 text-white" />}
                          </button>
                          
                          <label className="text-sm text-gray-300 leading-relaxed">
                            I agree to the{' '}
                            <button className="text-purple-400 hover:text-purple-300 underline">
                              Terms of Service
                            </button>{' '}
                            and{' '}
                            <button className="text-purple-400 hover:text-purple-300 underline">
                              Privacy Policy
                            </button>
                          </label>
                        </motion.div>
                      )}

                      {/* Process Button */}
                      {image && (
                        <motion.button
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={handleProcess}
                          disabled={!consent || status === 'processing'}
                          className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 ${
                            consent && status !== 'processing'
                              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transform hover:scale-[1.02] shadow-lg hover:shadow-purple-500/25'
                              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {status === 'processing' ? (
                            <span className="flex items-center justify-center space-x-2">
                              <LoadingDots />
                              <span>Processing... {progress}%</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center space-x-2">
                              <Sparkles className="w-5 h-5" />
                              <span>Transform with AI</span>
                            </span>
                          )}
                        </motion.button>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'gallery' && (
                    <motion.div
                      key="gallery"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      <SearchInput
                        placeholder="Search your images..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onSearch={(query) => console.log('Searching:', query)}
                      />

                      {isLoadingGallery ? (
                        <div className="grid grid-cols-2 gap-4">
                          {[...Array(6)].map((_, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <Skeleton className="w-full h-32 rounded-lg" />
                            </motion.div>
                          ))}
                        </div>
                      ) : processedImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4">
                          {processedImages.map((img, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1 }}
                              className="relative group cursor-pointer rounded-lg overflow-hidden"
                              onClick={() => setSelectedProcessedImage(img)}
                            >
                              <Image
                                src={img}
                                alt={`Processed ${index + 1}`}
                                width={200}
                                height={150}
                                className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                              
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300 flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                                  <button className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30">
                                    <Download className="w-4 h-4 text-white" />
                                  </button>
                                  <button className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30">
                                    <Share2 className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">No images yet</p>
                          <p className="text-sm">Upload and process your first image to see it here</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'settings' && (
                    <motion.div
                      key="settings"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {isLoadingStats ? (
                        <div className="space-y-6">
                          <Skeleton className="h-8 w-48" />
                          <div className="grid grid-cols-2 gap-4">
                            {[...Array(4)].map((_, index) => (
                              <div key={index} className="space-y-3">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-16 w-full rounded-lg" />
                              </div>
                            ))}
                          </div>
                          <div className="space-y-3">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-32 w-full rounded-lg" />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <h3 className="text-xl font-semibold text-white">Processing Settings</h3>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <h4 className="font-medium text-white mb-2">Quality</h4>
                              <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
                                <option value="standard">Standard</option>
                                <option value="high">High Quality</option>
                                <option value="ultra">Ultra HD</option>
                              </select>
                            </div>
                            
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <h4 className="font-medium text-white mb-2">Processing Speed</h4>
                              <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
                                <option value="balanced">Balanced</option>
                                <option value="fast">Fast</option>
                                <option value="quality">Quality First</option>
                              </select>
                            </div>
                            
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <h4 className="font-medium text-white mb-2">Output Format</h4>
                              <select className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white">
                                <option value="jpg">JPEG</option>
                                <option value="png">PNG</option>
                                <option value="webp">WebP</option>
                              </select>
                            </div>
                            
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <h4 className="font-medium text-white mb-2">Auto-Save</h4>
                              <label className="flex items-center space-x-2">
                                <input type="checkbox" className="rounded" defaultChecked />
                                <span className="text-white text-sm">Save processed images automatically</span>
                              </label>
                            </div>
                          </div>
                          
                          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <h4 className="font-medium text-white mb-3">Processing Statistics</h4>
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <div className="text-2xl font-bold text-blue-400">127</div>
                                <div className="text-sm text-gray-400">Images Processed</div>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-green-400">98.5%</div>
                                <div className="text-sm text-gray-400">Success Rate</div>
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-purple-400">2.3s</div>
                                <div className="text-sm text-gray-400">Avg. Processing Time</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Stats Tab */}
                  {activeTab === 'stats' && (
                    <motion.div
                      key="stats"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                      {isLoadingStats ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            {[...Array(4)].map((_, index) => (
                              <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                                <Skeleton className="h-6 w-32 mb-3" />
                                <Skeleton className="h-8 w-20 mb-2" />
                                <Skeleton className="h-4 w-24" />
                              </div>
                            ))}
                          </div>
                          
                          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                            <Skeleton className="h-6 w-40 mb-4" />
                            <div className="space-y-3">
                              {[...Array(5)].map((_, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <Skeleton className="w-10 h-10 rounded-lg" />
                                    <div>
                                      <Skeleton className="h-4 w-24 mb-1" />
                                      <Skeleton className="h-3 w-32" />
                                    </div>
                                  </div>
                                  <Skeleton className="h-4 w-16" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 }}
                              className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all duration-300"
                            >
                              <h3 className="text-lg font-semibold text-white mb-2">Total Processed</h3>
                              <p className="text-3xl font-bold text-blue-400">1,247</p>
                              <p className="text-sm text-gray-400">+12% from last month</p>
                            </motion.div>
                            
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.2 }}
                              className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all duration-300"
                            >
                              <h3 className="text-lg font-semibold text-white mb-2">Success Rate</h3>
                              <p className="text-3xl font-bold text-green-400">98.5%</p>
                              <p className="text-sm text-gray-400">Excellent performance</p>
                            </motion.div>
                            
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3 }}
                              className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all duration-300"
                            >
                              <h3 className="text-lg font-semibold text-white mb-2">Avg. Processing Time</h3>
                              <p className="text-3xl font-bold text-purple-400">2.3s</p>
                              <p className="text-sm text-gray-400">-0.5s improvement</p>
                            </motion.div>
                            
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4 }}
                              className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all duration-300"
                            >
                              <h3 className="text-lg font-semibold text-white mb-2">Storage Used</h3>
                              <p className="text-3xl font-bold text-orange-400">2.1GB</p>
                              <p className="text-sm text-gray-400">of 10GB available</p>
                            </motion.div>
                          </div>
                          
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white/5 rounded-lg p-6 border border-white/10"
                          >
                            <h3 className="text-lg font-semibold text-white mb-4">Processing History</h3>
                            <div className="space-y-3">
                              {[...Array(5)].map((_, index) => (
                                <motion.div 
                                  key={index}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.6 + index * 0.1 }}
                                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-300"
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                      <ImageIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <p className="text-white font-medium">Image_{index + 1}.jpg</p>
                                      <p className="text-sm text-gray-400">Processed 2 hours ago</p>
                                    </div>
                                  </div>
                                  <div className="text-green-400 text-sm">✓ Success</div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 300, scale: 0.3 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
              className={`max-w-sm p-4 rounded-lg shadow-lg backdrop-blur-sm border ${
                toast.type === 'success' ? 'bg-green-500/90 border-green-400' :
                toast.type === 'error' ? 'bg-red-500/90 border-red-400' :
                toast.type === 'warning' ? 'bg-yellow-500/90 border-yellow-400' :
                toast.type === 'loading' ? 'bg-blue-500/90 border-blue-400' :
                'bg-gray-500/90 border-gray-400'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {toast.type === 'success' && <Check className="w-5 h-5 text-white" />}
                  {toast.type === 'error' && <X className="w-5 h-5 text-white" />}
                  {toast.type === 'warning' && <Info className="w-5 h-5 text-white" />}
                  {toast.type === 'loading' && <Loader2 className="w-5 h-5 text-white animate-spin" />}
                  {toast.type === 'info' && <Info className="w-5 h-5 text-white" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{toast.title}</p>
                  {toast.message && (
                    <p className="text-sm text-white/80 mt-1">{toast.message}</p>
                  )}
                  
                  {toast.progress !== undefined && (
                    <div className="mt-2 w-full bg-white/20 rounded-full h-1">
                      <div 
                        className="bg-white h-1 rounded-full transition-all duration-300"
                        style={{ width: `${toast.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
