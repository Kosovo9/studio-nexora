import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs';
import { processImagePipeline } from '@/lib/replicate';
import { prisma } from '@/lib/prisma';
import { ratelimit } from '@/lib/ratelimit';
import { validateImageUrl, sanitizeInput, generateSecureId } from '@/lib/utils';
import { trackAnalytics, trackPerformance } from '@/lib/analytics';
import { sendNotification } from '@/lib/notifications';
import { uploadToCloudinary, optimizeImage } from '@/lib/cloudinary';
import { validateTurnstile } from '@/lib/turnstile';
import { checkUserLimits, updateUserUsage } from '@/lib/limits';
import { createAuditLog } from '@/lib/audit';
import type { ImageType, ProcessingSettings, QueuePriority } from '@/types';
import crypto from 'crypto';

// Enhanced validation schemas
const VALID_IMAGE_TYPES = ['person', 'person-pet', 'object', 'landscape', 'custom', 'soloMe', 'meAndPet'];
const VALID_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
const VALID_QUALITIES = ['standard', 'high', 'ultra', 'maximum'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DIMENSION = 8192; // 8K resolution

// Enhanced Memory and Performance Configuration
const MEMORY_CONFIG = {
  // Base memory allocation (increased 100x from typical 50MB baseline)
  BASE_MEMORY_LIMIT: 5 * 1024 * 1024 * 1024, // 5GB (100x increase from 50MB)
  MAX_HEAP_SIZE: 8 * 1024 * 1024 * 1024, // 8GB max heap
  BUFFER_POOL_SIZE: 2 * 1024 * 1024 * 1024, // 2GB buffer pool
  CACHE_SIZE: 1 * 1024 * 1024 * 1024, // 1GB cache
  
  // Memory thresholds for different operations
  SMALL_IMAGE_THRESHOLD: 10 * 1024 * 1024, // 10MB
  MEDIUM_IMAGE_THRESHOLD: 50 * 1024 * 1024, // 50MB
  LARGE_IMAGE_THRESHOLD: 200 * 1024 * 1024, // 200MB
  
  // Processing memory allocation per job type
  PROCESSING_MEMORY: {
    draft: 512 * 1024 * 1024, // 512MB
    standard: 1 * 1024 * 1024 * 1024, // 1GB
    premium: 2 * 1024 * 1024 * 1024, // 2GB
    upscale: 3 * 1024 * 1024 * 1024, // 3GB
  },
  
  // Memory monitoring thresholds
  WARNING_THRESHOLD: 0.75, // 75% memory usage warning
  CRITICAL_THRESHOLD: 0.90, // 90% memory usage critical
  EMERGENCY_THRESHOLD: 0.95, // 95% memory usage emergency
};

// Enhanced Configuration Constants
const MAX_QUEUE_SIZE = 10000; // Increased 10x for higher throughput
const MAX_CONCURRENT_JOBS = 100; // Increased 10x for parallel processing
const RATE_LIMIT_STUDIO = 500; // Increased 10x requests per hour
const RATE_LIMIT_WINDOW = 3600000; // 1 hour
const DEFAULT_PROCESSING_TIME = 120000; // 2 minutes
const PRIORITY_MULTIPLIERS = { low: 1.5, normal: 1.0, high: 0.5 };

// File Upload Configuration (Enhanced)
const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB (10x increase)
  MAX_DIMENSION: 16384, // 16K resolution (2x increase)
  CHUNK_SIZE: 64 * 1024 * 1024, // 64MB chunks for large files
  CONCURRENT_UPLOADS: 10, // Parallel upload streams
  RETRY_ATTEMPTS: 5, // Upload retry attempts
  TIMEOUT: 300000, // 5 minute timeout
  
  // Supported formats with enhanced validation
  SUPPORTED_FORMATS: [
    'jpg', 'jpeg', 'png', 'webp', 'avif', 'tiff', 'bmp', 'gif',
    'heic', 'heif', 'raw', 'cr2', 'nef', 'arw', 'dng'
  ],
  
  // Memory-efficient processing modes
  PROCESSING_MODES: {
    streaming: 'stream', // For large files
    chunked: 'chunk', // For medium files
    memory: 'memory', // For small files
  }
};

// Processing costs (in credits)
const PROCESSING_COSTS = {
  draft: 1,
  standard: 3,
  premium: 5,
  upscale: 2,
  faceEnhancement: 1,
  backgroundRemoval: 2,
  colorCorrection: 1,
  noiseReduction: 1,
};

interface EnhancedProcessingRequest {
  imageUrl: string;
  imageType: ImageType;
  userId?: string;
  settings?: ProcessingSettings;
  priority?: QueuePriority;
  turnstileToken?: string;
  clientInfo?: {
    userAgent: string;
    ip: string;
    country?: string;
    device?: string;
  };
  metadata?: {
    originalFilename?: string;
    source?: string;
    tags?: string[];
    collection?: string;
  };
}

interface StudioRequest {
  imageUrl: string;
  imageType: ImageType;
  userId?: string;
  options?: ProcessingOptions;
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  webhook?: string;
  tags?: string[];
}

interface ProcessingOptions {
  quality?: 'draft' | 'standard' | 'premium';
  style?: string;
  prompt?: string;
  negativePrompt?: string;
  steps?: number;
  guidance?: number;
  seed?: number;
  aspectRatio?: string;
  outputFormat?: 'jpg' | 'png' | 'webp';
  watermark?: boolean;
  upscale?: boolean;
  faceEnhancement?: boolean;
  backgroundRemoval?: boolean;
  colorCorrection?: boolean;
  noiseReduction?: boolean;
}

interface StudioResponse {
  success: boolean;
  jobId?: string;
  estimatedTime?: number;
  queuePosition?: number;
  cost?: number;
  error?: string;
  code?: string;
  metadata?: {
    jobId: string;
    timestamp: string;
    processingTime?: number;
    queueInfo?: QueueInfo;
  };
}

interface QueueInfo {
  position: number;
  estimatedWait: number;
  totalJobs: number;
  averageProcessingTime: number;
}

interface JobAnalytics {
  jobId: string;
  userId: string;
  imageType: ImageType;
  processingTime: number;
  queueTime: number;
  success: boolean;
  cost: number;
  options: ProcessingOptions;
  country?: string;
  device?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const jobId = `job_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  
  // Initialize memory monitoring
  const memoryMonitor = new MemoryMonitor(jobId);
  await memoryMonitor.initialize();

  try {
    // Pre-flight memory check
    const memoryStatus = await checkMemoryAvailability();
    if (!memoryStatus.available) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient memory available for processing',
        code: 'MEMORY_INSUFFICIENT',
        metadata: {
          jobId,
          memoryStatus,
          timestamp: new Date().toISOString(),
        },
      }, { status: 503 });
    }

    // Extract request metadata with enhanced validation
    const headersList = headers();
    const ip = request.ip || headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    const country = headersList.get('cf-ipcountry') || 'unknown';
    const contentLength = parseInt(headersList.get('content-length') || '0');
    
    // Validate content size against memory limits
    if (contentLength > MEMORY_CONFIG.BASE_MEMORY_LIMIT * 0.1) { // 10% of base memory
      return NextResponse.json({
        success: false,
        error: 'Request payload too large for current memory allocation',
        code: 'PAYLOAD_TOO_LARGE',
        metadata: {
          jobId,
          contentLength,
          maxAllowed: MEMORY_CONFIG.BASE_MEMORY_LIMIT * 0.1,
          timestamp: new Date().toISOString(),
        },
      }, { status: 413 });
    }

    // Enhanced authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        metadata: {
          jobId,
          timestamp: new Date().toISOString(),
        },
      }, { status: 401 });
    }

    // Enhanced rate limiting
    const rateLimitResult = await checkStudioRateLimit(userId, ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        metadata: {
          jobId,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
          timestamp: new Date().toISOString(),
        },
      }, { status: 429 });
    }

    // Parse and validate request
    const body = await request.json();
    const studioRequest: StudioRequest = {
      imageUrl: body.imageUrl,
      imageType: body.imageType,
      userId,
      options: body.options || {},
      metadata: body.metadata || {},
      priority: body.priority || 'normal',
      webhook: body.webhook,
      tags: body.tags || [],
    };

    // Comprehensive validation
    const validation = await validateStudioRequest(studioRequest);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
        code: validation.code,
        metadata: {
          jobId,
          timestamp: new Date().toISOString(),
        },
      }, { status: 400 });
    }

    // Check user limits and credits
    const limitsCheck = await checkUserLimits(userId, studioRequest.options);
    if (!limitsCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: limitsCheck.reason,
        code: 'LIMIT_EXCEEDED',
        metadata: {
          jobId,
          currentCredits: limitsCheck.currentCredits,
          requiredCredits: limitsCheck.requiredCredits,
          timestamp: new Date().toISOString(),
        },
      }, { status: 403 });
    }

    // Check queue capacity
    const queueInfo = await getQueueInfo(studioRequest.priority);
    if (queueInfo.totalJobs >= MAX_QUEUE_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'Processing queue is full. Please try again later.',
        code: 'QUEUE_FULL',
        metadata: {
          jobId,
          queueSize: queueInfo.totalJobs,
          maxSize: MAX_QUEUE_SIZE,
          timestamp: new Date().toISOString(),
        },
      }, { status: 503 });
    }

    // Calculate processing cost
    const cost = calculateProcessingCost(studioRequest.options);
    const estimatedTime = calculateEstimatedTime(studioRequest.options, queueInfo);

    // Create comprehensive job record
    const job = await prisma.job.create({
      data: {
        id: jobId,
        userId,
        type: 'image_processing',
        status: 'queued',
        priority: studioRequest.priority,
        input: {
          imageUrl: studioRequest.imageUrl,
          imageType: studioRequest.imageType,
          options: studioRequest.options,
          metadata: studioRequest.metadata,
          tags: studioRequest.tags,
          webhook: studioRequest.webhook,
        },
        progress: 0,
        cost,
        estimatedTime,
        queuePosition: queueInfo.position + 1,
        metadata: {
          ip,
          userAgent,
          country,
          requestTime: new Date().toISOString(),
          validation: validation.metadata,
        },
        createdAt: new Date(),
      },
    });

    // Deduct credits from user account
    await deductUserCredits(userId, cost);

    // Add to processing queue
    await addToProcessingQueue(jobId, studioRequest.priority);

    // Track analytics
    await trackStudioAnalytics({
      jobId,
      userId,
      imageType: studioRequest.imageType,
      processingTime: 0,
      queueTime: 0,
      success: true,
      cost,
      options: studioRequest.options,
      country,
      device: getDeviceType(userAgent),
    });

    // Create audit log
    await createAuditLog('studio_job_created', {
      userId,
      jobId,
      imageType: studioRequest.imageType,
      cost,
      priority: studioRequest.priority,
    });

    // Start background processing
    processImageInBackground(jobId, studioRequest);

    const response: StudioResponse = {
      success: true,
      jobId,
      estimatedTime,
      queuePosition: queueInfo.position + 1,
      cost,
      metadata: {
        jobId,
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        queueInfo,
      },
    };

    // Final memory status check
    const finalMemoryStatus = await memoryMonitor.getStatus();
    
    return NextResponse.json(response, {
      headers: {
        'X-Job-ID': jobId,
        'X-Queue-Position': (queueInfo.position + 1).toString(),
        'X-Estimated-Time': estimatedTime.toString(),
        'X-Processing-Cost': cost.toString(),
        'X-Memory-Allocated': finalMemoryStatus.allocated.toString(),
        'X-Memory-Available': finalMemoryStatus.available.toString(),
        'X-Memory-Usage': finalMemoryStatus.usagePercentage.toString(),
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Studio API error:', error);

    // Enhanced error logging with memory context
    const memoryContext = await memoryMonitor.getStatus();
    await logStudioError({
      jobId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
      userId: auth().userId,
      stack: error instanceof Error ? error.stack : undefined,
      memoryContext,
      systemMetrics: await getSystemMetrics(),
    });

    // Cleanup memory allocation on error
    await memoryMonitor.cleanup();

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      metadata: {
        jobId,
        timestamp: new Date().toISOString(),
        processingTime,
        memoryStatus: memoryContext,
      },
    }, { status: 500 });
  } finally {
    // Ensure memory cleanup
    await memoryMonitor.cleanup();
  }
}

// Enhanced background processing function with comprehensive features
async function processImageInBackground(jobId: string, studioRequest: StudioRequest) {
  const startTime = Date.now();
  let queueStartTime = startTime;
  let processingSteps: string[] = [];

  try {
    // Wait for queue position
    await waitForQueuePosition(jobId);
    queueStartTime = Date.now();
    processingSteps.push('queue_position_reached');

    // Update job status to processing
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        progress: 5,
        startedAt: new Date(),
        metadata: {
          queueTime: queueStartTime - startTime,
        },
      },
    });

    processingSteps.push('job_started');

    // Validate image URL and download
    await updateJobProgress(jobId, 10, 'Validating image...');
    const imageValidation = await validateImageUrl(studioRequest.imageUrl);
    if (!imageValidation.valid) {
      throw new Error(`Image validation failed: ${imageValidation.error}`);
    }
    processingSteps.push('image_validated');

    // Step 1: Image preprocessing and validation
    await updateJobProgress(jobId, 15, 'Preprocessing image...');
    const preprocessResult = await preprocessImage(studioRequest.imageUrl, studioRequest.options || {});
    processingSteps.push('preprocessing_complete');

    // Step 2: AI model selection and optimization
    await updateJobProgress(jobId, 20, 'Selecting optimal AI model...');
    const modelConfig = await selectOptimalModel(studioRequest.imageType, studioRequest.options || {}, preprocessResult.metadata);
    processingSteps.push('model_selected');

    // Step 3: Queue management and resource allocation
    await updateJobProgress(jobId, 25, 'Allocating processing resources...');
    const resourceAllocation = await allocateProcessingResources(jobId, studioRequest.priority || 'normal');
    processingSteps.push('resources_allocated');

    // Step 4: Primary AI processing
    await updateJobProgress(jobId, 30, 'Processing with AI pipeline...');
    const primaryResults = await processImagePipeline(
      preprocessResult.optimizedUrl || studioRequest.imageUrl, 
      studioRequest.imageType,
      {
        ...studioRequest.options,
        modelConfig,
        resourceAllocation,
        jobId,
        userId: studioRequest.userId,
      }
    );
    processingSteps.push('primary_processing_complete');

    // Step 5: Post-processing enhancements
    await updateJobProgress(jobId, 60, 'Applying enhancements...');
    const enhancedResults = await applyPostProcessingEnhancements(primaryResults, studioRequest.options || {});
    processingSteps.push('enhancements_applied');

    // Step 6: Quality optimization and format conversion
    await updateJobProgress(jobId, 75, 'Optimizing output quality...');
    const optimizedResults = await optimizeOutputs(enhancedResults, studioRequest.options || {});
    processingSteps.push('optimization_complete');

    // Step 7: Generate thumbnails and variants
    await updateJobProgress(jobId, 85, 'Generating thumbnails...');
    const thumbnails = await generateThumbnails(optimizedResults.processedUrls, studioRequest.options || {});
    processingSteps.push('thumbnails_generated');

    // Step 8: Upload to cloud storage with CDN
    await updateJobProgress(jobId, 90, 'Uploading to cloud storage...');
    const cloudUrls = await uploadToCloudStorage(optimizedResults, thumbnails, {
      userId: studioRequest.userId,
      jobId,
      metadata: studioRequest.metadata || {},
    });
    processingSteps.push('cloud_upload_complete');

    // Step 9: Generate watermarks if requested
    let watermarkId: string | undefined;
    if (studioRequest.options?.watermark) {
      await updateJobProgress(jobId, 95, 'Applying watermarks...');
      watermarkId = await applyWatermarks(cloudUrls.processedUrls, studioRequest.userId);
      processingSteps.push('watermarks_applied');
    }

    // Step 10: Create comprehensive image record
    const imageRecord = await prisma.processedImage.create({
      data: {
        id: crypto.randomUUID(),
        userId: studioRequest.userId || 'anonymous',
        originalUrl: studioRequest.imageUrl,
        processedUrl: cloudUrls.processedUrls[0],
        thumbnailUrl: cloudUrls.thumbnails[0],
        imageType: studioRequest.imageType,
        status: 'completed',
        watermarkId: watermarkId || `wm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          urls: cloudUrls.processedUrls,
          thumbnails: cloudUrls.thumbnails,
          count: cloudUrls.processedUrls.length,
          processingTime: Date.now() - queueStartTime,
          queueTime: queueStartTime - startTime,
          totalTime: Date.now() - startTime,
          settings: studioRequest.options,
          modelUsed: modelConfig.name,
          qualityScore: optimizedResults.qualityScore,
          compressionRatio: optimizedResults.compressionRatio,
          originalSize: preprocessResult.metadata.size,
          processedSize: optimizedResults.totalSize,
          dimensions: {
            original: preprocessResult.metadata.dimensions,
            processed: optimizedResults.dimensions,
          },
          processingSteps,
          performance: {
            preprocessingTime: preprocessResult.processingTime,
            aiProcessingTime: primaryResults.processingTime,
            postProcessingTime: enhancedResults.processingTime,
            optimizationTime: optimizedResults.processingTime,
            totalTime: Date.now() - startTime,
          },
          analytics: {
            modelAccuracy: primaryResults.confidence,
            enhancementLevel: enhancedResults.enhancementLevel,
            errorRate: 0,
          },
        },
        tags: studioRequest.tags || [],
        createdAt: new Date(),
      },
    });

    // Complete job with comprehensive results
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        result: {
          imageId: imageRecord.id,
          processedUrls: cloudUrls.processedUrls,
          thumbnails: cloudUrls.thumbnails,
          watermarkId: imageRecord.watermarkId,
          qualityScore: optimizedResults.qualityScore,
          processingTime: Date.now() - queueStartTime,
          queueTime: queueStartTime - startTime,
          totalTime: Date.now() - startTime,
          metadata: imageRecord.metadata,
        },
      },
    });

    // Update user statistics
    if (studioRequest.userId) {
      await updateUserStatistics(studioRequest.userId, {
        imagesProcessed: 1,
        totalProcessingTime: Date.now() - queueStartTime,
        averageQuality: optimizedResults.qualityScore,
      });
    }

    // Send webhook notification if provided
    if (studioRequest.webhook) {
      await sendWebhookNotification(studioRequest.webhook, {
        jobId,
        status: 'completed',
        imageId: imageRecord.id,
        results: cloudUrls.processedUrls,
      });
    }

    // Track comprehensive analytics
    await trackAnalytics('image_processed_success', {
      userId: studioRequest.userId,
      jobId,
      imageType: studioRequest.imageType,
      processingTime: Date.now() - queueStartTime,
      queueTime: queueStartTime - startTime,
      qualityScore: optimizedResults.qualityScore,
      modelUsed: modelConfig.name,
      settings: studioRequest.options ? Object.keys(studioRequest.options) : [],
      outputCount: cloudUrls.processedUrls.length,
      compressionRatio: optimizedResults.compressionRatio,
      processingSteps: processingSteps.length,
    });

    // Track performance metrics
    await trackPerformance('processing_time', Date.now() - queueStartTime);
    await trackPerformance('queue_time', queueStartTime - startTime);
    await trackPerformance('quality_score', optimizedResults.qualityScore);
    await trackPerformance('compression_ratio', optimizedResults.compressionRatio);

    // Send completion notification
    if (studioRequest.userId) {
      await sendNotification(studioRequest.userId, {
        type: 'success',
        title: 'Processing Complete!',
        message: `Your ${studioRequest.imageType} image has been successfully processed`,
        data: {
          jobId,
          imageId: imageRecord.id,
          processedUrls: cloudUrls.processedUrls,
          processingTime: Date.now() - startTime,
        },
      });
    }

    // Create success audit log
    await createAuditLog('job_completed', {
      userId: studioRequest.userId,
      resourceType: 'job',
      resourceId: jobId,
      metadata: {
        imageId: imageRecord.id,
        processingTime: Date.now() - queueStartTime,
        totalTime: Date.now() - startTime,
        qualityScore: optimizedResults.qualityScore,
        outputCount: cloudUrls.processedUrls.length,
      },
    });

    // Cleanup temporary files
    await cleanupTempFiles([preprocessResult.tempFiles, primaryResults.tempFiles].flat());
    
    console.log(`Job ${jobId} completed successfully in ${Date.now() - startTime}ms`);


  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Background processing error:', error);
    
    // Update job with detailed error status
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        progress: 0,
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Processing failed',
        metadata: {
          errorDetails: {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            processingSteps,
            failedAt: processingSteps[processingSteps.length - 1] || 'unknown',
            processingTime,
            queueTime: queueStartTime - startTime,
          },
        },
      },
    });

    // Refund credits if processing failed
    if (studioRequest.userId) {
      const cost = await getJobCost(jobId);
      await refundUserCredits(studioRequest.userId, cost);
    }

    // Send webhook notification for failure
    if (studioRequest.webhook) {
      await sendWebhookNotification(studioRequest.webhook, {
        jobId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Processing failed',
      });
    }

    // Track detailed error analytics
    await trackAnalytics('image_processing_error', {
      userId: studioRequest.userId,
      jobId,
      imageType: studioRequest.imageType,
      error: error instanceof Error ? error.message : 'Unknown error',
      failedAt: processingSteps[processingSteps.length - 1] || 'unknown',
      processingTime,
      queueTime: queueStartTime - startTime,
      processingSteps,
    });

    // Send error notification
    if (studioRequest.userId) {
      await sendNotification(studioRequest.userId, {
        type: 'error',
        title: 'Processing Failed',
        message: `Failed to process your ${studioRequest.imageType} image`,
        data: {
          jobId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }

    // Create error audit log
    await createAuditLog('job_failed', {
      userId: studioRequest.userId,
      resourceType: 'job',
      resourceId: jobId,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingSteps,
        processingTime,
        queueTime: queueStartTime - startTime,
      },
    });

    // Cleanup any partial results
    try {
      await cleanupFailedJob(jobId);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
}
  } catch (error) {
    console.error('Background processing error:', error);
    
    // Update job with detailed error status
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        progress: 0,
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Processing failed',
        metadata: {
          errorDetails: {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            processingSteps,
            failedAt: processingSteps[processingSteps.length - 1] || 'unknown',
            processingTime: Date.now() - startTime,
          },
        },
      },
    });

    // Track detailed error analytics
    await trackAnalytics('image_processing_error', {
      userId,
      jobId,
      imageType,
      error: error instanceof Error ? error.message : 'Unknown error',
      failedAt: processingSteps[processingSteps.length - 1] || 'unknown',
      processingTime: Date.now() - startTime,
      processingSteps,
    });

    // Send error notification
    if (userId) {
      await sendNotification(userId, {
        type: 'error',
        title: 'Processing Failed',
        message: `Failed to process your ${imageType} image`,
        data: {
          jobId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }

    // Create error audit log
    await createAuditLog({
      userId,
      action: 'job_failed',
      resourceType: 'job',
      resourceId: jobId,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingSteps,
        processingTime: Date.now() - startTime,
      },
    });

    // Cleanup any partial results
    try {
      await cleanupFailedJob(jobId);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
}

// Enhanced GET endpoint with advanced filtering and analytics
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'images';

    switch (action) {
      case 'images':
        return await getUserImages(userId, searchParams);
      case 'jobs':
        return await getUserJobs(userId, searchParams);
      case 'stats':
        return await getUserStats(userId);
      case 'credits':
        return await getUserCredits(userId);
      case 'queue':
        return await getQueueStatus();
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          code: 'INVALID_ACTION',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Studio GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    }, { status: 500 });
  }
}

async function getUserImages(userId: string, searchParams: URLSearchParams) {
  const startTime = Date.now();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const imageType = searchParams.get('imageType');
  const status = searchParams.get('status') || 'completed';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const search = searchParams.get('search');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const includeAnalytics = searchParams.get('includeAnalytics') === 'true';
  const includeMetadata = searchParams.get('includeMetadata') === 'true';

  // Build dynamic where clause
  const whereClause: any = { userId };
  
  if (imageType) {
    whereClause.imageType = imageType;
  }
  
  if (status) {
    whereClause.status = status;
  } else {
    whereClause.status = 'completed'; // Default to completed
  }
  
  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
    if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
  }
  
  if (search) {
    whereClause.OR = [
      { watermarkId: { contains: search, mode: 'insensitive' } },
      { imageType: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Build dynamic order clause
  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  // Execute query with optimized selection
  const [images, total, userStats] = await Promise.all([
    prisma.processedImage.findMany({
      where: whereClause,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        originalUrl: true,
        processedUrl: true,
        thumbnailUrl: true,
        imageType: true,
        status: true,
        watermarkId: true,
        createdAt: true,
        updatedAt: true,
        metadata: includeMetadata,
        tags: true,
      },
    }),
    prisma.processedImage.count({
      where: whereClause,
    }),
    // Get user statistics
    prisma.processedImage.groupBy({
      by: ['imageType', 'status'],
      where: { userId },
      _count: true,
    }),
  ]);

  // Calculate analytics if requested
  let analytics = {};
  if (includeAnalytics) {
    analytics = {
      typeDistribution: userStats.reduce((acc, stat) => {
        if (!acc[stat.imageType]) acc[stat.imageType] = 0;
        acc[stat.imageType] += stat._count;
        return acc;
      }, {} as Record<string, number>),
      statusDistribution: userStats.reduce((acc, stat) => {
        if (!acc[stat.status]) acc[stat.status] = 0;
        acc[stat.status] += stat._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Enhanced pagination info
  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1,
    nextPage: page < Math.ceil(total / limit) ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };

  const response = {
    success: true,
    images,
    pagination,
    filters: {
      imageType,
      status,
      sortBy,
      sortOrder,
      search,
      dateFrom,
      dateTo,
    },
    metadata: {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      version: '2.0',
    },
    ...(includeAnalytics && { analytics }),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'private, max-age=60',
      'X-Response-Time': `${Date.now() - startTime}ms`,
      'X-Total-Count': total.toString(),
    },
  });
}

async function getUserJobs(userId: string, searchParams: URLSearchParams) {
  const startTime = Date.now();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const status = searchParams.get('status');
  const type = searchParams.get('type') || 'image_processing';

  const where: any = {
    userId,
    type,
    ...(status && { status }),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        priority: true,
        progress: true,
        cost: true,
        estimatedTime: true,
        queuePosition: true,
        input: true,
        result: true,
        error: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    jobs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      filters: { status, type },
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responseTime: Date.now() - startTime,
    },
  });
}

async function getUserStats(userId: string) {
  const startTime = Date.now();
  const [
    totalImages,
    totalJobs,
    activeJobs,
    completedJobs,
    failedJobs,
    totalCreditsUsed,
    recentActivity,
  ] = await Promise.all([
    prisma.processedImage.count({
      where: { userId, status: 'completed' },
    }),
    prisma.job.count({
      where: { userId, type: 'image_processing' },
    }),
    prisma.job.count({
      where: { userId, type: 'image_processing', status: { in: ['queued', 'processing'] } },
    }),
    prisma.job.count({
      where: { userId, type: 'image_processing', status: 'completed' },
    }),
    prisma.job.count({
      where: { userId, type: 'image_processing', status: 'failed' },
    }),
    prisma.job.aggregate({
      where: { userId, type: 'image_processing', status: 'completed' },
      _sum: { cost: true },
    }),
    prisma.job.findMany({
      where: { userId, type: 'image_processing' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
        cost: true,
      },
    }),
  ]);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      totalImagesProcessed: true,
      totalProcessingTime: true,
      totalCreditsUsed: true,
      lastProcessingAt: true,
      subscription: {
        select: {
          plan: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    stats: {
      images: {
        total: totalImages,
        thisMonth: 0, // Calculate based on date range
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        completed: completedJobs,
        failed: failedJobs,
        successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
      },
      credits: {
        current: user?.credits || 0,
        used: totalCreditsUsed._sum.cost || 0,
        total: user?.totalCreditsUsed || 0,
      },
      processing: {
        totalTime: user?.totalProcessingTime || 0,
        averageTime: completedJobs > 0 ? (user?.totalProcessingTime || 0) / completedJobs : 0,
        lastProcessing: user?.lastProcessingAt,
      },
      subscription: {
        plan: user?.subscription?.plan || 'free',
        status: user?.subscription?.status || 'inactive',
        dailyLimit: getUserDailyLimit(user?.subscription?.plan || 'free'),
      },
    },
    recentActivity,
    metadata: {
      timestamp: new Date().toISOString(),
      userId,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responseTime: Date.now() - startTime,
    },
  });
}

async function getUserCredits(userId: string) {
  const startTime = Date.now();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      subscription: {
        select: {
          plan: true,
          status: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({
      success: false,
      error: 'User not found',
      code: 'USER_NOT_FOUND',
    }, { status: 404 });
  }

  // Get credit usage for current month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyUsage = await prisma.job.aggregate({
    where: {
      userId,
      type: 'image_processing',
      status: 'completed',
      createdAt: { gte: monthStart },
    },
    _sum: { cost: true },
  });

  const plan = user.subscription?.plan || 'free';
  const monthlyLimit = getMonthlyCreditsLimit(plan);

  return NextResponse.json({
    success: true,
    credits: {
      current: user.credits || 0,
      monthlyUsed: monthlyUsage._sum.cost || 0,
      monthlyLimit,
      remaining: Math.max(0, monthlyLimit - (monthlyUsage._sum.cost || 0)),
      plan,
      status: user.subscription?.status || 'inactive',
    },
    metadata: {
      timestamp: new Date().toISOString(),
      monthStart: monthStart.toISOString(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responseTime: Date.now() - startTime,
    },
  });
}

async function getQueueStatus() {
  const startTime = Date.now();
  const [queuedJobs, processingJobs, recentCompletions] = await Promise.all([
    prisma.job.count({
      where: { status: 'queued', type: 'image_processing' },
    }),
    prisma.job.count({
      where: { status: 'processing', type: 'image_processing' },
    }),
    prisma.job.findMany({
      where: {
        status: 'completed',
        type: 'image_processing',
        completedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    }),
  ]);

  const averageProcessingTime = recentCompletions.length > 0
    ? recentCompletions.reduce((sum, job) => {
        if (job.startedAt && job.completedAt) {
          return sum + (job.completedAt.getTime() - job.startedAt.getTime());
        }
        return sum;
      }, 0) / recentCompletions.length
    : DEFAULT_PROCESSING_TIME;

  return NextResponse.json({
    success: true,
    queue: {
      queued: queuedJobs,
      processing: processingJobs,
      total: queuedJobs + processingJobs,
      capacity: MAX_QUEUE_SIZE,
      averageProcessingTime: Math.round(averageProcessingTime / 1000), // in seconds
      estimatedWaitTime: Math.round((queuedJobs * averageProcessingTime) / (MAX_CONCURRENT_JOBS * 1000)), // in seconds
    },
    metadata: {
      timestamp: new Date().toISOString(),
      maxConcurrent: MAX_CONCURRENT_JOBS,
      maxQueueSize: MAX_QUEUE_SIZE,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responseTime: Date.now() - startTime,
    },
  });
}

function getUserDailyLimit(plan: string): number {
  const limits: Record<string, number> = {
    free: 5,
    pro: 50,
    enterprise: 500,
  };
  return limits[plan] || limits.free;
}

function getMonthlyCreditsLimit(plan: string): number {
  const limits: Record<string, number> = {
    free: 10,
    pro: 500,
    enterprise: 5000,
  };
  return limits[plan] || limits.free;
}

// ==================== COMPREHENSIVE HELPER FUNCTIONS ====================

// Image preprocessing function
async function preprocessImage(imageUrl: string, settings: ProcessingSettings) {
  const startTime = Date.now();
  
  try {
    // Download and analyze image
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const metadata = await analyzeImageMetadata(buffer);
    
    // Optimize image for processing
    const optimizedBuffer = await optimizeImageForProcessing(buffer, settings);
    const optimizedUrl = await uploadTempFile(optimizedBuffer, 'preprocessed');
    
    return {
      optimizedUrl,
      metadata: {
        ...metadata,
        size: buffer.byteLength,
        optimizedSize: optimizedBuffer.byteLength,
        dimensions: metadata.dimensions,
      },
      processingTime: Date.now() - startTime,
      tempFiles: [optimizedUrl],
    };
  } catch (error) {
    throw new Error(`Preprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// AI model selection function
async function selectOptimalModel(imageType: string, settings: ProcessingSettings, metadata: any) {
  const models = {
    portrait: {
      name: 'portrait-enhancer-v3',
      config: { focus: 'face', enhancement: 'high' },
      priority: settings.priority === 'high' ? 1 : 2,
    },
    landscape: {
      name: 'landscape-optimizer-v2',
      config: { focus: 'scenery', enhancement: 'balanced' },
      priority: settings.priority === 'high' ? 1 : 2,
    },
    product: {
      name: 'product-enhancer-v4',
      config: { focus: 'details', enhancement: 'ultra' },
      priority: 1,
    },
    art: {
      name: 'artistic-enhancer-v2',
      config: { focus: 'style', enhancement: 'creative' },
      priority: 2,
    },
  };
  
  const selectedModel = models[imageType as keyof typeof models] || models.portrait;
  
  // Adjust based on image characteristics
  if (metadata.dimensions.width > 4000 || metadata.dimensions.height > 4000) {
    selectedModel.config.resolution = 'ultra-high';
  }
  
  return selectedModel;
}

// Resource allocation function
async function allocateProcessingResources(jobId: string, priority: QueuePriority) {
  const allocation = {
    cpuCores: priority === 'high' ? 8 : priority === 'normal' ? 4 : 2,
    memoryGB: priority === 'high' ? 16 : priority === 'normal' ? 8 : 4,
    gpuEnabled: priority !== 'low',
    queuePosition: await getQueuePosition(jobId, priority),
    estimatedWaitTime: await estimateWaitTime(priority),
  };
  
  // Reserve resources
  await reserveResources(jobId, allocation);
  
  return allocation;
}

// Post-processing enhancements function
async function applyPostProcessingEnhancements(results: any, settings: ProcessingSettings) {
  const startTime = Date.now();
  const enhancements = [];
  
  try {
    // Apply noise reduction
    if (settings.noiseReduction !== false) {
      const denoised = await applyNoiseReduction(results.processedUrls);
      enhancements.push('noise_reduction');
      results.processedUrls = denoised;
    }
    
    // Apply sharpening
    if (settings.sharpening !== false) {
      const sharpened = await applySharpening(results.processedUrls, settings.sharpeningLevel || 'medium');
      enhancements.push('sharpening');
      results.processedUrls = sharpened;
    }
    
    // Apply color correction
    if (settings.colorCorrection !== false) {
      const colorCorrected = await applyColorCorrection(results.processedUrls);
      enhancements.push('color_correction');
      results.processedUrls = colorCorrected;
    }
    
    // Apply HDR enhancement
    if (settings.hdrEnhancement) {
      const hdrEnhanced = await applyHDREnhancement(results.processedUrls);
      enhancements.push('hdr_enhancement');
      results.processedUrls = hdrEnhanced;
    }
    
    return {
      ...results,
      enhancements,
      enhancementLevel: enhancements.length,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    throw new Error(`Post-processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Output optimization function
async function optimizeOutputs(results: any, settings: ProcessingSettings) {
  const startTime = Date.now();
  
  try {
    const optimizedUrls = [];
    let totalSize = 0;
    let qualityScore = 0;
    
    for (const url of results.processedUrls) {
      const optimized = await optimizeImage(url, {
        quality: settings.quality || 85,
        format: settings.outputFormat || 'webp',
        progressive: true,
        stripMetadata: settings.stripMetadata !== false,
      });
      
      optimizedUrls.push(optimized.url);
      totalSize += optimized.size;
      qualityScore += optimized.qualityScore;
    }
    
    return {
      processedUrls: optimizedUrls,
      totalSize,
      qualityScore: qualityScore / optimizedUrls.length,
      compressionRatio: results.originalSize / totalSize,
      dimensions: await getImageDimensions(optimizedUrls[0]),
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    throw new Error(`Output optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Thumbnail generation function
async function generateThumbnails(urls: string[], settings: ProcessingSettings) {
  const thumbnailSizes = settings.thumbnailSizes || [150, 300, 600];
  const thumbnails = [];
  
  for (const url of urls) {
    for (const size of thumbnailSizes) {
      const thumbnail = await generateThumbnail(url, size);
      thumbnails.push(thumbnail);
    }
  }
  
  return thumbnails;
}

// Cloud storage upload function
async function uploadToCloudStorage(results: any, thumbnails: string[], metadata: any) {
  try {
    const uploadPromises = [
      ...results.processedUrls.map((url: string) => uploadToCloud(url, 'processed', metadata)),
      ...thumbnails.map((url: string) => uploadToCloud(url, 'thumbnails', metadata)),
    ];
    
    const uploadedUrls = await Promise.all(uploadPromises);
    
    return {
      processedUrls: uploadedUrls.slice(0, results.processedUrls.length),
      thumbnails: uploadedUrls.slice(results.processedUrls.length),
    };
  } catch (error) {
    throw new Error(`Cloud upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Watermark application function
async function applyWatermarks(urls: string[], userId?: string) {
  const watermarkId = `wm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  for (const url of urls) {
    await applyWatermark(url, {
      text: `Studio Nexora - ${watermarkId}`,
      position: 'bottom-right',
      opacity: 0.7,
      userId,
    });
  }
  
  return watermarkId;
}

// Analytics tracking function
async function trackAnalytics(event: string, data: any) {
  try {
    await prisma.analytics.create({
      data: {
        event,
        userId: data.userId || null,
        metadata: data,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

// Performance tracking function
async function trackPerformance(metric: string, value: number) {
  try {
    await prisma.performanceMetric.create({
      data: {
        metric,
        value,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Performance tracking error:', error);
  }
}

// Notification sending function
async function sendNotification(userId: string, notification: any) {
  try {
    // Send real-time notification via WebSocket
    await sendWebSocketNotification(userId, notification);
    
    // Store notification in database
    await prisma.notification.create({
      data: {
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: false,
      },
    });
  } catch (error) {
    console.error('Notification error:', error);
  }
}

// Audit logging function
async function createAuditLog(data: any) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        metadata: data.metadata,
        timestamp: new Date(),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

// User statistics update function
async function updateUserStatistics(userId: string, stats: any) {
  try {
    await prisma.userStatistics.upsert({
      where: { userId },
      update: {
        imagesProcessed: { increment: stats.imagesProcessed || 0 },
        totalProcessingTime: { increment: stats.totalProcessingTime || 0 },
        lastActivity: new Date(),
      },
      create: {
        userId,
        imagesProcessed: stats.imagesProcessed || 0,
        totalProcessingTime: stats.totalProcessingTime || 0,
        averageQuality: stats.averageQuality || 0,
        lastActivity: new Date(),
      },
    });
  } catch (error) {
    console.error('User statistics error:', error);
  }
}

// Cleanup functions
async function cleanupTempFiles(files: string[]) {
  for (const file of files) {
    try {
      await deleteTempFile(file);
    } catch (error) {
      console.error(`Failed to cleanup temp file ${file}:`, error);
    }
  }
}

async function cleanupFailedJob(jobId: string) {
  try {
    // Remove any partial uploads
    await removePartialUploads(jobId);
    
    // Clean temp files
    await cleanupJobTempFiles(jobId);
    
    // Update job status
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'cleaned' },
    });
  } catch (error) {
    console.error('Failed job cleanup error:', error);
  }
}

// Mock implementations for external services (to be implemented)
async function analyzeImageMetadata(buffer: ArrayBuffer) {
  // Mock implementation - replace with actual image analysis
  return {
    dimensions: { width: 1920, height: 1080 },
    format: 'jpeg',
    colorSpace: 'sRGB',
    hasAlpha: false,
  };
}

async function optimizeImageForProcessing(buffer: ArrayBuffer, settings: ProcessingSettings) {
  // Mock implementation - replace with actual image optimization
  return buffer;
}

async function uploadTempFile(buffer: ArrayBuffer, prefix: string) {
  // Mock implementation - replace with actual temp file upload
  return `temp://${prefix}_${Date.now()}.jpg`;
}

// ===== ENHANCED MEMORY MANAGEMENT SYSTEM =====

/**
 * Comprehensive Memory Monitor Class
 * Tracks and manages memory allocation for individual jobs
 */
class MemoryMonitor {
  private jobId: string;
  private allocatedMemory: number = 0;
  private peakMemory: number = 0;
  private startTime: number;
  private memorySnapshots: Array<{ timestamp: number; usage: number; available: number }> = [];
  private cleanupCallbacks: Array<() => Promise<void>> = [];

  constructor(jobId: string) {
    this.jobId = jobId;
    this.startTime = Date.now();
  }

  async initialize(): Promise<void> {
    // Set up memory monitoring interval
    const monitoringInterval = setInterval(async () => {
      const memoryUsage = process.memoryUsage();
      const snapshot = {
        timestamp: Date.now(),
        usage: memoryUsage.heapUsed,
        available: memoryUsage.heapTotal - memoryUsage.heapUsed
      };
      
      this.memorySnapshots.push(snapshot);
      this.peakMemory = Math.max(this.peakMemory, memoryUsage.heapUsed);
      
      // Keep only last 100 snapshots to prevent memory leak
      if (this.memorySnapshots.length > 100) {
        this.memorySnapshots.shift();
      }
      
      // Check for memory pressure
      await this.checkMemoryPressure(memoryUsage);
    }, 1000); // Monitor every second

    // Add cleanup callback for the monitoring interval
    this.addCleanupCallback(async () => {
      clearInterval(monitoringInterval);
    });
  }

  async allocateMemory(size: number): Promise<boolean> {
    const currentUsage = process.memoryUsage();
    const availableMemory = MEMORY_CONFIG.BASE_MEMORY_LIMIT - currentUsage.heapUsed;
    
    if (size > availableMemory) {
      console.warn(`Memory allocation failed for job ${this.jobId}: requested ${size}, available ${availableMemory}`);
      return false;
    }
    
    this.allocatedMemory += size;
    return true;
  }

  async deallocateMemory(size: number): Promise<void> {
    this.allocatedMemory = Math.max(0, this.allocatedMemory - size);
  }

  async getStatus(): Promise<{
    allocated: number;
    peak: number;
    available: number;
    usagePercentage: number;
    snapshots: typeof this.memorySnapshots;
  }> {
    const currentUsage = process.memoryUsage();
    return {
      allocated: this.allocatedMemory,
      peak: this.peakMemory,
      available: MEMORY_CONFIG.BASE_MEMORY_LIMIT - currentUsage.heapUsed,
      usagePercentage: (currentUsage.heapUsed / MEMORY_CONFIG.BASE_MEMORY_LIMIT) * 100,
      snapshots: this.memorySnapshots.slice(-10) // Last 10 snapshots
    };
  }

  addCleanupCallback(callback: () => Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  async cleanup(): Promise<void> {
    // Execute all cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error(`Cleanup callback failed for job ${this.jobId}:`, error);
      }
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Log final memory stats
    await this.logFinalStats();
  }

  private async checkMemoryPressure(memoryUsage: NodeJS.MemoryUsage): Promise<void> {
    const usagePercentage = memoryUsage.heapUsed / MEMORY_CONFIG.BASE_MEMORY_LIMIT;
    
    if (usagePercentage > MEMORY_CONFIG.EMERGENCY_THRESHOLD) {
      console.error(`EMERGENCY: Memory usage at ${(usagePercentage * 100).toFixed(2)}% for job ${this.jobId}`);
      await this.triggerEmergencyCleanup();
    } else if (usagePercentage > MEMORY_CONFIG.CRITICAL_THRESHOLD) {
      console.warn(`CRITICAL: Memory usage at ${(usagePercentage * 100).toFixed(2)}% for job ${this.jobId}`);
      await this.triggerMemoryOptimization();
    } else if (usagePercentage > MEMORY_CONFIG.WARNING_THRESHOLD) {
      console.warn(`WARNING: Memory usage at ${(usagePercentage * 100).toFixed(2)}% for job ${this.jobId}`);
    }
  }

  private async triggerEmergencyCleanup(): Promise<void> {
    // Implement emergency cleanup procedures
    if (global.gc) {
      global.gc();
    }
    
    // Clear memory snapshots except the last 5
    this.memorySnapshots = this.memorySnapshots.slice(-5);
    
    // Trigger system-wide memory optimization
    await optimizeSystemMemory();
  }

  private async triggerMemoryOptimization(): Promise<void> {
    // Implement memory optimization procedures
    if (global.gc) {
      global.gc();
    }
    
    // Reduce memory snapshots
    this.memorySnapshots = this.memorySnapshots.slice(-20);
  }

  private async logFinalStats(): Promise<void> {
    const duration = Date.now() - this.startTime;
    const finalUsage = process.memoryUsage();
    
    await prisma.memoryLog.create({
      data: {
        jobId: this.jobId,
        allocatedMemory: this.allocatedMemory,
        peakMemory: this.peakMemory,
        finalMemory: finalUsage.heapUsed,
        duration,
        snapshotCount: this.memorySnapshots.length,
        metadata: {
          snapshots: this.memorySnapshots,
          memoryUsage: finalUsage
        }
      }
    }).catch(error => {
      console.error('Failed to log memory stats:', error);
    });
  }
}

/**
 * Enhanced File Upload Handler with Memory Management
 */
class SecureFileUploadHandler {
  private memoryMonitor: MemoryMonitor;
  private uploadId: string;
  private chunks: Buffer[] = [];
  private totalSize: number = 0;

  constructor(memoryMonitor: MemoryMonitor) {
    this.memoryMonitor = memoryMonitor;
    this.uploadId = `upload_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  async handleUpload(request: NextRequest): Promise<{
    success: boolean;
    fileUrl?: string;
    metadata?: any;
    error?: string;
  }> {
    try {
      const contentType = request.headers.get('content-type') || '';
      const contentLength = parseInt(request.headers.get('content-length') || '0');
      
      // Validate file size
      if (contentLength > UPLOAD_CONFIG.MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size ${contentLength} exceeds maximum allowed size ${UPLOAD_CONFIG.MAX_FILE_SIZE}`
        };
      }
      
      // Allocate memory for upload
      const memoryAllocated = await this.memoryMonitor.allocateMemory(contentLength * 1.5); // 1.5x for processing overhead
      if (!memoryAllocated) {
        return {
          success: false,
          error: 'Insufficient memory for file upload'
        };
      }
      
      // Determine processing mode based on file size
      const processingMode = this.determineProcessingMode(contentLength);
      
      let result;
      switch (processingMode) {
        case 'streaming':
          result = await this.handleStreamingUpload(request, contentLength);
          break;
        case 'chunked':
          result = await this.handleChunkedUpload(request, contentLength);
          break;
        default:
          result = await this.handleMemoryUpload(request, contentLength);
      }
      
      return result;
      
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    } finally {
      // Cleanup allocated memory
      await this.memoryMonitor.deallocateMemory(this.totalSize * 1.5);
    }
  }

  private determineProcessingMode(fileSize: number): string {
    if (fileSize > MEMORY_CONFIG.LARGE_IMAGE_THRESHOLD) {
      return UPLOAD_CONFIG.PROCESSING_MODES.streaming;
    } else if (fileSize > MEMORY_CONFIG.MEDIUM_IMAGE_THRESHOLD) {
      return UPLOAD_CONFIG.PROCESSING_MODES.chunked;
    } else {
      return UPLOAD_CONFIG.PROCESSING_MODES.memory;
    }
  }

  private async handleStreamingUpload(request: NextRequest, contentLength: number): Promise<any> {
    // Implement streaming upload for large files
    const reader = request.body?.getReader();
    if (!reader) {
      throw new Error('No request body available');
    }

    const tempFilePath = `/tmp/${this.uploadId}.tmp`;
    const writeStream = require('fs').createWriteStream(tempFilePath);
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        writeStream.write(value);
        this.totalSize += value.length;
        
        // Check memory pressure during streaming
        if (this.totalSize > contentLength * 1.1) { // 10% tolerance
          throw new Error('File size exceeded declared content length');
        }
      }
      
      writeStream.end();
      
      // Process the uploaded file
      const processedUrl = await this.processUploadedFile(tempFilePath, 'streaming');
      
      return {
        success: true,
        fileUrl: processedUrl,
        metadata: {
          uploadId: this.uploadId,
          size: this.totalSize,
          processingMode: 'streaming'
        }
      };
      
    } finally {
      // Cleanup temp file
      require('fs').unlink(tempFilePath, () => {});
    }
  }

  private async handleChunkedUpload(request: NextRequest, contentLength: number): Promise<any> {
    // Implement chunked upload for medium files
    const reader = request.body?.getReader();
    if (!reader) {
      throw new Error('No request body available');
    }

    const chunks: Uint8Array[] = [];
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      this.totalSize += value.length;
      
      // Process chunks in batches to manage memory
      if (chunks.length >= 10) { // Process every 10 chunks
        await this.processChunkBatch(chunks.splice(0, 10));
      }
    }
    
    // Process remaining chunks
    if (chunks.length > 0) {
      await this.processChunkBatch(chunks);
    }
    
    const processedUrl = await this.finalizeChunkedUpload();
    
    return {
      success: true,
      fileUrl: processedUrl,
      metadata: {
        uploadId: this.uploadId,
        size: this.totalSize,
        processingMode: 'chunked'
      }
    };
  }

  private async handleMemoryUpload(request: NextRequest, contentLength: number): Promise<any> {
    // Implement in-memory upload for small files
    const arrayBuffer = await request.arrayBuffer();
    this.totalSize = arrayBuffer.byteLength;
    
    const processedUrl = await this.processUploadedBuffer(arrayBuffer);
    
    return {
      success: true,
      fileUrl: processedUrl,
      metadata: {
        uploadId: this.uploadId,
        size: this.totalSize,
        processingMode: 'memory'
      }
    };
  }

  private async processChunkBatch(chunks: Uint8Array[]): Promise<void> {
    // Process a batch of chunks
    for (const chunk of chunks) {
      this.chunks.push(Buffer.from(chunk));
    }
  }

  private async finalizeChunkedUpload(): Promise<string> {
    // Combine all chunks and process
    const combinedBuffer = Buffer.concat(this.chunks);
    return await this.processUploadedBuffer(combinedBuffer.buffer);
  }

  private async processUploadedFile(filePath: string, mode: string): Promise<string> {
    // Mock implementation - replace with actual file processing
    return `processed://${this.uploadId}_${mode}.jpg`;
  }

  private async processUploadedBuffer(buffer: ArrayBuffer): Promise<string> {
    // Mock implementation - replace with actual buffer processing
    return `processed://${this.uploadId}_memory.jpg`;
  }
}

/**
 * System Memory Management Functions
 */
async function checkMemoryAvailability(): Promise<{
  available: boolean;
  totalMemory: number;
  usedMemory: number;
  availableMemory: number;
  usagePercentage: number;
}> {
  const memoryUsage = process.memoryUsage();
  const totalMemory = MEMORY_CONFIG.BASE_MEMORY_LIMIT;
  const usedMemory = memoryUsage.heapUsed;
  const availableMemory = totalMemory - usedMemory;
  const usagePercentage = (usedMemory / totalMemory) * 100;
  
  return {
    available: usagePercentage < MEMORY_CONFIG.CRITICAL_THRESHOLD * 100,
    totalMemory,
    usedMemory,
    availableMemory,
    usagePercentage
  };
}

async function optimizeSystemMemory(): Promise<void> {
  // Force garbage collection
  if (global.gc) {
    global.gc();
  }
  
  // Clear any global caches
  await clearGlobalCaches();
  
  // Log memory optimization
  console.log('System memory optimization completed');
}

async function clearGlobalCaches(): Promise<void> {
  // Implementation to clear various caches
  // This would clear image caches, processing caches, etc.
}

async function getSystemMetrics(): Promise<{
  memory: NodeJS.MemoryUsage;
  cpu: NodeJS.CpuUsage;
  uptime: number;
  loadAverage: number[];
}> {
  return {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
    loadAverage: require('os').loadavg()
  };
}

/**
 * Enhanced validation with memory considerations
 */
async function validateStudioRequestEnhanced(
  request: StudioRequest,
  memoryMonitor: MemoryMonitor
): Promise<{
  valid: boolean;
  error?: string;
  code?: string;
  metadata?: any;
  memoryRequirement?: number;
}> {
  // Existing validation logic...
  const basicValidation = await validateStudioRequest(request);
  if (!basicValidation.valid) {
    return basicValidation;
  }
  
  // Calculate memory requirement for this request
  const memoryRequirement = calculateMemoryRequirement(request);
  
  // Check if we can allocate the required memory
  const canAllocate = await memoryMonitor.allocateMemory(memoryRequirement);
  if (!canAllocate) {
    return {
      valid: false,
      error: 'Insufficient memory for processing this request',
      code: 'MEMORY_INSUFFICIENT',
      memoryRequirement
    };
  }
  
  return {
    valid: true,
    memoryRequirement
  };
}

function calculateMemoryRequirement(request: StudioRequest): number {
  const baseMemory = MEMORY_CONFIG.PROCESSING_MEMORY[request.options?.quality || 'standard'];
  
  // Add memory for additional features
  let additionalMemory = 0;
  if (request.options?.upscale) additionalMemory += 500 * 1024 * 1024; // 500MB
  if (request.options?.faceEnhancement) additionalMemory += 200 * 1024 * 1024; // 200MB
  if (request.options?.backgroundRemoval) additionalMemory += 300 * 1024 * 1024; // 300MB
  
  return baseMemory + additionalMemory;
}

async function getQueuePosition(jobId: string, priority: QueuePriority) {
  // Mock implementation - replace with actual queue management
  return priority === 'high' ? 1 : priority === 'normal' ? 5 : 10;
}

async function estimateWaitTime(priority: QueuePriority) {
  // Mock implementation - replace with actual wait time estimation
  return priority === 'high' ? 30 : priority === 'normal' ? 120 : 300; // seconds
}

async function reserveResources(jobId: string, allocation: any) {
  // Mock implementation - replace with actual resource reservation
  console.log(`Reserved resources for job ${jobId}:`, allocation);
}

// Additional mock functions for image processing pipeline
async function applyNoiseReduction(urls: string[]) { return urls; }
async function applySharpening(urls: string[], level: string) { return urls; }
async function applyColorCorrection(urls: string[]) { return urls; }
async function applyHDREnhancement(urls: string[]) { return urls; }
async function optimizeImage(url: string, options: any) { 
  return { url, size: 1024000, qualityScore: 0.85 }; 
}
async function getImageDimensions(url: string) { 
  return { width: 1920, height: 1080 }; 
}
async function generateThumbnail(url: string, size: number) { 
  return `${url}_thumb_${size}`; 
}
async function uploadToCloud(url: string, type: string, metadata: any) { 
  return `https://cdn.studionexora.com/${type}/${Date.now()}.webp`; 
}
async function applyWatermark(url: string, options: any) { 
  return url; 
}
async function sendWebSocketNotification(userId: string, notification: any) {
  console.log(`WebSocket notification sent to ${userId}:`, notification);
}
async function deleteTempFile(file: string) {
  console.log(`Deleted temp file: ${file}`);
}
async function removePartialUploads(jobId: string) {
  console.log(`Removed partial uploads for job: ${jobId}`);
}
async function cleanupJobTempFiles(jobId: string) {
  console.log(`Cleaned temp files for job: ${jobId}`);
}
