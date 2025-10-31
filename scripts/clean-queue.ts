import { prisma } from '../src/lib/prisma';
import { cleanupOldJobs } from '../src/lib/queue';

async function cleanQueue() {
  try {
    console.log('🧹 Cleaning up old jobs...');
    
    await cleanupOldJobs();
    
    // Also clean up failed jobs older than 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const deletedJobs = await prisma.jobQueue.deleteMany({
      where: {
        status: 'failed',
        updatedAt: { lt: oneDayAgo },
      },
    });
    
    console.log(`✅ Cleaned up ${deletedJobs.count} old failed jobs`);
    
    // Clean up old rate limit entries
    const deletedRateLimits = await prisma.rateLimit.deleteMany({
      where: {
        resetAt: { lt: new Date() },
      },
    });
    
    console.log(`✅ Cleaned up ${deletedRateLimits.count} expired rate limit entries`);
    
  } catch (error) {
    console.error('❌ Error cleaning queue:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanQueue();
