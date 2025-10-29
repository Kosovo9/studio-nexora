import { create } from 'zustand';
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { AppState, User, ImageData, Language } from '@/types';

// Enhanced interfaces for comprehensive state management
interface EnhancedImageData extends ImageData {
  metadata: {
    size: number;
    dimensions: { width: number; height: number };
    format: string;
    quality: number;
    processingTime?: number;
    aiModel?: string;
    version?: string;
  };
  tags: string[];
  isFavorite: boolean;
  isPublic: boolean;
  downloadCount: number;
  viewCount: number;
  rating: number;
  collection?: string;
  thumbnail?: string;
  shareUrl?: string;
  expiresAt?: Date;
}

interface ProcessingQueue {
  id: string;
  image: string;
  type: string;
  settings: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  estimatedTime: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto' | 'custom';
  autoSave: boolean;
  notifications: boolean;
  quality: 'standard' | 'high' | 'ultra' | 'maximum';
  privacy: {
    analytics: boolean;
    sharing: boolean;
    publicGallery: boolean;
    dataCollection: boolean;
  };
  ui: {
    compactMode: boolean;
    showTutorials: boolean;
    animationsEnabled: boolean;
    soundEnabled: boolean;
    hapticFeedback: boolean;
    gridSize: number;
    sortBy: string;
    filterBy: string[];
  };
  processing: {
    autoEnhance: boolean;
    defaultFormat: string;
    maxFileSize: number;
    parallelProcessing: boolean;
    cloudProcessing: boolean;
    watermark: boolean;
  };
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
    colorBlindMode: string;
    reducedMotion: boolean;
  };
}

interface AnalyticsData {
  totalProcessed: number;
  totalTime: number;
  averageTime: number;
  successRate: number;
  favoriteType: string;
  mostUsedFeatures: string[];
  dailyUsage: { date: string; count: number }[];
  monthlyStats: { month: string; processed: number; time: number }[];
  errorTypes: { [key: string]: number };
  performanceMetrics: {
    averageLoadTime: number;
    averageProcessingTime: number;
    cacheHitRate: number;
    errorRate: number;
    memoryUsage: number[];
    networkLatency: number[];
  };
  userBehavior: {
    mostViewedImages: string[];
    searchQueries: string[];
    featureUsage: { [key: string]: number };
    sessionDuration: number[];
  };
}

interface CacheData {
  images: { [key: string]: { data: string; timestamp: Date; size: number; accessCount: number } };
  thumbnails: { [key: string]: { data: string; timestamp: Date; accessCount: number } };
  metadata: { [key: string]: any };
  maxSize: number;
  currentSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  strategy: 'lru' | 'lfu' | 'fifo';
}

interface Collection {
  id: string;
  name: string;
  description: string;
  items: string[];
  thumbnail?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  collaborators: string[];
  settings: {
    autoSort: boolean;
    sortBy: string;
    layout: string;
    permissions: string[];
  };
}

interface TagData {
  id: string;
  name: string;
  color: string;
  count: number;
  createdAt: Date;
  isSystem: boolean;
  category: string;
  description?: string;
}

interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'update';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actions?: { label: string; action: string; style?: string }[];
  persistent: boolean;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: Date;
}

interface WorkspaceData {
  projects: { [key: string]: { 
    name: string; 
    items: string[]; 
    settings: any;
    description?: string;
    thumbnail?: string;
    collaborators: string[];
    createdAt: Date;
    updatedAt: Date;
  } };
  currentProject?: string;
  recentFiles: { id: string; timestamp: Date }[];
  bookmarks: { id: string; note?: string; timestamp: Date }[];
  customTools: { id: string; name: string; config: any; enabled: boolean }[];
  layouts: { [key: string]: any };
  templates: { id: string; name: string; config: any; preview?: string }[];
}

interface SharingData {
  sharedItems: { [key: string]: { 
    url: string; 
    expiresAt: Date; 
    views: number; 
    maxViews?: number;
    password?: string;
    permissions: string[];
  } };
  publicLinks: string[];
  socialShares: { platform: string; count: number; lastShared: Date }[];
  embedCodes: { [key: string]: string };
  collaborations: { [key: string]: { users: string[]; permissions: string[] } };
}

interface BackupData {
  autoBackup: boolean;
  backupInterval: number;
  lastBackup?: Date;
  backupLocation: 'local' | 'cloud' | 'both';
  backupHistory: { 
    id: string; 
    timestamp: Date; 
    size: number; 
    items: number;
    type: 'manual' | 'auto' | 'scheduled';
    status: 'completed' | 'failed' | 'partial';
  }[];
  restorePoints: { 
    id: string; 
    timestamp: Date; 
    description: string;
    size: number;
    items: string[];
  }[];
  cloudSync: {
    enabled: boolean;
    provider: string;
    lastSync?: Date;
    conflicts: any[];
  };
}

interface ExperimentData {
  activeExperiments: string[];
  completedExperiments: string[];
  experimentResults: { [key: string]: any };
  betaFeatures: string[];
  featureFlags: { [key: string]: boolean };
  abTests: { [key: string]: { variant: string; startDate: Date } };
}

interface EnhancedAppState extends Omit<AppState, 'images'> {
  // Enhanced core state
  images: EnhancedImageData[];
  currentImage: EnhancedImageData | null;
  originalImage: string | null;
  processedImage: string | null;
  progress: number;
  error: string | null;
  selectedType: 'person' | 'person-pet' | 'object' | 'landscape' | 'custom';
  
  // Advanced features
  queue: ProcessingQueue[];
  userPreferences: UserPreferences;
  analytics: AnalyticsData;
  cache: CacheData;
  collections: Collection[];
  tags: TagData[];
  favorites: string[];
  notifications: NotificationItem[];
  workspace: WorkspaceData;
  sharing: SharingData;
  backup: BackupData;
  experiments: ExperimentData;
  
  // Performance tracking
  performance: {
    loadTimes: number[];
    processingTimes: number[];
    errorCounts: { [key: string]: number };
    memoryUsage: number[];
    networkLatency: number[];
    cachePerformance: {
      hits: number;
      misses: number;
      evictions: number;
    };
  };
  
  // Session data
  session: {
    startTime: Date;
    lastActivity: Date;
    actionsCount: number;
    featuresUsed: string[];
    errors: any[];
  };
}

interface EnhancedActions {
  // Basic actions
  setUser: (user: User | null) => void;
  setLanguage: (language: Language) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  setSelectedType: (type: EnhancedAppState['selectedType']) => void;
  setOriginalImage: (image: string | null) => void;
  setProcessedImage: (image: string | null) => void;
  
  // Enhanced image operations
  addImage: (image: Omit<EnhancedImageData, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateImage: (id: string, updates: Partial<EnhancedImageData>) => void;
  deleteImage: (id: string) => void;
  setCurrentImage: (image: EnhancedImageData | null) => void;
  duplicateImage: (id: string) => void;
  bulkUpdateImages: (ids: string[], updates: Partial<EnhancedImageData>) => void;
  
  // Search and filter
  searchImages: (query: string) => EnhancedImageData[];
  filterImages: (filters: { 
    tags?: string[]; 
    collection?: string; 
    dateRange?: [Date, Date];
    rating?: number;
    type?: string;
  }) => EnhancedImageData[];
  sortImages: (sortBy: string, order: 'asc' | 'desc') => void;
  
  // Queue operations
  addToQueue: (item: Omit<ProcessingQueue, 'id' | 'createdAt' | 'status' | 'progress'>) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, updates: Partial<ProcessingQueue>) => void;
  clearQueue: () => void;
  processQueue: () => Promise<void>;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  
  // Preferences
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (data: string) => void;
  
  // Analytics
  updateAnalytics: (data: Partial<AnalyticsData>) => void;
  trackEvent: (event: string, data?: any) => void;
  trackPerformance: (metric: string, value: number) => void;
  getAnalyticsReport: () => AnalyticsData;
  clearAnalytics: () => void;
  
  // Cache operations
  addToCache: (key: string, data: string, type: 'image' | 'thumbnail' | 'metadata') => void;
  getFromCache: (key: string, type: 'image' | 'thumbnail' | 'metadata') => any;
  clearCache: () => void;
  optimizeCache: () => void;
  setCacheStrategy: (strategy: CacheData['strategy']) => void;
  
  // Collections
  createCollection: (collection: Omit<Collection, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  addToCollection: (collectionId: string, itemId: string) => void;
  removeFromCollection: (collectionId: string, itemId: string) => void;
  duplicateCollection: (id: string) => void;
  
  // Tags
  addTag: (tag: Omit<TagData, 'id' | 'createdAt' | 'count'>) => void;
  updateTag: (id: string, updates: Partial<TagData>) => void;
  deleteTag: (id: string) => void;
  getPopularTags: () => TagData[];
  mergeTags: (sourceId: string, targetId: string) => void;
  
  // Favorites
  addToFavorites: (id: string) => void;
  removeFromFavorites: (id: string) => void;
  clearFavorites: () => void;
  getFavorites: () => EnhancedImageData[];
  
  // Notifications
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  clearReadNotifications: () => void;
  
  // Workspace
  createProject: (name: string, settings?: any) => void;
  updateProject: (id: string, updates: any) => void;
  deleteProject: (id: string) => void;
  switchProject: (id: string) => void;
  addToRecent: (itemId: string) => void;
  addBookmark: (itemId: string, note?: string) => void;
  removeBookmark: (itemId: string) => void;
  saveLayout: (name: string, layout: any) => void;
  loadLayout: (name: string) => void;
  
  // Sharing
  createShareLink: (itemId: string, options?: { expiresIn?: number; maxViews?: number; password?: string }) => string;
  revokeShareLink: (itemId: string) => void;
  updateSharePermissions: (itemId: string, permissions: string[]) => void;
  trackShare: (platform: string) => void;
  generateEmbedCode: (itemId: string, options?: any) => string;
  
  // Backup
  createBackup: (type?: 'manual' | 'auto' | 'scheduled') => Promise<string>;
  restoreBackup: (backupId: string) => Promise<void>;
  scheduleBackup: (interval: number) => void;
  enableCloudSync: (provider: string) => void;
  syncToCloud: () => Promise<void>;
  
  // Experiments
  enableExperiment: (experimentId: string) => void;
  disableExperiment: (experimentId: string) => void;
  setFeatureFlag: (flag: string, enabled: boolean) => void;
  joinABTest: (testId: string, variant: string) => void;
  
  // Utility
  reset: () => void;
  exportData: () => string;
  importData: (data: string) => void;
  getStorageSize: () => number;
  optimizeStorage: () => void;
  validateData: () => { isValid: boolean; errors: string[] };
}

const initialState: Omit<EnhancedAppState, keyof EnhancedActions> = {
  user: null,
  images: [],
  currentImage: null,
  originalImage: null,
  processedImage: null,
  isProcessing: false,
  progress: 0,
  error: null,
  language: 'en',
  selectedType: 'person',
  
  queue: [],
  userPreferences: {
    theme: 'auto',
    autoSave: true,
    notifications: true,
    quality: 'high',
    privacy: {
      analytics: true,
      sharing: false,
      publicGallery: false,
      dataCollection: true,
    },
    ui: {
      compactMode: false,
      showTutorials: true,
      animationsEnabled: true,
      soundEnabled: false,
      hapticFeedback: true,
      gridSize: 3,
      sortBy: 'createdAt',
      filterBy: [],
    },
    processing: {
      autoEnhance: true,
      defaultFormat: 'jpg',
      maxFileSize: 10485760, // 10MB
      parallelProcessing: true,
      cloudProcessing: true,
      watermark: false,
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      screenReader: false,
      keyboardNavigation: false,
      colorBlindMode: 'none',
      reducedMotion: false,
    },
  },
  
  analytics: {
    totalProcessed: 0,
    totalTime: 0,
    averageTime: 0,
    successRate: 100,
    favoriteType: 'person',
    mostUsedFeatures: [],
    dailyUsage: [],
    monthlyStats: [],
    errorTypes: {},
    performanceMetrics: {
      averageLoadTime: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      memoryUsage: [],
      networkLatency: [],
    },
    userBehavior: {
      mostViewedImages: [],
      searchQueries: [],
      featureUsage: {},
      sessionDuration: [],
    },
  },
  
  cache: {
    images: {},
    thumbnails: {},
    metadata: {},
    maxSize: 52428800, // 50MB
    currentSize: 0,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    strategy: 'lru',
  },
  
  collections: [],
  tags: [],
  favorites: [],
  notifications: [],
  
  workspace: {
    projects: {},
    recentFiles: [],
    bookmarks: [],
    customTools: [],
    layouts: {},
    templates: [],
  },
  
  sharing: {
    sharedItems: {},
    publicLinks: [],
    socialShares: [],
    embedCodes: {},
    collaborations: {},
  },
  
  backup: {
    autoBackup: true,
    backupInterval: 86400000, // 24 hours
    backupLocation: 'local',
    backupHistory: [],
    restorePoints: [],
    cloudSync: {
      enabled: false,
      provider: '',
      conflicts: [],
    },
  },
  
  experiments: {
    activeExperiments: [],
    completedExperiments: [],
    experimentResults: {},
    betaFeatures: [],
    featureFlags: {},
    abTests: {},
  },
  
  performance: {
    loadTimes: [],
    processingTimes: [],
    errorCounts: {},
    memoryUsage: [],
    networkLatency: [],
    cachePerformance: {
      hits: 0,
      misses: 0,
      evictions: 0,
    },
  },
  
  session: {
    startTime: new Date(),
    lastActivity: new Date(),
    actionsCount: 0,
    featuresUsed: [],
    errors: [],
  },
};

export const useStore = create<EnhancedAppState & EnhancedActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Basic actions
        setUser: (user) => set((state) => {
          state.user = user;
          state.session.lastActivity = new Date();
          state.session.actionsCount++;
        }),
        
        setLanguage: (language) => set((state) => {
          state.language = language;
          state.userPreferences.ui.filterBy = [];
          state.session.lastActivity = new Date();
        }),
        
        setIsProcessing: (isProcessing) => set((state) => {
          state.isProcessing = isProcessing;
          state.session.lastActivity = new Date();
        }),
        
        setProgress: (progress) => set((state) => {
          state.progress = progress;
        }),
        
        setError: (error) => set((state) => {
          state.error = error;
          if (error) {
            state.session.errors.push({
              error,
              timestamp: new Date(),
              context: 'general',
            });
          }
        }),
        
        setSelectedType: (type) => set((state) => {
          state.selectedType = type;
          state.session.lastActivity = new Date();
        }),
        
        setOriginalImage: (image) => set((state) => {
          state.originalImage = image;
        }),
        
        setProcessedImage: (image) => set((state) => {
          state.processedImage = image;
        }),
        
        // Enhanced image operations
        addImage: (imageData) => set((state) => {
          const newImage: EnhancedImageData = {
            ...imageData,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: imageData.tags || [],
            isFavorite: false,
            isPublic: false,
            downloadCount: 0,
            viewCount: 0,
            rating: 0,
          };
          
          state.images.unshift(newImage);
          state.currentImage = newImage;
          
          // Limit stored images
          if (state.images.length > 1000) {
            state.images = state.images.slice(0, 1000);
          }
          
          // Update analytics
          state.analytics.totalProcessed++;
          state.session.lastActivity = new Date();
          state.session.actionsCount++;
        }),
        
        updateImage: (id, updates) => set((state) => {
          const index = state.images.findIndex(img => img.id === id);
          if (index !== -1) {
            state.images[index] = { 
              ...state.images[index], 
              ...updates, 
              updatedAt: new Date() 
            };
            
            if (state.currentImage?.id === id) {
              state.currentImage = state.images[index];
            }
          }
          state.session.lastActivity = new Date();
        }),
        
        deleteImage: (id) => set((state) => {
          state.images = state.images.filter(img => img.id !== id);
          if (state.currentImage?.id === id) {
            state.currentImage = null;
          }
          state.favorites = state.favorites.filter(fav => fav !== id);
          state.session.lastActivity = new Date();
        }),
        
        setCurrentImage: (image) => set((state) => {
          state.currentImage = image;
          if (image) {
            // Track view
            const index = state.images.findIndex(img => img.id === image.id);
            if (index !== -1) {
              state.images[index].viewCount++;
            }
          }
          state.session.lastActivity = new Date();
        }),
        
        duplicateImage: (id) => set((state) => {
          const original = state.images.find(img => img.id === id);
          if (original) {
            const duplicate: EnhancedImageData = {
              ...original,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              createdAt: new Date(),
              updatedAt: new Date(),
              downloadCount: 0,
              viewCount: 0,
            };
            state.images.unshift(duplicate);
          }
        }),
        
        bulkUpdateImages: (ids, updates) => set((state) => {
          ids.forEach(id => {
            const index = state.images.findIndex(img => img.id === id);
            if (index !== -1) {
              state.images[index] = { 
                ...state.images[index], 
                ...updates, 
                updatedAt: new Date() 
              };
            }
          });
          state.session.lastActivity = new Date();
        }),
        
        // Search and filter
        searchImages: (query) => {
          const state = get();
          return state.images.filter(img => 
            img.title?.toLowerCase().includes(query.toLowerCase()) ||
            img.description?.toLowerCase().includes(query.toLowerCase()) ||
            img.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
          );
        },
        
        filterImages: (filters) => {
          const state = get();
          return state.images.filter(img => {
            if (filters.tags && !filters.tags.some(tag => img.tags.includes(tag))) {
              return false;
            }
            if (filters.collection && img.collection !== filters.collection) {
              return false;
            }
            if (filters.dateRange) {
              const [start, end] = filters.dateRange;
              if (img.createdAt < start || img.createdAt > end) {
                return false;
              }
            }
            if (filters.rating && img.rating < filters.rating) {
              return false;
            }
            return true;
          });
        },
        
        sortImages: (sortBy, order) => set((state) => {
          state.images.sort((a, b) => {
            let aVal = a[sortBy as keyof EnhancedImageData];
            let bVal = b[sortBy as keyof EnhancedImageData];
            
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            
            if (order === 'asc') {
              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
              return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
          });
          
          state.userPreferences.ui.sortBy = sortBy;
        }),
        
        // Queue operations
        addToQueue: (item) => set((state) => {
          const newItem: ProcessingQueue = {
            ...item,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
            status: 'pending',
            progress: 0,
            retryCount: 0,
            maxRetries: 3,
          };
          state.queue.push(newItem);
        }),
        
        removeFromQueue: (id) => set((state) => {
          state.queue = state.queue.filter(item => item.id !== id);
        }),
        
        updateQueueItem: (id, updates) => set((state) => {
          const index = state.queue.findIndex(item => item.id === id);
          if (index !== -1) {
            state.queue[index] = { ...state.queue[index], ...updates };
          }
        }),
        
        clearQueue: () => set((state) => {
          state.queue = [];
        }),
        
        processQueue: async () => {
          // Queue processing logic would be implemented here
          console.log('Processing queue...');
        },
        
        reorderQueue: (fromIndex, toIndex) => set((state) => {
          const [removed] = state.queue.splice(fromIndex, 1);
          state.queue.splice(toIndex, 0, removed);
        }),
        
        // Preferences
        updateUserPreferences: (preferences) => set((state) => {
          state.userPreferences = { ...state.userPreferences, ...preferences };
          state.session.lastActivity = new Date();
        }),
        
        resetPreferences: () => set((state) => {
          state.userPreferences = initialState.userPreferences;
        }),
        
        exportPreferences: () => {
          const state = get();
          return JSON.stringify(state.userPreferences, null, 2);
        },
        
        importPreferences: (data) => set((state) => {
          try {
            const preferences = JSON.parse(data);
            state.userPreferences = { ...state.userPreferences, ...preferences };
          } catch (error) {
            console.error('Failed to import preferences:', error);
          }
        }),
        
        // Analytics
        updateAnalytics: (data) => set((state) => {
          state.analytics = { ...state.analytics, ...data };
        }),
        
        trackEvent: (event, data) => {
          set((state) => {
            state.analytics.userBehavior.featureUsage[event] = 
              (state.analytics.userBehavior.featureUsage[event] || 0) + 1;
            state.session.featuresUsed.push(event);
          });
        },
        
        trackPerformance: (metric, value) => set((state) => {
          switch (metric) {
            case 'loadTime':
              state.performance.loadTimes.push(value);
              break;
            case 'processingTime':
              state.performance.processingTimes.push(value);
              break;
            case 'memoryUsage':
              state.performance.memoryUsage.push(value);
              break;
            case 'networkLatency':
              state.performance.networkLatency.push(value);
              break;
          }
        }),
        
        getAnalyticsReport: () => {
          return get().analytics;
        },
        
        clearAnalytics: () => set((state) => {
          state.analytics = initialState.analytics;
        }),
        
        // Cache operations
        addToCache: (key, data, type) => set((state) => {
          const size = new Blob([data]).size;
          
          // Check if we need to evict items
          if (state.cache.currentSize + size > state.cache.maxSize) {
            // Implement cache eviction based on strategy
            const items = Object.entries(
              type === 'image' ? state.cache.images : 
              type === 'thumbnail' ? state.cache.thumbnails : 
              state.cache.metadata
            );
            
            if (state.cache.strategy === 'lru') {
              items.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
            } else if (state.cache.strategy === 'lfu') {
              items.sort((a, b) => (a[1].accessCount || 0) - (b[1].accessCount || 0));
            }
            
            // Remove oldest/least used items
            for (const [oldKey] of items) {
              if (type === 'image') {
                delete state.cache.images[oldKey];
              } else if (type === 'thumbnail') {
                delete state.cache.thumbnails[oldKey];
              } else {
                delete state.cache.metadata[oldKey];
              }
              state.cache.evictionCount++;
              if (state.cache.currentSize + size <= state.cache.maxSize) break;
            }
          }
          
          const cacheItem = { 
            data, 
            timestamp: new Date(), 
            size, 
            accessCount: 1 
          };
          
          if (type === 'image') {
            state.cache.images[key] = cacheItem;
          } else if (type === 'thumbnail') {
            state.cache.thumbnails[key] = cacheItem;
          } else {
            state.cache.metadata[key] = data;
          }
          
          state.cache.currentSize += size;
        }),
        
        getFromCache: (key, type) => {
          const state = get();
          const cache = type === 'image' ? state.cache.images : 
                      type === 'thumbnail' ? state.cache.thumbnails : 
                      state.cache.metadata;
          
          if (cache[key]) {
            set((state) => {
              state.cache.hitCount++;
              state.performance.cachePerformance.hits++;
              if (type !== 'metadata' && cache[key].accessCount !== undefined) {
                cache[key].accessCount++;
              }
            });
            return cache[key];
          } else {
            set((state) => {
              state.cache.missCount++;
              state.performance.cachePerformance.misses++;
            });
            return null;
          }
        },
        
        clearCache: () => set((state) => {
          state.cache = { ...initialState.cache };
        }),
        
        optimizeCache: () => set((state) => {
          // Remove expired and optimize cache
          const now = new Date();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          Object.keys(state.cache.images).forEach(key => {
            if (now.getTime() - state.cache.images[key].timestamp.getTime() > maxAge) {
              delete state.cache.images[key];
            }
          });
          
          Object.keys(state.cache.thumbnails).forEach(key => {
            if (now.getTime() - state.cache.thumbnails[key].timestamp.getTime() > maxAge) {
              delete state.cache.thumbnails[key];
            }
          });
          
          // Recalculate current size
          state.cache.currentSize = Object.values(state.cache.images)
            .reduce((sum, item) => sum + item.size, 0);
        }),
        
        setCacheStrategy: (strategy) => set((state) => {
          state.cache.strategy = strategy;
        }),
        
        // Collections
        createCollection: (collection) => set((state) => {
          const newCollection: Collection = {
            ...collection,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
            updatedAt: new Date(),
            settings: {
              autoSort: false,
              sortBy: 'createdAt',
              layout: 'grid',
              permissions: ['read'],
              ...collection.settings,
            },
          };
          state.collections.push(newCollection);
        }),
        
        updateCollection: (id, updates) => set((state) => {
          const index = state.collections.findIndex(collection => collection.id === id);
          if (index !== -1) {
            state.collections[index] = { 
              ...state.collections[index], 
              ...updates, 
              updatedAt: new Date() 
            };
          }
        }),
        
        deleteCollection: (id) => set((state) => {
          state.collections = state.collections.filter(collection => collection.id !== id);
          // Remove collection reference from images
          state.images.forEach(img => {
            if (img.collection === id) {
              img.collection = undefined;
            }
          });
        }),
        
        addToCollection: (collectionId, itemId) => set((state) => {
          const collection = state.collections.find(c => c.id === collectionId);
          if (collection && !collection.items.includes(itemId)) {
            collection.items.push(itemId);
            collection.updatedAt = new Date();
            
            // Update image collection reference
            const image = state.images.find(img => img.id === itemId);
            if (image) {
              image.collection = collectionId;
            }
          }
        }),
        
        removeFromCollection: (collectionId, itemId) => set((state) => {
          const collection = state.collections.find(c => c.id === collectionId);
          if (collection) {
            collection.items = collection.items.filter(id => id !== itemId);
            collection.updatedAt = new Date();
            
            // Remove collection reference from image
            const image = state.images.find(img => img.id === itemId);
            if (image && image.collection === collectionId) {
              image.collection = undefined;
            }
          }
        }),
        
        duplicateCollection: (id) => set((state) => {
          const original = state.collections.find(c => c.id === id);
          if (original) {
            const duplicate: Collection = {
              ...original,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: `${original.name} (Copy)`,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            state.collections.push(duplicate);
          }
        }),
        
        // Tags
        addTag: (tag) => set((state) => {
          const newTag: TagData = {
            ...tag,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
            count: 0,
            category: tag.category || 'general',
          };
          state.tags.push(newTag);
        }),
        
        updateTag: (id, updates) => set((state) => {
          const index = state.tags.findIndex(tag => tag.id === id);
          if (index !== -1) {
            state.tags[index] = { ...state.tags[index], ...updates };
          }
        }),
        
        deleteTag: (id) => set((state) => {
          const tag = state.tags.find(t => t.id === id);
          if (tag) {
            // Remove tag from all images
            state.images.forEach(img => {
              img.tags = img.tags.filter(t => t !== tag.name);
            });
            state.tags = state.tags.filter(t => t.id !== id);
          }
        }),
        
        getPopularTags: () => {
          const state = get();
          return state.tags
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
        },
        
        mergeTags: (sourceId, targetId) => set((state) => {
          const sourceTag = state.tags.find(t => t.id === sourceId);
          const targetTag = state.tags.find(t => t.id === targetId);
          
          if (sourceTag && targetTag) {
            // Update all images using source tag
            state.images.forEach(img => {
              const sourceIndex = img.tags.indexOf(sourceTag.name);
              if (sourceIndex !== -1) {
                img.tags[sourceIndex] = targetTag.name;
              }
            });
            
            // Update target tag count
            targetTag.count += sourceTag.count;
            
            // Remove source tag
            state.tags = state.tags.filter(t => t.id !== sourceId);
          }
        }),
        
        // Favorites
        addToFavorites: (id) => set((state) => {
          if (!state.favorites.includes(id)) {
            state.favorites.push(id);
            const image = state.images.find(img => img.id === id);
            if (image) {
              image.isFavorite = true;
            }
          }
        }),
        
        removeFromFavorites: (id) => set((state) => {
          state.favorites = state.favorites.filter(fav => fav !== id);
          const image = state.images.find(img => img.id === id);
          if (image) {
            image.isFavorite = false;
          }
        }),
        
        clearFavorites: () => set((state) => {
          state.favorites.forEach(id => {
            const image = state.images.find(img => img.id === id);
            if (image) {
              image.isFavorite = false;
            }
          });
          state.favorites = [];
        }),
        
        getFavorites: () => {
          const state = get();
          return state.images.filter(img => state.favorites.includes(img.id));
        },
        
        // Notifications
        addNotification: (notification) => set((state) => {
          const newNotification: NotificationItem = {
            ...notification,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            read: false,
            category: notification.category || 'general',
            priority: notification.priority || 'normal',
          };
          state.notifications.unshift(newNotification);
          
          // Limit notifications
          if (state.notifications.length > 100) {
            state.notifications = state.notifications.slice(0, 100);
          }
        }),
        
        markNotificationRead: (id) => set((state) => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification) {
            notification.read = true;
          }
        }),
        
        markAllNotificationsRead: () => set((state) => {
          state.notifications.forEach(n => n.read = true);
        }),
        
        deleteNotification: (id) => set((state) => {
          state.notifications = state.notifications.filter(n => n.id !== id);
        }),
        
        clearNotifications: () => set((state) => {
          state.notifications = [];
        }),
        
        clearReadNotifications: () => set((state) => {
          state.notifications = state.notifications.filter(n => !n.read);
        }),
        
        // Workspace
        createProject: (name, settings = {}) => set((state) => {
          const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          state.workspace.projects[id] = { 
            name, 
            items: [], 
            settings,
            collaborators: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          state.workspace.currentProject = id;
        }),
        
        updateProject: (id, updates) => set((state) => {
          if (state.workspace.projects[id]) {
            state.workspace.projects[id] = {
              ...state.workspace.projects[id],
              ...updates,
              updatedAt: new Date(),
            };
          }
        }),
        
        deleteProject: (id) => set((state) => {
          delete state.workspace.projects[id];
          if (state.workspace.currentProject === id) {
            const projectIds = Object.keys(state.workspace.projects);
            state.workspace.currentProject = projectIds.length > 0 ? projectIds[0] : undefined;
          }
        }),
        
        switchProject: (id) => set((state) => {
          if (state.workspace.projects[id]) {
            state.workspace.currentProject = id;
          }
        }),
        
        addToRecent: (itemId) => set((state) => {
          const existing = state.workspace.recentFiles.find(f => f.id === itemId);
          if (existing) {
            existing.timestamp = new Date();
          } else {
            state.workspace.recentFiles.unshift({ id: itemId, timestamp: new Date() });
          }
          
          // Keep only 50 recent files
          if (state.workspace.recentFiles.length > 50) {
            state.workspace.recentFiles = state.workspace.recentFiles.slice(0, 50);
          }
        }),
        
        addBookmark: (itemId, note) => set((state) => {
          if (!state.workspace.bookmarks.find(b => b.id === itemId)) {
            state.workspace.bookmarks.push({ 
              id: itemId, 
              note, 
              timestamp: new Date() 
            });
          }
        }),
        
        removeBookmark: (itemId) => set((state) => {
          state.workspace.bookmarks = state.workspace.bookmarks.filter(b => b.id !== itemId);
        }),
        
        saveLayout: (name, layout) => set((state) => {
          state.workspace.layouts[name] = layout;
        }),
        
        loadLayout: (name) => {
          const state = get();
          return state.workspace.layouts[name];
        },
        
        // Sharing
        createShareLink: (itemId, options = {}) => {
          const shareId = Math.random().toString(36).substr(2, 9);
          const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareId}`;
          const expiresAt = new Date(Date.now() + (options.expiresIn || 7 * 24 * 60 * 60 * 1000));
          
          set((state) => {
            state.sharing.sharedItems[itemId] = { 
              url, 
              expiresAt, 
              views: 0,
              maxViews: options.maxViews,
              password: options.password,
              permissions: ['read'],
            };
          });
          
          return url;
        },
        
        revokeShareLink: (itemId) => set((state) => {
          delete state.sharing.sharedItems[itemId];
        }),
        
        updateSharePermissions: (itemId, permissions) => set((state) => {
          if (state.sharing.sharedItems[itemId]) {
            state.sharing.sharedItems[itemId].permissions = permissions;
          }
        }),
        
        trackShare: (platform) => set((state) => {
          const existing = state.sharing.socialShares.find(s => s.platform === platform);
          if (existing) {
            existing.count++;
            existing.lastShared = new Date();
          } else {
            state.sharing.socialShares.push({ 
              platform, 
              count: 1, 
              lastShared: new Date() 
            });
          }
        }),
        
        generateEmbedCode: (itemId, options = {}) => {
          const embedId = Math.random().toString(36).substr(2, 9);
          const code = `<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/${embedId}" width="${options.width || 800}" height="${options.height || 600}"></iframe>`;
          
          set((state) => {
            state.sharing.embedCodes[itemId] = code;
          });
          
          return code;
        },
        
        // Backup
        createBackup: async (type = 'manual') => {
          const state = get();
          const backup = {
            timestamp: new Date(),
            type,
            data: {
              images: state.images,
              collections: state.collections,
              tags: state.tags,
              userPreferences: state.userPreferences,
              workspace: state.workspace,
              favorites: state.favorites,
            },
          };
          
          const backupString = JSON.stringify(backup);
          const backupId = Date.now().toString();
          
          set((state) => {
            state.backup.backupHistory.push({
              id: backupId,
              timestamp: new Date(),
              size: new Blob([backupString]).size,
              items: state.images.length,
              type,
              status: 'completed',
            });
            state.backup.lastBackup = new Date();
          });
          
          return backupString;
        },
        
        restoreBackup: async (backupData) => {
          try {
            const backup = JSON.parse(backupData);
            set((state) => {
              Object.assign(state, backup.data);
            });
          } catch (error) {
            console.error('Failed to restore backup:', error);
            throw error;
          }
        },
        
        scheduleBackup: (interval) => set((state) => {
          state.backup.backupInterval = interval;
        }),
        
        enableCloudSync: (provider) => set((state) => {
          state.backup.cloudSync.enabled = true;
          state.backup.cloudSync.provider = provider;
        }),
        
        syncToCloud: async () => {
          // Cloud sync implementation would go here
          set((state) => {
            state.backup.cloudSync.lastSync = new Date();
          });
        },
        
        // Experiments
        enableExperiment: (experimentId) => set((state) => {
          if (!state.experiments.activeExperiments.includes(experimentId)) {
            state.experiments.activeExperiments.push(experimentId);
          }
        }),
        
        disableExperiment: (experimentId) => set((state) => {
          state.experiments.activeExperiments = state.experiments.activeExperiments.filter(id => id !== experimentId);
          if (!state.experiments.completedExperiments.includes(experimentId)) {
            state.experiments.completedExperiments.push(experimentId);
          }
        }),
        
        setFeatureFlag: (flag, enabled) => set((state) => {
          state.experiments.featureFlags[flag] = enabled;
        }),
        
        joinABTest: (testId, variant) => set((state) => {
          state.experiments.abTests[testId] = { variant, startDate: new Date() };
        }),
        
        // Utility
        reset: () => set((state) => {
          Object.assign(state, initialState);
          state.session.startTime = new Date();
          state.session.lastActivity = new Date();
        }),
        
        exportData: () => {
          const state = get();
          return JSON.stringify({
            images: state.images,
            collections: state.collections,
            tags: state.tags,
            userPreferences: state.userPreferences,
            workspace: state.workspace,
            favorites: state.favorites,
            analytics: state.analytics,
          }, null, 2);
        },
        
        importData: (data) => set((state) => {
          try {
            const imported = JSON.parse(data);
            Object.assign(state, imported);
          } catch (error) {
            console.error('Failed to import data:', error);
          }
        }),
        
        getStorageSize: () => {
          const state = get();
          return JSON.stringify(state).length;
        },
        
        optimizeStorage: () => set((state) => {
          // Remove old items to optimize storage
          if (state.images.length > 1000) {
            state.images = state.images.slice(0, 1000);
          }
          if (state.notifications.length > 100) {
            state.notifications = state.notifications.slice(0, 100);
          }
          if (state.workspace.recentFiles.length > 50) {
            state.workspace.recentFiles = state.workspace.recentFiles.slice(0, 50);
          }
        }),
        
        validateData: () => {
          const state = get();
          const errors: string[] = [];
          
          // Validate images
          state.images.forEach((img, index) => {
            if (!img.id) errors.push(`Image at index ${index} missing ID`);
            if (!img.url) errors.push(`Image at index ${index} missing URL`);
          });
          
          // Validate collections
          state.collections.forEach((collection, index) => {
            if (!collection.id) errors.push(`Collection at index ${index} missing ID`);
            if (!collection.name) errors.push(`Collection at index ${index} missing name`);
          });
          
          return { isValid: errors.length === 0, errors };
        },
      })),
      {
        name: 'studio-nexora-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          language: state.language,
          images: state.images.slice(0, 100), // Limit persisted images
          collections: state.collections,
          tags: state.tags,
          userPreferences: state.userPreferences,
          favorites: state.favorites,
          workspace: state.workspace,
          analytics: state.analytics,
          backup: state.backup,
          experiments: state.experiments,
        }),
        version: 3,
        migrate: (persistedState: any, version: number) => {
          if (version < 3) {
            // Migration logic for version 3
            return {
              ...persistedState,
              cache: initialState.cache,
              queue: initialState.queue,
              notifications: initialState.notifications,
              sharing: initialState.sharing,
              performance: initialState.performance,
              session: initialState.session,
            };
          }
          return persistedState;
        },
      }
    )
  )
);

// Optimized selectors for performance
export const useImages = () => useStore((state) => state.images);
export const useCurrentImage = () => useStore((state) => state.currentImage);
export const useUserPreferences = () => useStore((state) => state.userPreferences);
export const useAnalytics = () => useStore((state) => state.analytics);
export const useFavorites = () => useStore((state) => state.favorites);
export const useCollections = () => useStore((state) => state.collections);
export const useTags = () => useStore((state) => state.tags);
export const useNotifications = () => useStore((state) => state.notifications.filter(n => !n.read));
export const useQueue = () => useStore((state) => state.queue);
export const useCurrentProject = () => useStore((state) => {
  const currentId = state.workspace.currentProject;
  return currentId ? state.workspace.projects[currentId] : null;
});

// Subscribe to changes for side effects
useStore.subscribe(
  (state) => state.userPreferences.theme,
  (theme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }
);

useStore.subscribe(
  (state) => state.language,
  (language) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', language);
    }
  }
);

// Performance monitoring
useStore.subscribe(
  (state) => state.session.actionsCount,
  (count) => {
    if (count > 0 && count % 100 === 0) {
      // Trigger storage optimization every 100 actions
      useStore.getState().optimizeStorage();
    }
  }
);
