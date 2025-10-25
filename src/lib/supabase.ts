/**
 * Supabase Integration
 * Database, Storage, and Real-time features
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

// Client for browser (only if configured)
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Admin client for server-side operations (only if configured)
export const supabaseAdmin = isSupabaseConfigured && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Upload image to Supabase Storage
 */
export async function uploadImageToSupabase(
  file: File,
  userId: string,
  folder: 'originals' | 'processed' = 'originals'
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.');
  }
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('studio-nexora-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('studio-nexora-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Supabase upload error:', error);
    throw new Error('Failed to upload image to Supabase');
  }
}

/**
 * Upload from URL to Supabase Storage
 */
export async function uploadFromUrlToSupabase(
  url: string,
  userId: string,
  folder: 'originals' | 'processed' = 'processed'
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
  
  try {
    // Fetch the image
    const response = await fetch(url);
    const blob = await response.blob();
    
    const fileName = `${userId}/${Date.now()}.jpg`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('studio-nexora-images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('studio-nexora-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Supabase upload from URL error:', error);
    throw new Error('Failed to upload image from URL');
  }
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteImageFromSupabase(filePath: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
  
  try {
    const { error } = await supabaseAdmin.storage
      .from('studio-nexora-images')
      .remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Supabase delete error:', error);
    throw new Error('Failed to delete image from Supabase');
  }
}

/**
 * Get signed URL for private images
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
  
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('studio-nexora-images')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Get signed URL error:', error);
    throw new Error('Failed to get signed URL');
  }
}

/**
 * List user's images
 */
export async function listUserImages(
  userId: string,
  folder: 'originals' | 'processed' = 'processed'
): Promise<string[]> {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
  
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('studio-nexora-images')
      .list(`${folder}/${userId}`);

    if (error) {
      throw error;
    }

    return data.map((file) => {
      const { data: urlData } = supabaseAdmin.storage
        .from('studio-nexora-images')
        .getPublicUrl(`${folder}/${userId}/${file.name}`);
      return urlData.publicUrl;
    });
  } catch (error) {
    console.error('List images error:', error);
    throw new Error('Failed to list images');
  }
}

/**
 * Real-time subscription for image processing updates
 */
export function subscribeToImageUpdates(
  userId: string,
  callback: (payload: any) => void
) {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  
  return supabase
    .channel('image-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'processed_images',
        filter: `userId=eq.${userId}`,
      },
      callback
    )
    .subscribe();
}

/**
 * Get storage usage for user
 */
export async function getUserStorageUsage(userId: string): Promise<number> {
  if (!supabaseAdmin) {
    return 0;
  }
  
  try {
    const folders = ['originals', 'processed'];
    let totalSize = 0;

    for (const folder of folders) {
      const { data, error } = await supabaseAdmin.storage
        .from('studio-nexora-images')
        .list(`${folder}/${userId}`);

      if (error) {
        throw error;
      }

      totalSize += data.reduce((acc, file) => acc + (file.metadata?.size || 0), 0);
    }

    return totalSize;
  } catch (error) {
    console.error('Get storage usage error:', error);
    return 0;
  }
}

/**
 * Clean up old images (older than 30 days for free users)
 */
export async function cleanupOldImages(userId: string, daysOld: number = 30): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const folders = ['originals', 'processed'];

    for (const folder of folders) {
      const { data, error } = await supabaseAdmin.storage
        .from('studio-nexora-images')
        .list(`${folder}/${userId}`);

      if (error) {
        throw error;
      }

      const oldFiles = data
        .filter((file) => new Date(file.created_at) < cutoffDate)
        .map((file) => `${folder}/${userId}/${file.name}`);

      if (oldFiles.length > 0) {
        await supabaseAdmin.storage
          .from('studio-nexora-images')
          .remove(oldFiles);
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
    throw new Error('Failed to cleanup old images');
  }
}

/**
 * Batch upload multiple images
 */
export async function batchUploadImages(
  files: File[],
  userId: string,
  folder: 'originals' | 'processed' = 'originals'
): Promise<string[]> {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
  
  try {
    const uploadPromises = files.map((file) =>
      uploadImageToSupabase(file, userId, folder)
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Batch upload error:', error);
    throw new Error('Failed to batch upload images');
  }
}

/**
 * Get image metadata
 */
export async function getImageMetadata(filePath: string) {
  if (!supabaseAdmin) {
    return null;
  }
  
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('studio-nexora-images')
      .list(filePath.split('/').slice(0, -1).join('/'));

    if (error) {
      throw error;
    }

    const fileName = filePath.split('/').pop();
    const file = data.find((f) => f.name === fileName);

    return file?.metadata || null;
  } catch (error) {
    console.error('Get metadata error:', error);
    return null;
  }
}
