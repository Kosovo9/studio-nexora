import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, User, ImageData, Language } from '@/types';

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      images: [],
      currentImage: null,
      isProcessing: false,
      language: 'en',

      setUser: (user) => set({ user }),

      addImage: (image) =>
        set((state) => ({
          images: [image, ...state.images],
          currentImage: image,
        })),

      updateImage: (id, updates) =>
        set((state) => ({
          images: state.images.map((img) => (img.id === id ? { ...img, ...updates } : img)),
          currentImage:
            state.currentImage?.id === id
              ? { ...state.currentImage, ...updates }
              : state.currentImage,
        })),

      setCurrentImage: (image) => set({ currentImage: image }),

      setIsProcessing: (isProcessing) => set({ isProcessing }),

      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'studio-nexora-storage',
      partialize: (state) => ({
        language: state.language,
        images: state.images.slice(0, 10), // Keep only last 10 images
      }),
    }
  )
);
