import Queue from 'bull';
import { prisma } from './prisma';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
};

// Create job queues
export const imageProcessingQueue = new Queue('image processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const watermarkQueue = new Queue('watermark generation', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

// Job types
export interface ImageProcessingJobData {
  userId: string;
  userEmail: string;
  imageUrl: string;
  imageType: 'person' | 'person-pet';
  originalFilename: string;
  processingOptions: {
    quality: number;
    format: string;
    watermark: boolean;
  };
}

export interface WatermarkJobData {
  imageId: string;
  imageUrl: string;
  watermarkText: string;
  position: 'bottom-right' | 'bottom-left' | 'center';
  opacity: number;
}

// Add job to queue with database logging
export async function addImageProcessingJob(data: ImageProcessingJobData, priority: number = 0) {
  const job = await imageProcessingQueue.add('process-image', data, {
    priority,
    delay: 0,
  });

  // Log job in database
  await prisma.job.create({
    data: {
      id: job.id.toString(),
      userId: data.userId,
      type: 'image_processing',
      status: 'queued',
      input: data as any,
    },
  });

  return job;
}

export async function addWatermarkJob(data: WatermarkJobData, priority: number = 0) {
  const job = await watermarkQueue.add('add-watermark', data, {
    priority,
    delay: 0,
  });

  // Log job in database
  await prisma.job.create({
    data: {
      id: job.id.toString(),
      userId: data.imageId, // Use imageId as userId for watermark jobs
      type: 'watermark_generation',
      status: 'queued',
      input: data as any,
    },
  });

  return job;
}

// Update job status in database
export async function updateJobStatus(
  jobId: string,
  status: string,
  progress?: number,
  result?: any,
  error?: string
) {
  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (progress !== undefined) {
    updateData.progress = progress;
  }

  if (result) {
    updateData.result = result;
  }

  if (error) {
    updateData.error = error;
  }

  if (status === 'processing') {
    updateData.startedAt = new Date();
  }

  if (status === 'completed' || status === 'failed') {
    updateData.completedAt = new Date();
  }

  await prisma.job.update({
    where: { id: jobId },
    data: updateData,
  });
}

// Get job status
export async function getJobStatus(jobId: string) {
  return await prisma.job.findUnique({
    where: { id: jobId },
  });
}

// Clean up old completed jobs
export async function cleanupOldJobs() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  await prisma.job.deleteMany({
    where: {
      status: { in: ['completed', 'failed'] },
      completedAt: { lt: oneWeekAgo },
    },
  });
}
