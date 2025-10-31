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

// Configuration Constants
const VALID_IMAGE_TYPES = ['person', 'person-pet', 'object', 'landscape', 'custom', 'soloMe', 'meAndPet'];
const VALID_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
const VALID_QUALITIES = ['standard', 'high', 'ultra', 'maximum'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_DIMENSION = 8192; // 8K resolution
const MAX_QUEUE_SIZE = 10000;
const MAX_CONCURRENT_JOBS = 100;
const RATE_LIMIT_STUDIO = 500;
const RATE_LIMIT_WINDOW = 3600000; // 1 hour
const DEFAULT_PROCESSING_TIME = 120000; // 2 minutes
const PRIORITY_MULTIPLIERS = { low: 1.5, normal: 1.0, high: 0.5 };

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
  metadata?: Record<string, any>;
  webhookUrl?: string;
  tags?: string[];
  customPrompt?: string;
  batchId?: string;
}

interface StudioRequest {
  imageUrl: string;
  imageType: ImageType;
  settings: ProcessingSettings;
  priority: QueuePriority;
  userId?: string;
  turnstileToken?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Rate limiting
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    
    const { success: rateLimitSuccess } = await ratelimit.limit(ip);
    if (!rateLimitSuccess) {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED'
      }, { status: 429 });
    }

    // Authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { imageUrl, imageType, settings = {}, priority = 'normal', turnstileToken } = body;

    // Validate required fields
    if (!imageUrl || !imageType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: imageUrl and imageType',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    // Validate image type
    if (!VALID_IMAGE_TYPES.includes(imageType)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid image type',
        code: 'INVALID_IMAGE_TYPE'
      }, { status: 400 });
    }

    // Validate Turnstile token
    if (turnstileToken) {
      const turnstileValid = await validateTurnstile(turnstileToken);
      if (!turnstileValid) {
        return NextResponse.json({
          success: false,
          error: 'Invalid security token',
          code: 'INVALID_TURNSTILE'
        }, { status: 400 });
      }
    }

    // Check user limits
    const limitsCheck = await checkUserLimits(userId);
    if (!limitsCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: limitsCheck.reason,
        code: 'LIMIT_EXCEEDED'
      }, { status: 429 });
    }

    // Validate image URL
    const imageValidation = await validateImageUrl(imageUrl);
    if (!imageValidation.valid) {
      return NextResponse.json({
        success: false,
        error: imageValidation.error,
        code: 'INVALID_IMAGE_URL'
      }, { status: 400 });
    }

    // Generate job ID
    const jobId = generateSecureId();

    // Create processing job
    const job = await prisma.processingJob.create({
      data: {
        id: jobId,
        userId,
        imageUrl,
        imageType,
        settings: JSON.stringify(settings),
        priority,
        status: 'queued',
        createdAt: new Date(),
      }
    });

    // Start background processing
    processImageInBackground(jobId, {
      imageUrl,
      imageType,
      settings,
      priority,
      userId,
      turnstileToken
    }).catch(console.error);

    // Track analytics
    await trackAnalytics('studio_job_created', {
      userId,
      imageType,
      priority,
      jobId
    });

    // Update user usage
    await updateUserUsage(userId, PROCESSING_COSTS[settings.quality || 'standard'] || 1);

    const response = {
      success: true,
      jobId,
      status: 'queued',
      estimatedTime: DEFAULT_PROCESSING_TIME,
      message: 'Image processing started successfully'
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Processing-Time': `${Date.now() - startTime}ms`
      }
    });

  } catch (error) {
    console.error('Studio API Error:', error);
    
    await trackAnalytics('studio_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: auth().userId
    });

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

// Background processing function
async function processImageInBackground(jobId: string, studioRequest: StudioRequest) {
  try {
    // Update job status
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: 'processing', startedAt: new Date() }
    });

    // Process image using Replicate
    const results = await processImagePipeline({
      imageUrl: studioRequest.imageUrl,
      imageType: studioRequest.imageType,
      settings: studioRequest.settings
    });

    // Upload results to cloud storage
    const uploadedUrls = await Promise.all(
      results.map(url => uploadToCloudinary(url, {
        folder: `studio/${studioRequest.userId}`,
        transformation: { quality: 'auto', format: 'auto' }
      }))
    );

    // Update job with results
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        results: JSON.stringify(uploadedUrls),
        completedAt: new Date()
      }
    });

    // Send notification
    if (studioRequest.userId) {
      await sendNotification(studioRequest.userId, {
        type: 'job_completed',
        jobId,
        results: uploadedUrls
      });
    }

    // Create audit log
    await createAuditLog({
      action: 'studio_job_completed',
      userId: studioRequest.userId,
      jobId,
      metadata: { resultsCount: uploadedUrls.length }
    });

  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    
    // Update job status to failed
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      }
    });

    // Send failure notification
    if (studioRequest.userId) {
      await sendNotification(studioRequest.userId, {
        type: 'job_failed',
        jobId,
        error: error instanceof Error ? error.message : 'Processing failed'
      });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'images':
        return getUserImages(userId, searchParams);
      case 'jobs':
        return getUserJobs(userId, searchParams);
      case 'stats':
        return getUserStats(userId);
      case 'credits':
        return getUserCredits(userId);
      case 'queue':
        return getQueueStatus();
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Studio GET Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

async function getUserImages(userId: string, searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const images = await prisma.processingJob.findMany({
    where: {
      userId,
      status: 'completed'
    },
    orderBy: { completedAt: 'desc' },
    skip,
    take: limit,
    select: {
      id: true,
      imageType: true,
      results: true,
      createdAt: true,
      completedAt: true
    }
  });

  const total = await prisma.processingJob.count({
    where: { userId, status: 'completed' }
  });

  return NextResponse.json({
    success: true,
    images: images.map(img => ({
      ...img,
      results: JSON.parse(img.results || '[]')
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

async function getUserJobs(userId: string, searchParams: URLSearchParams) {
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  const where: any = { userId };
  if (status) where.status = status;

  const jobs = await prisma.processingJob.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit
  });

  const total = await prisma.processingJob.count({ where });

  return NextResponse.json({
    success: true,
    jobs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

async function getUserStats(userId: string) {
  const stats = await prisma.processingJob.groupBy({
    by: ['status'],
    where: { userId },
    _count: { status: true }
  });

  const totalJobs = stats.reduce((sum, stat) => sum + stat._count.status, 0);
  const completedJobs = stats.find(s => s.status === 'completed')?._count.status || 0;
  const failedJobs = stats.find(s => s.status === 'failed')?._count.status || 0;

  return NextResponse.json({
    success: true,
    stats: {
      totalJobs,
      completedJobs,
      failedJobs,
      successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
    }
  });
}

async function getUserCredits(userId: string) {
  // This would integrate with your billing system
  return NextResponse.json({
    success: true,
    credits: {
      available: 100,
      used: 25,
      total: 125
    }
  });
}

async function getQueueStatus() {
  const queueStats = await prisma.processingJob.groupBy({
    by: ['status'],
    _count: { status: true }
  });

  const queued = queueStats.find(s => s.status === 'queued')?._count.status || 0;
  const processing = queueStats.find(s => s.status === 'processing')?._count.status || 0;

  return NextResponse.json({
    success: true,
    queue: {
      queued,
      processing,
      estimatedWaitTime: queued * 30 // 30 seconds per job estimate
    }
  });
}
