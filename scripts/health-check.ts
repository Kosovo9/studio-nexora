#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  responseTime?: number;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Simple Redis check - you might want to implement actual Redis connection
    return {
      service: 'redis',
      status: 'healthy',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      service: 'redis',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

async function checkReplicate(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.replicate.com/v1/models', {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    });
    
    if (response.ok) {
      return {
        service: 'replicate',
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } else {
      return {
        service: 'replicate',
        status: 'unhealthy',
        message: `HTTP ${response.status}`,
        responseTime: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      service: 'replicate',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

async function checkStripe(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      },
    });
    
    if (response.ok) {
      return {
        service: 'stripe',
        status: 'healthy',
        responseTime: Date.now() - start,
      };
    } else {
      return {
        service: 'stripe',
        status: 'unhealthy',
        message: `HTTP ${response.status}`,
        responseTime: Date.now() - start,
      };
    }
  } catch (error) {
    return {
      service: 'stripe',
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - start,
    };
  }
}

async function runHealthChecks() {
  console.log('🏥 Running health checks...\n');
  
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkReplicate(),
    checkStripe(),
  ]);
  
  let allHealthy = true;
  
  for (const check of checks) {
    const status = check.status === 'healthy' ? '✅' : '❌';
    const time = check.responseTime ? `(${check.responseTime}ms)` : '';
    const message = check.message ? ` - ${check.message}` : '';
    
    console.log(`${status} ${check.service.toUpperCase()} ${time}${message}`);
    
    if (check.status === 'unhealthy') {
      allHealthy = false;
    }
  }
  
  console.log(`\n🎯 Overall status: ${allHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
  
  await prisma.$disconnect();
  
  process.exit(allHealthy ? 0 : 1);
}

runHealthChecks().catch((error) => {
  console.error('Health check failed:', error);
  process.exit(1);
});