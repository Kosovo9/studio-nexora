/**
 * Clerk Authentication Integration
 * Modern authentication with social logins, MFA, and more
 */

import { auth, currentUser } from '@clerk/nextjs';
import { prisma } from './prisma';

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  const { userId } = auth();
  
  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  
  if (!clerkUser) {
    return null;
  }

  // Sync with database
  let user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
    },
  });

  // Create user if doesn't exist
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        image: clerkUser.imageUrl,
      },
      include: {
        subscription: true,
      },
    });
  }

  return user;
}

/**
 * Require authentication
 * Throws error if user is not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return false;
  }

  return (
    subscription.status === 'active' &&
    new Date(subscription.currentPeriodEnd) > new Date()
  );
}

/**
 * Get user's subscription plan
 */
export async function getUserPlan(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription || subscription.status !== 'active') {
    return 'free';
  }

  return subscription.plan;
}

/**
 * Check if user can process images
 */
export async function canProcessImage(userId: string): Promise<boolean> {
  const plan = await getUserPlan(userId);

  if (plan === 'pro' || plan === 'vip') {
    return true; // Unlimited
  }

  // Check usage for basic/free plan
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.processedImage.count({
    where: {
      userId,
      createdAt: {
        gte: today,
      },
    },
  });

  // Free: 1 per day, Basic: 5 per day
  const limit = plan === 'basic' ? 5 : 1;
  return count < limit;
}

/**
 * Track user activity
 */
export async function trackActivity(
  userId: string,
  event: string,
  metadata?: Record<string, any>
) {
  await prisma.analytics.create({
    data: {
      event,
      userId,
      metadata,
    },
  });
}

/**
 * Webhook handler for Clerk events
 */
export async function handleClerkWebhook(event: any) {
  const { type, data } = event;

  switch (type) {
    case 'user.created':
      await prisma.user.create({
        data: {
          id: data.id,
          email: data.email_addresses[0]?.email_address || '',
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          image: data.image_url,
        },
      });
      break;

    case 'user.updated':
      await prisma.user.update({
        where: { id: data.id },
        data: {
          email: data.email_addresses[0]?.email_address || '',
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          image: data.image_url,
        },
      });
      break;

    case 'user.deleted':
      await prisma.user.delete({
        where: { id: data.id },
      });
      break;
  }
}
