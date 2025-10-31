import { prisma } from './prisma';

export interface LimitsCheck {
  allowed: boolean;
  currentUsage?: number;
  limit?: number;
  reason?: string;
}

/**
 * Check user limits for uploads/storage
 */
export async function checkUserLimits(
  userId: string,
  fileSize: number
): Promise<LimitsCheck> {
  try {
    // Get user's plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    // Basic limits check (can be enhanced based on plan)
    const plan = user.subscription?.plan || 'free';
    const limits = {
      free: { storage: 100 * 1024 * 1024 }, // 100MB
      basic: { storage: 1024 * 1024 * 1024 }, // 1GB
      pro: { storage: 10 * 1024 * 1024 * 1024 }, // 10GB
      vip: { storage: 100 * 1024 * 1024 * 1024 }, // 100GB
    };

    const userLimit = limits[plan as keyof typeof limits] || limits.free;

    // Check current usage (simplified - can be enhanced)
    const currentUsage = 0; // TODO: Calculate from user's files

    if (currentUsage + fileSize > userLimit.storage) {
      return {
        allowed: false,
        currentUsage,
        limit: userLimit.storage,
        reason: 'Storage limit exceeded',
      };
    }

    return {
      allowed: true,
      currentUsage,
      limit: userLimit.storage,
    };
  } catch (error) {
    console.error('Error checking user limits:', error);
    return { allowed: false, reason: 'Error checking limits' };
  }
}

/**
 * Update user usage after upload
 */
export async function updateUserUsage(
  userId: string,
  fileSize: number
): Promise<void> {
  try {
    // TODO: Update user's storage usage in database
    // This is a placeholder implementation
    await prisma.user.update({
      where: { id: userId },
      data: {
        // Update usage field if it exists in schema
      },
    });
  } catch (error) {
    console.error('Error updating user usage:', error);
    // Don't throw - this is non-critical
  }
}

