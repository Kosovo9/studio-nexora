import { NextRequest, NextResponse } from 'next/server';
import { processImagePipeline } from '@/lib/replicate';
import { prisma } from '@/lib/prisma';
import type { ImageType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, imageType, userId } = body;

    // Validate input
    if (!imageUrl || !imageType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['person', 'person-pet'].includes(imageType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid image type' },
        { status: 400 }
      );
    }

    // Start processing
    const startTime = Date.now();

    // Create database record
    const imageRecord = await prisma.processedImage.create({
      data: {
        userId: userId || 'guest',
        originalUrl: imageUrl,
        processedUrl: '',
        imageType: imageType as ImageType,
        status: 'processing',
        watermarkId: `wm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
    });

    try {
      // Process image with AI pipeline
      const processedUrls = await processImagePipeline(imageUrl, imageType as ImageType);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Update database record
      await prisma.processedImage.update({
        where: { id: imageRecord.id },
        data: {
          processedUrl: processedUrls[0],
          thumbnailUrl: processedUrls[0],
          status: 'completed',
          processingTime,
          metadata: {
            urls: processedUrls,
            count: processedUrls.length,
          },
        },
      });

      // Track analytics
      await prisma.analytics.create({
        data: {
          event: 'image_processed',
          userId: userId || null,
          metadata: {
            imageType,
            processingTime,
            success: true,
          },
        },
      });

      return NextResponse.json({
        success: true,
        id: imageRecord.id,
        processedUrls,
        watermarkId: imageRecord.watermarkId,
        processingTime,
      });
    } catch (processingError) {
      // Update record with error status
      await prisma.processedImage.update({
        where: { id: imageRecord.id },
        data: {
          status: 'failed',
        },
      });

      throw processingError;
    }
  } catch (error) {
    console.error('Studio API error:', error);

    // Track error in analytics
    try {
      await prisma.analytics.create({
        data: {
          event: 'image_processing_error',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        },
      });
    } catch (analyticsError) {
      console.error('Analytics error:', analyticsError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process image',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const images = await prisma.processedImage.findMany({
      where: {
        userId,
        status: 'completed',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error('Get images error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
