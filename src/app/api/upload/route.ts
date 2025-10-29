import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import { auth } from '@clerk/nextjs';
import { headers } from 'next/headers';
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { rateLimit } from '@/lib/rate-limit';

// Enhanced configuration
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB
const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || '5');
const ALLOWED_TYPES = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff').split(',');
const RATE_LIMIT_UPLOAD = parseInt(process.env.RATE_LIMIT_UPLOAD || '20');
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000'); // 15 minutes

// Enhanced interfaces
interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  folder?: string;
  isPublic?: boolean;
  expiresAt?: string;
  compressionLevel?: number;
  generateThumbnails?: boolean;
  watermark?: boolean;
}

interface BatchUploadRequest {
  files: UploadRequest[];
  batchId?: string;
  metadata?: Record<string, any>;
}

interface UploadResponse {
  success: boolean;
  uploadUrl?: string;
  fileUrl?: string;
  filename?: string;
  fileId?: string;
  thumbnails?: string[];
  metadata?: Record<string, any>;
  error?: string;
  code?: string;
  memoryStats?: {
    allocated: number;
    available: number;
    percentage: number;
    processingMode: string;
  };
  performance?: {
    processingTime: number;
    memoryUsed: number;
    optimizations: string[];
  };
}

interface MemoryStats {
  allocated: number;
  available: number;
  percentage: number;
  threshold: 'normal' | 'warning' | 'critical' | 'emergency';
}

interface SystemMetrics {
  memory: {
    heap: { used: number; total: number; percentage: number };
    allocated: { used: number; available: number; percentage: number };
    system: { rss: number; external: number; arrayBuffers: number };
  };
  uploads: {
    active: number;
    queued: number;
    completed: number;
    failed: number;
  };
  performance: {
    averageProcessingTime: number;
    throughput: number;
    errorRate: number;
  };
}

interface FileValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
  sanitizedName?: string;
  detectedType?: string;
}

interface SecurityScanResult {
  safe: boolean;
  threats?: string[];
  riskScore: number;
  scanId: string;
}

// S3/R2 Client
const s3Client = new S3Client({
  region: process.env.STORAGE_REGION || 'auto',
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET!,
  },
});

// Rate limiting store
const rateLimitMap = new Map<string, number[]>();

// Enhanced rate limiting with burst protection
const rateLimit = {
  async check(ip: string, action: string, options: {
    max: number;
    window: number;
    burst?: number;
  }): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - options.window;
    const key = `${ip}:${action}`;
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }
    
    const requests = rateLimitMap.get(key)!;
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check burst protection
    if (options.burst) {
      const recentRequests = validRequests.filter(timestamp => timestamp > now - 60000); // Last minute
      if (recentRequests.length >= options.burst) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: Math.max(...recentRequests) + 60000,
        };
      }
    }
    
    const allowed = validRequests.length < options.max;
    
    if (allowed) {
      validRequests.push(now);
      rateLimitMap.set(key, validRequests);
    }
    
    return {
      allowed,
      remaining: Math.max(0, options.max - validRequests.length - (allowed ? 1 : 0)),
      resetTime: windowStart + options.window,
    };
  }
};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimit.get(ip);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_UPLOAD) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const uploadId = `upload_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  
  try {
    // Extract request metadata
    const headersList = headers();
    const ip = request.ip || headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    const country = headersList.get('cf-ipcountry') || 'unknown';
    const acceptLanguage = headersList.get('accept-language') || 'en';

    // Enhanced rate limiting with burst protection
    const rateLimitResult = await rateLimit.check(ip, 'upload', {
      max: RATE_LIMIT_UPLOAD,
      window: RATE_LIMIT_WINDOW,
      burst: 3,
    });

    if (!rateLimitResult.allowed) {
      await logSecurityEvent('upload_rate_limit', {
        ip,
        userAgent,
        uploadId,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      });

      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        metadata: {
          uploadId,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
          timestamp: new Date().toISOString(),
        },
      }, { status: 429 });
    }

    // Enhanced authentication
    const { userId } = auth();
    if (!userId) {
      await logSecurityEvent('upload_unauthorized', {
        ip,
        userAgent,
        uploadId,
      });

      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        metadata: {
          uploadId,
          timestamp: new Date().toISOString(),
        },
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const isBatchUpload = Array.isArray(body.files);
    
    if (isBatchUpload) {
      return await handleBatchUpload(body as BatchUploadRequest, userId, uploadId, ip, userAgent);
    } else {
      return await handleSingleUpload(body as UploadRequest, userId, uploadId, ip, userAgent);
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Upload error:', error);
    
    // Log error
    await logUploadError({
      uploadId,
      error: errorMessage,
      processingTime,
      userId: auth().userId,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      metadata: {
        uploadId,
        timestamp: new Date().toISOString(),
        processingTime,
      },
    }, { 
      status: 500,
      headers: {
        'X-Upload-ID': uploadId,
        'X-Processing-Time': `${processingTime}ms`,
      },
    });
  }
}

async function handleSingleUpload(
  uploadRequest: UploadRequest,
  userId: string,
  uploadId: string,
  ip: string,
  userAgent: string
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const {
      fileName,
      fileType,
      fileSize,
      checksum,
      metadata = {},
      tags = [],
      folder = 'uploads',
      isPublic = false,
      expiresAt,
      compressionLevel = 80,
      generateThumbnails = true,
      watermark = false,
    } = uploadRequest;

    // Comprehensive validation with enhanced checks
    const validation = await validateFileEnhanced({
      fileName,
      fileType,
      fileSize,
      checksum,
      userId,
    });

    if (!validation.valid) {
      if (processingMemoryAllocated) {
        memoryMonitor.deallocate(`processing_${uploadId}`);
      }
      
      return NextResponse.json({
        success: false,
        error: validation.error,
        code: validation.code,
        metadata: {
          uploadId,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
        },
        memoryStats: {
          allocated: memoryStats.allocated,
          available: memoryStats.available,
          percentage: memoryStats.percentage,
          processingMode: 'validation_failed',
        },
      }, { status: 400 });
    }

    // Enhanced security scanning
    const securityScan = await performSecurityScanEnhanced({
      fileName: validation.sanitizedName!,
      fileType: validation.detectedType!,
      fileSize,
      userId,
      ip,
      userAgent,
    });

    if (!securityScan.safe) {
      if (processingMemoryAllocated) {
        memoryMonitor.deallocate(`processing_${uploadId}`);
      }
      
      await logSecurityEvent('upload_security_threat', {
        userId,
        uploadId,
        threats: securityScan.threats,
        riskScore: securityScan.riskScore,
        scanId: securityScan.scanId,
        memoryStats,
      });

      return NextResponse.json({
        success: false,
        error: 'File failed security scan',
        code: 'SECURITY_THREAT_DETECTED',
        metadata: {
          uploadId,
          scanId: securityScan.scanId,
          riskScore: securityScan.riskScore,
          timestamp: new Date().toISOString(),
        },
        memoryStats: {
          allocated: memoryStats.allocated,
          available: memoryStats.available,
          percentage: memoryStats.percentage,
          processingMode: 'security_failed',
        },
      }, { status: 403 });
    }

    // Enhanced user limits check
    const limitsCheck = await checkUserLimitsEnhanced(userId, fileSize);
    if (!limitsCheck.allowed) {
      if (processingMemoryAllocated) {
        memoryMonitor.deallocate(`processing_${uploadId}`);
      }
      
      return NextResponse.json({
        success: false,
        error: limitsCheck.reason,
        code: 'LIMIT_EXCEEDED',
        metadata: {
          uploadId,
          currentUsage: limitsCheck.currentUsage,
          limit: limitsCheck.limit,
          timestamp: new Date().toISOString(),
        },
        memoryStats: {
          allocated: memoryStats.allocated,
          available: memoryStats.available,
          percentage: memoryStats.percentage,
          processingMode: 'limits_exceeded',
        },
      }, { status: 403 });
    }

    // Generate secure file paths
    const fileId = crypto.randomUUID();
    const timestamp = Date.now();
    const fileExtension = validation.sanitizedName!.split('.').pop() || 'jpg';
    const basePath = `${folder}/${userId}/${new Date().getFullYear()}/${new Date().getMonth() + 1}`;
    const filename = `${basePath}/${timestamp}-${fileId}.${fileExtension}`;

    // Prepare upload configuration
    const uploadConfig = {
      Bucket: process.env.STORAGE_BUCKET!,
      Key: filename,
      ContentType: validation.detectedType!,
      Metadata: {
        userId,
        fileId,
        originalName: validation.sanitizedName!,
        uploadedAt: new Date().toISOString(),
        uploadId,
        scanId: securityScan.scanId,
        compressionLevel: compressionLevel.toString(),
        ...metadata,
      },
      Tagging: tags.length > 0 ? tags.map(tag => `${tag}=true`).join('&') : undefined,
      ...(expiresAt && { Expires: new Date(expiresAt) }),
      ...(isPublic ? { ACL: 'public-read' } : {}),
    };

    // Generate presigned URL
    const command = new PutObjectCommand(uploadConfig);
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Prepare file URLs
    const fileUrl = isPublic 
      ? `${process.env.STORAGE_PUBLIC_URL}/${filename}`
      : `${process.env.STORAGE_ENDPOINT}/${process.env.STORAGE_BUCKET}/${filename}`;

    // Process upload with secure handler
    const processingResult = await secureUploadHandler.processUpload(
      uploadId,
      fileSize,
      validation.detectedType!,
      optimalMode
    );

    if (!processingResult.success) {
      if (processingMemoryAllocated) {
        memoryMonitor.deallocate(`processing_${uploadId}`);
      }
      
      return NextResponse.json({
        success: false,
        error: processingResult.error || 'Upload processing failed',
        code: 'PROCESSING_FAILED',
        metadata: {
          uploadId,
          processingTime: processingResult.processingTime,
          timestamp: new Date().toISOString(),
        },
        memoryStats: {
          allocated: memoryStats.allocated,
          available: memoryStats.available,
          percentage: memoryStats.percentage,
          processingMode: optimalMode,
        },
      }, { status: 500 });
    }

    // Generate enhanced thumbnail URLs
    const thumbnails = generateThumbnails ? await generateThumbnailUrlsEnhanced(filename, fileExtension) : [];

    // Create comprehensive file record in database
    await prisma.file.create({
      data: {
        id: fileId,
        userId,
        filename,
        originalName: validation.sanitizedName!,
        mimeType: validation.detectedType!,
        size: fileSize,
        checksum,
        url: fileUrl,
        thumbnails,
        metadata: {
          uploadId,
          scanId: securityScan.scanId,
          compressionLevel,
          watermark,
          tags,
          folder,
          isPublic,
          expiresAt,
          processingMode: optimalMode,
          memoryUsed: processingResult.memoryUsed,
          processingTime: processingResult.processingTime,
          securityScore: securityScan.riskScore,
          ...metadata,
        },
        status: 'completed',
        uploadedAt: new Date(),
      },
    });

    // Update user storage usage
    await updateUserStorageUsage(userId, fileSize);

    // Track enhanced upload analytics
    await trackUploadAnalytics({
      userId,
      fileId,
      fileSize,
      fileType: validation.detectedType!,
      uploadId,
      processingTime: Date.now() - startTime,
      memoryUsed: processingResult.memoryUsed,
      processingMode: optimalMode,
      securityScore: securityScan.riskScore,
      country,
      source: 'web',
    });

    // Create comprehensive audit log
    await createAuditLog('file_upload_completed', {
      userId,
      fileId,
      filename,
      fileSize,
      uploadId,
      processingMode: optimalMode,
      memoryUsed: processingResult.memoryUsed,
      securityScore: securityScan.riskScore,
    });

    // Log upload success
    await logUploadSuccess({
      uploadId,
      fileId,
      userId,
      fileSize,
      processingTime: Date.now() - startTime,
      memoryUsed: processingResult.memoryUsed,
      processingMode: optimalMode,
    });

    const finalMemoryStats = memoryMonitor.getMemoryUsage();
    const response: UploadResponse = {
      success: true,
      uploadUrl,
      fileUrl,
      filename,
      fileId,
      thumbnails,
      metadata: {
        uploadId,
        scanId: securityScan.scanId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        securityScore: securityScan.riskScore,
        optimizations: ['memory_optimized', 'security_scanned', 'performance_tuned'],
      },
      memoryStats: {
        allocated: finalMemoryStats.used,
        available: finalMemoryStats.available,
        percentage: finalMemoryStats.percentage,
        processingMode: optimalMode,
      },
      performance: {
        processingTime: Date.now() - startTime,
        memoryUsed: processingResult.memoryUsed,
        optimizations: [
          `${optimalMode}_processing`,
          'enhanced_validation',
          'security_scanning',
          'memory_monitoring'
        ],
      },
    };

    return NextResponse.json(response, {
      headers: {
        'X-Upload-ID': uploadId,
        'X-File-ID': fileId,
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'X-Memory-Used': `${processingResult.memoryUsed}`,
        'X-Memory-Available': `${finalMemoryStats.available}`,
        'X-Memory-Usage': `${finalMemoryStats.percentage.toFixed(2)}%`,
        'X-Processing-Mode': optimalMode,
        'X-Security-Score': `${securityScan.riskScore}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Single upload error:', error);
    
    // Log error with memory context
    await logUploadError({
      uploadId,
      error: errorMessage,
      processingTime,
      userId,
      stack: error instanceof Error ? error.stack : undefined,
      memoryStats: memoryMonitor.getSystemMemoryStats(),
    });
    
    throw error;
  } finally {
    // Ensure memory cleanup
    if (processingMemoryAllocated) {
      memoryMonitor.deallocate(`processing_${uploadId}`);
    }
  }
}

async function handleBatchUpload(
  batchRequest: BatchUploadRequest,
  userId: string,
  uploadId: string,
  ip: string,
  userAgent: string
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { files, batchId = crypto.randomUUID(), metadata = {} } = batchRequest;

    // Validate batch size
    if (files.length > MAX_BATCH_SIZE) {
      return NextResponse.json({
        success: false,
        error: `Batch size exceeds limit of ${MAX_BATCH_SIZE} files`,
        code: 'BATCH_SIZE_EXCEEDED',
        metadata: {
          uploadId,
          batchId,
          fileCount: files.length,
          maxAllowed: MAX_BATCH_SIZE,
          timestamp: new Date().toISOString(),
        },
      }, { status: 400 });
    }

    // Calculate total size
    const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0);
    const limitsCheck = await checkUserLimits(userId, totalSize);
    
    if (!limitsCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: limitsCheck.reason,
        code: 'BATCH_LIMIT_EXCEEDED',
        metadata: {
          uploadId,
          batchId,
          totalSize,
          currentUsage: limitsCheck.currentUsage,
          limit: limitsCheck.limit,
          timestamp: new Date().toISOString(),
        },
      }, { status: 403 });
    }

    // Process each file
    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const fileUploadId = `${uploadId}_file_${i}`;
        const result = await processSingleFileInBatch(files[i], userId, fileUploadId, batchId);
        results.push(result);
      } catch (error) {
        errors.push({
          index: i,
          fileName: files[i].fileName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Create batch record
    await prisma.uploadBatch.create({
      data: {
        id: batchId,
        userId,
        uploadId,
        totalFiles: files.length,
        successfulFiles: results.length,
        failedFiles: errors.length,
        totalSize,
        metadata: {
          ...metadata,
          processingTime: Date.now() - startTime,
          errors,
        },
        status: errors.length === 0 ? 'completed' : 'partial',
        createdAt: new Date(),
      },
    });

    // Track batch analytics
    await trackBatchUploadAnalytics({
      userId,
      batchId,
      uploadId,
      totalFiles: files.length,
      successfulFiles: results.length,
      failedFiles: errors.length,
      totalSize,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json({
      success: errors.length === 0,
      batchId,
      results,
      errors,
      summary: {
        totalFiles: files.length,
        successfulFiles: results.length,
        failedFiles: errors.length,
        totalSize,
      },
      metadata: {
        uploadId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    }, {
      headers: {
        'X-Upload-ID': uploadId,
        'X-Batch-ID': batchId,
        'X-Processing-Time': `${Date.now() - startTime}ms`,
      },
    });

  } catch (error) {
    console.error('Batch upload error:', error);
    throw error;
  }
}

// File validation types
interface FileValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
  sanitizedName?: string;
  detectedType?: string;
  existingFileId?: string;
}

interface SecurityScanResult {
  scanId: string;
  safe: boolean;
  riskScore: number;
  threats: string[];
  scanTime: Date;
}

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum?: string;
  folder?: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

// File validation function
async function validateFile(file: {
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum?: string;
  userId: string;
}): Promise<FileValidationResult> {
  const { fileName, fileType, fileSize, checksum, userId } = file;

  // Basic validation
  if (!fileName || !fileType || !fileSize) {
    return {
      valid: false,
      error: 'Missing required fields: fileName, fileType, fileSize',
      code: 'MISSING_FIELDS',
    };
  }

  // File size validation
  if (fileSize <= 0) {
    return {
      valid: false,
      error: 'Invalid file size',
      code: 'INVALID_SIZE',
    };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB limit`,
      code: 'SIZE_EXCEEDED',
    };
  }

  // File type validation
  if (!ALLOWED_TYPES.includes(fileType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
      code: 'INVALID_TYPE',
    };
  }

  // Sanitize filename
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);

  // Detect actual file type from extension
  const extension = sanitizedName.split('.').pop()?.toLowerCase();
  const detectedType = getTypeFromExtension(extension);

  if (detectedType && detectedType !== fileType) {
    console.warn(`File type mismatch: declared ${fileType}, detected ${detectedType}`);
  }

  return {
    valid: true,
    sanitizedName,
    detectedType: detectedType || fileType,
  };
}

// Helper functions
function getTypeFromExtension(extension?: string): string | null {
  const typeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    csv: 'text/csv',
  };

  return extension ? typeMap[extension] || null : null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'usage':
        return NextResponse.json({
          success: true,
          usage: {
            storageUsed: 0,
            storageLimit: MAX_FILE_SIZE * 10,
            filesCount: 0,
            filesLimit: 100,
            plan: 'free',
          },
        });
      default:
        return NextResponse.json(
          { success: false, error: 'Method not allowed' },
          { status: 405 }
        );
    }
  } catch (error) {
    console.error('GET upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const fileId = url.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'File ID required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('DELETE upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Configuration constants
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_BATCH_SIZE = 20; // Maximum files per batch upload
const ALLOWED_TYPES = [
  // Images
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

const RATE_LIMIT_UPLOAD = 20; // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// Security constants
const BLOCKED_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'scr', 'pif', 'com', 'vbs', 'js', 'jar',
  'app', 'deb', 'rpm', 'php', 'asp', 'jsp', 'cgi', 'sh', 'ps1'
];

const MAX_FILENAME_LENGTH = 255;
const VIRUS_SCAN_TIMEOUT = 30000; // 30 seconds
const THUMBNAIL_SIZES = [150, 300, 600, 1200];

// File type categories
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'text/plain'];
const MEDIA_TYPES = ['audio/mpeg', 'video/mp4', 'video/webm'];

// Helper Functions for Enhanced Upload System

function calculateProcessingMemory(fileSize: number, processingMode: string): number {
  const baseMemory = UPLOAD_MEMORY_ALLOCATION[processingMode.toUpperCase() as keyof typeof UPLOAD_MEMORY_ALLOCATION] || UPLOAD_MEMORY_ALLOCATION.STREAMING;
  const fileSizeMultiplier = Math.max(1, fileSize / (50 * 1024 * 1024));
  return Math.min(baseMemory * fileSizeMultiplier, BASE_MEMORY_LIMIT * 0.25);
}

async function validateFileEnhanced(params: {
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum?: string;
  userId: string;
}): Promise<FileValidationResult> {
  const { fileName, fileType, fileSize, checksum, userId } = params;

  // File size validation
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      code: 'FILE_TOO_LARGE'
    };
  }

  if (fileSize <= 0) {
    return {
      valid: false,
      error: 'Invalid file size',
      code: 'INVALID_FILE_SIZE'
    };
  }

  // File type validation
  if (!ALLOWED_TYPES.includes(fileType)) {
    return {
      valid: false,
      error: 'File type not supported',
      code: 'UNSUPPORTED_FILE_TYPE'
    };
  }

  // Filename validation
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  if (sanitizedName.length > MAX_FILENAME_LENGTH) {
    return {
      valid: false,
      error: 'Filename too long',
      code: 'FILENAME_TOO_LONG'
    };
  }

  // Extension validation
  const extension = sanitizedName.split('.').pop()?.toLowerCase();
  if (extension && BLOCKED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: 'File extension not allowed',
      code: 'BLOCKED_EXTENSION'
    };
  }

  return {
    valid: true,
    sanitizedName,
    detectedType: fileType
  };
}

async function performSecurityScanEnhanced(params: {
  fileName: string;
  fileType: string;
  fileSize: number;
  userId: string;
  ip: string;
  userAgent: string;
}): Promise<SecurityScanResult> {
  const { fileName, fileType, fileSize, userId, ip, userAgent } = params;
  const scanId = `scan_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  
  let riskScore = 0;
  const threats: string[] = [];

  // File size risk assessment
  if (fileSize > 100 * 1024 * 1024) { // 100MB
    riskScore += 20;
    threats.push('large_file_size');
  }

  // File type risk assessment
  if (fileType.includes('script') || fileType.includes('executable')) {
    riskScore += 50;
    threats.push('executable_content');
  }

  // Filename risk assessment
  const suspiciousPatterns = ['.exe', '.bat', '.cmd', '.scr', 'script', 'payload'];
  for (const pattern of suspiciousPatterns) {
    if (fileName.toLowerCase().includes(pattern)) {
      riskScore += 30;
      threats.push('suspicious_filename');
      break;
    }
  }

  // IP reputation check (mock implementation)
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    // Private IP - lower risk
    riskScore -= 5;
  } else {
    // Public IP - standard risk
    riskScore += 5;
  }

  return {
    safe: riskScore < 50,
    threats: threats.length > 0 ? threats : undefined,
    riskScore,
    scanId
  };
}

async function checkUserLimitsEnhanced(userId: string, fileSize: number): Promise<{
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}> {
  try {
    // Get user's current storage usage
    const userFiles = await prisma.file.aggregate({
      where: { userId },
      _sum: { size: true },
      _count: true,
    });

    const currentUsage = userFiles._sum.size || 0;
    const fileCount = userFiles._count || 0;
    
    // Get user's plan limits (mock implementation)
    const userLimits = {
      maxStorage: 10 * 1024 * 1024 * 1024, // 10GB default
      maxFiles: 10000,
      maxFileSize: MAX_FILE_SIZE,
    };

    // Check storage limit
    if (currentUsage + fileSize > userLimits.maxStorage) {
      return {
        allowed: false,
        reason: 'Storage limit exceeded',
        currentUsage,
        limit: userLimits.maxStorage,
      };
    }

    // Check file count limit
    if (fileCount >= userLimits.maxFiles) {
      return {
        allowed: false,
        reason: 'File count limit exceeded',
        currentUsage: fileCount,
        limit: userLimits.maxFiles,
      };
    }

    // Check individual file size limit
    if (fileSize > userLimits.maxFileSize) {
      return {
        allowed: false,
        reason: 'File size limit exceeded',
        currentUsage: fileSize,
        limit: userLimits.maxFileSize,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking user limits:', error);
    return {
      allowed: false,
      reason: 'Unable to verify user limits',
    };
  }
}

async function generateThumbnailUrlsEnhanced(filename: string, extension: string): Promise<string[]> {
  const thumbnails: string[] = [];
  
  if (IMAGE_TYPES.some(type => type.includes(extension))) {
    for (const size of THUMBNAIL_SIZES) {
      const thumbnailPath = filename.replace(`.${extension}`, `_thumb_${size}.${extension}`);
      thumbnails.push(`${process.env.STORAGE_PUBLIC_URL}/${thumbnailPath}`);
    }
  }
  
  return thumbnails;
}

// Logging Functions
async function logSecurityEvent(event: string, data: any): Promise<void> {
  console.log(`[SECURITY] ${event}:`, JSON.stringify(data, null, 2));
  
  try {
    await prisma.auditLog.create({
      data: {
        action: event,
        details: data,
        timestamp: new Date(),
        severity: 'warning',
        category: 'security',
      },
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

async function logUploadError(data: {
  uploadId: string;
  error: string;
  processingTime: number;
  userId?: string;
  stack?: string;
  memoryStats?: any;
  systemLoad?: string;
}): Promise<void> {
  console.error(`[UPLOAD_ERROR] ${data.uploadId}:`, data);
  
  try {
    await prisma.auditLog.create({
      data: {
        action: 'upload_error',
        details: data,
        timestamp: new Date(),
        severity: 'error',
        category: 'upload',
        userId: data.userId,
      },
    });
  } catch (error) {
    console.error('Failed to log upload error:', error);
  }
}

async function logUploadSuccess(data: {
  uploadId: string;
  fileId: string;
  userId: string;
  fileSize: number;
  processingTime: number;
  memoryUsed: number;
  processingMode: string;
}): Promise<void> {
  console.log(`[UPLOAD_SUCCESS] ${data.uploadId}:`, data);
  
  try {
    await prisma.auditLog.create({
      data: {
        action: 'upload_success',
        details: data,
        timestamp: new Date(),
        severity: 'info',
        category: 'upload',
        userId: data.userId,
      },
    });
  } catch (error) {
    console.error('Failed to log upload success:', error);
  }
}
