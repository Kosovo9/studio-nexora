// Core Types
export type ImageType = 'person' | 'person-pet';
export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
export type PlanType = 'basic' | 'pro' | 'vip';
export type Language = 'es' | 'en' | 'pt' | 'fr' | 'de' | 'it' | 'ja' | 'ko' | 'zh' | 'ar';

// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  subscription?: Subscription;
}

export interface Subscription {
  id: string;
  plan: PlanType;
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodEnd: Date;
}

// Image Types
export interface ImageData {
  id: string;
  originalUrl: string;
  processedUrl?: string;
  thumbnailUrl?: string;
  imageType: ImageType;
  status: ProcessingStatus;
  watermarkId?: string;
  createdAt: Date;
  metadata?: ImageMetadata;
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  processingTime?: number;
}

export interface UploadedFile {
  file: File;
  preview: string;
  progress: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ProcessImageResponse {
  id: string;
  processedUrl: string;
  thumbnailUrl: string;
  watermarkId: string;
  processingTime: number;
}

export interface UploadResponse {
  url: string;
  key: string;
  size: number;
}

// Payment Types
export interface PaymentIntent {
  clientSecret: string;
  amount: number;
  currency: string;
}

export interface PlanDetails {
  id: PlanType;
  name: string;
  price: number;
  priceId: string;
  features: string[];
  popular?: boolean;
  imagesPerMonth: number | 'unlimited';
  backgrounds: number;
  faceEditing: boolean;
  miniClips: boolean;
  priority: boolean;
  donation: boolean;
  marketplace: boolean;
}

// Form Types
export interface ProcessImageForm {
  image: File;
  imageType: ImageType;
  consent: boolean;
}

// Store Types
export interface AppState {
  user: User | null;
  images: ImageData[];
  currentImage: ImageData | null;
  isProcessing: boolean;
  language: Language;
  setUser: (user: User | null) => void;
  addImage: (image: ImageData) => void;
  updateImage: (id: string, updates: Partial<ImageData>) => void;
  setCurrentImage: (image: ImageData | null) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setLanguage: (language: Language) => void;
}

// Watermark Types
export interface WatermarkConfig {
  text: string;
  opacity: number;
  position: 'center' | 'bottom-right' | 'bottom-left';
  fontSize: number;
}

// Rate Limit Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
}

// Analytics Types
export interface AnalyticsEvent {
  event: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Error Types
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

// Translation Types
export interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

// Component Props Types
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// Replicate API Types
export interface ReplicateInput {
  image: string;
  prompt: string;
  negative_prompt?: string;
  num_outputs?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
}

export interface ReplicateOutput {
  output: string[];
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed';
}
