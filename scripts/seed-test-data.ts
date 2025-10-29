import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...');

    // Create test users
    const testUser1 = await prisma.user.upsert({
      where: { email: 'test@nexora.com' },
      update: {},
      create: {
        email: 'test@nexora.com',
        name: 'Test User',
        emailVerified: new Date(),
      },
    });

    const testUser2 = await prisma.user.upsert({
      where: { email: 'pro@nexora.com' },
      update: {},
      create: {
        email: 'pro@nexora.com',
        name: 'Pro User',
        emailVerified: new Date(),
      },
    });

    // Create test subscriptions
    await prisma.subscription.upsert({
      where: { userEmail: 'pro@nexora.com' },
      update: {},
      create: {
        userEmail: 'pro@nexora.com',
        userId: testUser2.id,
        stripeSubscriptionId: 'sub_test_pro',
        status: 'active',
        planType: 'pro',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Create admin settings
    const adminSettings = [
      {
        key: 'site_title',
        value: 'Nexora - AI Photo Enhancement',
        description: 'Main site title',
        category: 'general',
      },
      {
        key: 'hero_title',
        value: 'Transform Your Photos with AI',
        description: 'Hero section title',
        category: 'content',
      },
      {
        key: 'hero_subtitle',
        value: 'Professional photo enhancement powered by artificial intelligence',
        description: 'Hero section subtitle',
        category: 'content',
      },
      {
        key: 'max_file_size',
        value: 10485760, // 10MB
        description: 'Maximum file size for uploads in bytes',
        category: 'system',
      },
      {
        key: 'allowed_file_types',
        value: ['image/jpeg', 'image/png', 'image/webp'],
        description: 'Allowed file types for upload',
        category: 'system',
      },
      {
        key: 'watermark_enabled',
        value: true,
        description: 'Enable watermark on processed images',
        category: 'features',
      },
    ];

    for (const setting of adminSettings) {
      await prisma.adminSettings.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      });
    }

    // Create feature flags
    const featureFlags = [
      {
        name: 'ENABLE_WATERMARK',
        enabled: true,
        description: 'Enable watermark on processed images',
      },
      {
        name: 'ENABLE_GOOGLE_AUTH',
        enabled: true,
        description: 'Enable Google OAuth authentication',
      },
      {
        name: 'ENABLE_BULK_PROCESSING',
        enabled: false,
        description: 'Enable bulk image processing',
      },
      {
        name: 'ENABLE_API_ACCESS',
        enabled: false,
        description: 'Enable API access for developers',
      },
    ];

    for (const flag of featureFlags) {
      await prisma.featureFlag.upsert({
        where: { name: flag.name },
        update: { enabled: flag.enabled },
        create: flag,
      });
    }

    // Create sample processed images
    await prisma.processedImage.create({
      data: {
        userId: testUser1.id,
        originalUrl: 'https://example.com/original1.jpg',
        processedUrl: 'https://example.com/processed1.jpg',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        imageType: 'person',
        status: 'completed',
        watermarkId: 'wm_sample_1',
        metadata: {
          originalFilename: 'sample1.jpg',
          fileSize: 1024000,
          dimensions: { width: 1920, height: 1080 },
        },
        processingTime: 5000,
      },
    });

    console.log('✅ Test data seeded successfully!');
    console.log('\nTest accounts created:');
    console.log('📧 test@nexora.com (Basic user)');
    console.log('📧 pro@nexora.com (Pro user with active subscription)');
    console.log(`📧 ${process.env.ADMIN_EMAIL} (Admin - set in .env)`);

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedTestData();