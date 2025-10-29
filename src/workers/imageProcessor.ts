import { imageProcessingQueue, updateJobStatus } from '../lib/queue';
import type { ImageProcessingJobData } from '../lib/queue';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { prisma } from '../lib/prisma';

const s3Client = new S3Client({
  region: process.env.STORAGE_REGION || 'auto',
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET!,
  },
});

// Process image job
imageProcessingQueue.process('process-image', async (job) => {
  const data: ImageProcessingJobData = job.data;
  
  try {
    await updateJobStatus(job.id.toString(), 'processing', 0);

    // Download original image
    const response = await fetch(data.imageUrl);
    if (!response.ok) {
      throw new Error('Failed to download image');
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    await updateJobStatus(job.id.toString(), 'processing', 25);

    // Process image with sharp
    let processedBuffer = await sharp(imageBuffer)
      .resize(1920, 1080, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: data.processingOptions.quality || 85,
        progressive: true 
      })
      .toBuffer();

    await updateJobStatus(job.id.toString(), 'processing', 50);

    // Generate thumbnail
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(300, 200, { 
        fit: 'cover' 
      })
      .jpeg({ 
        quality: 70 
      })
      .toBuffer();

    await updateJobStatus(job.id.toString(), 'processing', 75);

    // Upload to S3/R2
    const timestamp = Date.now();
    const processedKey = `processed/${data.userId}/${timestamp}-processed.jpg`;
    const thumbnailKey = `thumbnails/${data.userId}/${timestamp}-thumb.jpg`;

    // Upload processed image
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: processedKey,
      Body: processedBuffer,
      ContentType: 'image/jpeg',
      Metadata: {
        userId: data.userId,
        originalFilename: data.originalFilename,
        imageType: data.imageType,
      },
    }));

    // Upload thumbnail
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
    }));

    // Generate URLs
    const processedUrl = `${process.env.STORAGE_PUBLIC_URL}/${processedKey}`;
    const thumbnailUrl = `${process.env.STORAGE_PUBLIC_URL}/${thumbnailKey}`;

    // Generate unique watermark ID
    const watermarkId = `wm_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    // Save to database
    const processedImage = await prisma.processedImage.create({
      data: {
        userId: data.userId,
        originalUrl: data.imageUrl,
        processedUrl,
        thumbnailUrl,
        imageType: data.imageType,
        status: 'completed',
        watermarkId,
        metadata: {
          originalFilename: data.originalFilename,
          processingOptions: data.processingOptions,
          fileSize: processedBuffer.length,
          dimensions: await sharp(processedBuffer).metadata(),
        },
        processingTime: Date.now() - timestamp,
      },
    });

    await updateJobStatus(job.id.toString(), 'completed', 100, {
      processedImageId: processedImage.id,
      processedUrl,
      thumbnailUrl,
      watermarkId,
    });

    return {
      success: true,
      processedImageId: processedImage.id,
      processedUrl,
      thumbnailUrl,
      watermarkId,
    };

  } catch (error) {
    console.error('Image processing failed:', error);
    await updateJobStatus(job.id.toString(), 'failed', 0, null, error.message);
    throw error;
  }
});

// Handle job events
imageProcessingQueue.on('completed', (job, result) => {
  console.log(`Image processing job ${job.id} completed:`, result);
});

imageProcessingQueue.on('failed', (job, err) => {
  console.error(`Image processing job ${job.id} failed:`, err);
});

imageProcessingQueue.on('stalled', (job) => {
  console.warn(`Image processing job ${job.id} stalled`);
});

export { imageProcessingQueue };