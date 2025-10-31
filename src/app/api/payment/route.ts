import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@clerk/nextjs';
import { stripe, createPaymentIntent, createCheckoutSession } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import type { PlanType } from '@/types';
import crypto from 'crypto';

// Enhanced interfaces for payment management
interface PaymentRequest {
  plan: PlanType;
  userId?: string;
  email?: string;
  type?: 'intent' | 'checkout' | 'subscription';
  couponCode?: string;
  paymentMethodId?: string;
  billingCycle?: 'monthly' | 'yearly';
  metadata?: Record<string, string>;
}

interface SubscriptionRequest {
  plan: PlanType;
  userId: string;
  email: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethodId?: string;
  couponCode?: string;
  trialDays?: number;
}

interface PaymentResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  clientSecret?: string;
  amount?: number;
  subscriptionId?: string;
  invoiceId?: string;
  error?: string;
  metadata?: {
    planDetails: any;
    discountApplied?: number;
    finalAmount: number;
    currency: string;
    billingCycle?: string;
    nextBillingDate?: string;
  };
}

interface RefundRequest {
  paymentIntentId: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, string>;
}

interface CouponValidation {
  valid: boolean;
  coupon?: any;
  discountAmount?: number;
  discountPercent?: number;
  error?: string;
}

// Configuration constants
const RATE_LIMIT_PAYMENT = 10; // requests per window
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REFUND_DAYS = 30;
const SUPPORTED_CURRENCIES = ['usd', 'eur', 'gbp'];
const PLAN_PRICES = {
  basic: { monthly: 999, yearly: 9999 }, // in cents
  pro: { monthly: 2999, yearly: 29999 },
  vip: { monthly: 9999, yearly: 99999 }
};



export async function POST(request: NextRequest) {
  try {
    // Enhanced authentication and rate limiting
    const { userId: authUserId } = auth();
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || 'unknown';
    
    // Rate limiting check
    const rateLimitResult = await checkPaymentRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many payment requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { 
      plan, 
      userId, 
      email, 
      type = 'intent',
      couponCode,
      paymentMethodId,
      billingCycle = 'monthly',
      metadata = {}
    }: PaymentRequest = body;

    // Enhanced validation
    const validationResult = await validatePaymentRequest({
      plan,
      userId: userId || authUserId,
      email,
      type,
      couponCode,
      paymentMethodId,
      billingCycle,
      metadata
    });

    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, error: validationResult.error },
        { status: 400 }
      );
    }

    const finalUserId = userId || authUserId;
    if (!finalUserId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check user limits and existing subscriptions
    const userLimits = await checkUserPaymentLimits(finalUserId);
    if (!userLimits.allowed) {
      return NextResponse.json(
        { success: false, error: userLimits.error },
        { status: 403 }
      );
    }

    // Validate and apply coupon if provided
    let couponValidation: CouponValidation = { valid: true };
    if (couponCode) {
      couponValidation = await validateCoupon(couponCode, plan, finalUserId);
      if (!couponValidation.valid) {
        return NextResponse.json(
          { success: false, error: couponValidation.error },
          { status: 400 }
        );
      }
    }

    // Calculate final amount with discounts
    const pricing = calculatePricing(plan, billingCycle, couponValidation);

    // Handle different payment types
    let response: PaymentResponse;

    switch (type) {
      case 'checkout':
        response = await handleCheckoutSession({
          plan,
          userId: finalUserId,
          email: email!,
          billingCycle,
          couponCode,
          pricing,
          metadata
        });
        break;

      case 'subscription':
        response = await handleSubscriptionCreation({
          plan,
          userId: finalUserId,
          email: email!,
          billingCycle,
          paymentMethodId,
          couponCode,
          pricing,
          metadata
        });
        break;

      case 'intent':
      default:
        response = await handlePaymentIntent({
          plan,
          userId: finalUserId,
          billingCycle,
          couponCode,
          pricing,
          metadata
        });
        break;
    }

    // Track payment analytics
    await trackPaymentAnalytics({
      userId: finalUserId,
      plan,
      type,
      amount: pricing.finalAmount,
      billingCycle,
      couponUsed: !!couponCode,
      ip,
      userAgent: headersList.get('user-agent') || 'unknown'
    });

    // Create audit log
    await createPaymentAuditLog({
      userId: finalUserId,
      action: `payment_${type}_created`,
      details: {
        plan,
        amount: pricing.finalAmount,
        billingCycle,
        couponCode,
        ip
      }
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Payment API error:', error);
    
    // Log payment error
    await logPaymentError({
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: 'POST /api/payment',
      body: await request.json().catch(() => ({})),
      ip: headers().get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const endpoint = searchParams.get('endpoint');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    // Route to specific handler based on endpoint parameter
    switch (endpoint) {
      case 'payments':
        return handleGetPayments(request, userId);
      case 'subscriptions':
        return handleGetSubscriptions(request, userId);
      case 'invoices':
        return handleGetInvoices(request, userId);
      case 'payment-methods':
        return handleGetPaymentMethods(request, userId);
      case 'billing-history':
        return handleGetBillingHistory(request, userId);
      case 'usage-stats':
        return handleGetUsageStats(request, userId);
      case 'coupons':
        return handleGetAvailableCoupons(request, userId);
      default:
        // Default to payments for backward compatibility
        return handleGetPayments(request, userId);
    }
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// GET endpoint handlers
async function handleGetPayments(request: NextRequest, userId: string) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
  const status = searchParams.get('status');
  const plan = searchParams.get('plan');

  const where: any = { userId };
  if (status) where.status = status;
  if (plan) where.plan = plan;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true }
        }
      }
    }),
    prisma.payment.count({ where })
  ]);

  return NextResponse.json({
    success: true,
    payments,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

async function handleGetSubscriptions(request: NextRequest, userId: string) {
  const subscriptions = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  // Enrich with Stripe data
  const enrichedSubscriptions = await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
        return {
          ...sub,
          stripeData: {
            status: stripeSubscription.status,
            currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
            canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null
          }
        };
      } catch (error) {
        return sub;
      }
    })
  );

  return NextResponse.json({
    success: true,
    subscriptions: enrichedSubscriptions
  });
}

async function handleGetInvoices(request: NextRequest, userId: string) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

  // Get user's Stripe customer ID
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    select: { stripeCustomerId: true }
  });

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({
      success: true,
      invoices: []
    });
  }

  const invoices = await stripe.invoices.list({
    customer: subscription.stripeCustomerId,
    limit
  });

  return NextResponse.json({
    success: true,
    invoices: invoices.data
  });
}

async function handleGetPaymentMethods(request: NextRequest, userId: string) {
  // Get user's Stripe customer ID
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    select: { stripeCustomerId: true }
  });

  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({
      success: true,
      paymentMethods: []
    });
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: subscription.stripeCustomerId,
    type: 'card'
  });

  return NextResponse.json({
    success: true,
    paymentMethods: paymentMethods.data
  });
}

async function handleGetBillingHistory(request: NextRequest, userId: string) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  const [payments, subscriptions] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  // Combine and sort by date
  const billingHistory = [
    ...payments.map(p => ({ ...p, type: 'payment' })),
    ...subscriptions.map(s => ({ ...s, type: 'subscription' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    success: true,
    billingHistory: billingHistory.slice(0, limit),
    pagination: {
      page,
      limit,
      total: billingHistory.length
    }
  });
}

async function handleGetUsageStats(request: NextRequest, userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalSpent,
    monthlySpent,
    paymentCount,
    activeSubscriptions,
    lastPayment
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { userId, status: 'succeeded' },
      _sum: { amount: true }
    }),
    prisma.payment.aggregate({
      where: { 
        userId, 
        status: 'succeeded',
        createdAt: { gte: startOfMonth }
      },
      _sum: { amount: true }
    }),
    prisma.payment.count({
      where: { userId, status: 'succeeded' }
    }),
    prisma.subscription.count({
      where: { userId, status: 'active' }
    }),
    prisma.payment.findFirst({
      where: { userId, status: 'succeeded' },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return NextResponse.json({
    success: true,
    usage: {
      totalSpent: totalSpent._sum.amount || 0,
      monthlySpent: monthlySpent._sum.amount || 0,
      paymentCount,
      activeSubscriptions,
      lastPayment: lastPayment?.createdAt || null,
      currency: 'usd'
    }
  });
}

async function handleGetAvailableCoupons(request: NextRequest, userId: string) {
  // Get user's used coupons
  const usedCoupons = await prisma.couponUsage.findMany({
    where: { userId },
    select: { couponCode: true }
  });

  const usedCouponCodes = usedCoupons.map(c => c.couponCode);

  // Mock available coupons (in real app, this would come from your coupon system)
  const availableCoupons = [
    {
      code: 'WELCOME10',
      description: '10% off your first subscription',
      discountPercent: 10,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      used: usedCouponCodes.includes('WELCOME10')
    },
    {
      code: 'SAVE20',
      description: '$20 off any annual plan',
      discountAmount: 2000,
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      used: usedCouponCodes.includes('SAVE20')
    }
  ].filter(coupon => !coupon.used);

  return NextResponse.json({
    success: true,
    coupons: availableCoupons
  });
}

// PUT endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'update-subscription':
        return handleUpdateSubscription(userId, body);
      case 'cancel-subscription':
        return handleCancelSubscription(userId, body);
      case 'update-payment-method':
        return handleUpdatePaymentMethod(userId, body);
      case 'apply-coupon':
        return handleApplyCoupon(userId, body);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('PUT payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// DELETE endpoint
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'refund-payment':
        return handleRefundPayment(userId, body);
      case 'cancel-payment-intent':
        return handleCancelPaymentIntent(userId, body);
      case 'remove-payment-method':
        return handleRemovePaymentMethod(userId, body);
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('DELETE payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// PUT endpoint handlers
async function handleUpdateSubscription(userId: string, body: any) {
  const { subscriptionId, newPlan, billingCycle } = body;

  if (!subscriptionId || !newPlan) {
    return NextResponse.json(
      { success: false, error: 'Subscription ID and new plan required' },
      { status: 400 }
    );
  }

  // Verify subscription belongs to user
  const subscription = await prisma.subscription.findFirst({
    where: { userId, stripeSubscriptionId: subscriptionId }
  });

  if (!subscription) {
    return NextResponse.json(
      { success: false, error: 'Subscription not found' },
      { status: 404 }
    );
  }

  // Update subscription in Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Update the subscription
  await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: stripeSubscription.items.data[0].id,
      price: newPlan
    }],
    proration_behavior: 'create_prorations'
  });

  // Update in database
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      plan: newPlan,
      billingCycle: billingCycle || subscription.billingCycle
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Subscription updated successfully'
  });
}

async function handleCancelSubscription(userId: string, body: any) {
  const { subscriptionId, cancelAtPeriodEnd = true, reason } = body;

  if (!subscriptionId) {
    return NextResponse.json(
      { success: false, error: 'Subscription ID required' },
      { status: 400 }
    );
  }

  // Verify subscription belongs to user
  const subscription = await prisma.subscription.findFirst({
    where: { userId, stripeSubscriptionId: subscriptionId }
  });

  if (!subscription) {
    return NextResponse.json(
      { success: false, error: 'Subscription not found' },
      { status: 404 }
    );
  }

  // Cancel subscription in Stripe
  if (cancelAtPeriodEnd) {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: { cancellation_reason: reason || 'user_requested' }
    });
  } else {
    await stripe.subscriptions.cancel(subscriptionId);
  }

  // Update in database
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: cancelAtPeriodEnd ? 'cancel_at_period_end' : 'canceled',
      canceledAt: cancelAtPeriodEnd ? null : new Date(),
      cancellationReason: reason
    }
  });

  return NextResponse.json({
    success: true,
    message: cancelAtPeriodEnd 
      ? 'Subscription will be canceled at the end of the current period'
      : 'Subscription canceled immediately'
  });
}

async function handleUpdatePaymentMethod(userId: string, body: any) {
  const { subscriptionId, paymentMethodId } = body;

  if (!subscriptionId || !paymentMethodId) {
    return NextResponse.json(
      { success: false, error: 'Subscription ID and payment method ID required' },
      { status: 400 }
    );
  }

  // Verify subscription belongs to user
  const subscription = await prisma.subscription.findFirst({
    where: { userId, stripeSubscriptionId: subscriptionId }
  });

  if (!subscription) {
    return NextResponse.json(
      { success: false, error: 'Subscription not found' },
      { status: 404 }
    );
  }

  // Update payment method in Stripe
  await stripe.subscriptions.update(subscriptionId, {
    default_payment_method: paymentMethodId
  });

  return NextResponse.json({
    success: true,
    message: 'Payment method updated successfully'
  });
}

async function handleApplyCoupon(userId: string, body: any) {
  const { subscriptionId, couponCode } = body;

  if (!subscriptionId || !couponCode) {
    return NextResponse.json(
      { success: false, error: 'Subscription ID and coupon code required' },
      { status: 400 }
    );
  }

  // Apply coupon to subscription
  await stripe.subscriptions.update(subscriptionId, {
    coupon: couponCode
  });

  // Record coupon usage
  await prisma.couponUsage.create({
    data: {
      userId,
      couponCode,
      subscriptionId,
      discountAmount: 0
    }
  });

  return NextResponse.json({
    success: true,
    message: 'Coupon applied successfully'
  });
}

// DELETE endpoint handlers
async function handleRefundPayment(userId: string, body: any) {
  const { paymentIntentId, amount, reason = 'requested_by_customer' } = body;

  if (!paymentIntentId) {
    return NextResponse.json(
      { success: false, error: 'Payment intent ID required' },
      { status: 400 }
    );
  }

  // Verify payment belongs to user
  const payment = await prisma.payment.findFirst({
    where: { userId, stripePaymentIntentId: paymentIntentId }
  });

  if (!payment) {
    return NextResponse.json(
      { success: false, error: 'Payment not found' },
      { status: 404 }
    );
  }

  // Create refund in Stripe
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount || payment.amount,
    reason
  });

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'refunded',
      refundedAt: new Date(),
      refundAmount: refund.amount,
      refundReason: reason
    }
  });

  return NextResponse.json({
    success: true,
    refund: {
      id: refund.id,
      amount: refund.amount,
      status: refund.status
    }
  });
}

async function handleCancelPaymentIntent(userId: string, body: any) {
  const { paymentIntentId } = body;

  if (!paymentIntentId) {
    return NextResponse.json(
      { success: false, error: 'Payment intent ID required' },
      { status: 400 }
    );
  }

  // Verify payment belongs to user
  const payment = await prisma.payment.findFirst({
    where: { userId, stripePaymentIntentId: paymentIntentId }
  });

  if (!payment) {
    return NextResponse.json(
      { success: false, error: 'Payment not found' },
      { status: 404 }
    );
  }

  // Cancel payment intent in Stripe
  await stripe.paymentIntents.cancel(paymentIntentId);

  // Update payment status
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'canceled' }
  });

  return NextResponse.json({
    success: true,
    message: 'Payment intent canceled successfully'
  });
}

async function handleRemovePaymentMethod(userId: string, body: any) {
  const { paymentMethodId } = body;

  if (!paymentMethodId) {
    return NextResponse.json(
      { success: false, error: 'Payment method ID required' },
      { status: 400 }
    );
  }

  // Detach payment method from customer
  await stripe.paymentMethods.detach(paymentMethodId);

  return NextResponse.json({
    success: true,
    message: 'Payment method removed successfully'
  });
}

// Rate limiting constants (already defined at top of file - lines 68-76)
// Removed duplicate definitions

// Types
interface PaymentRequest {
  plan: PlanType;
  userId?: string;
  email?: string;
  type?: 'intent' | 'checkout' | 'subscription';
  billingCycle?: 'monthly' | 'yearly';
  paymentMethodId?: string;
  couponCode?: string;
}

interface PaymentResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  clientSecret?: string;
  amount?: number;
  subscriptionId?: string;
  invoiceId?: string;
  metadata?: any;
  error?: string;
}

interface CouponValidation {
  valid: boolean;
  error?: string;
  coupon?: any;
  discountAmount?: number;
  discountPercent?: number;
}



// Helper Functions

// Rate limiting for payment endpoints
async function checkPaymentRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Simple in-memory rate limiting
  const key = `payment_${ip}`;
  const now = Date.now();
  
  if (!global.paymentRateLimitStore) {
    global.paymentRateLimitStore = new Map<string, { count: number; resetTime: number }>();
  }
  
  const limit = global.paymentRateLimitStore.get(key);

  if (!limit || now > limit.resetTime) {
    global.paymentRateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true };
  }

  if (limit.count >= RATE_LIMIT_PAYMENT) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((limit.resetTime - now) / 1000) 
    };
  }

  limit.count++;
  return { allowed: true };
}

declare global {
  var paymentRateLimitStore: Map<string, { count: number; resetTime: number }> | undefined;
}

// Validate payment request
async function validatePaymentRequest(request: PaymentRequest): Promise<{ valid: boolean; error?: string }> {
  const { plan, userId, email, type, billingCycle, paymentMethodId } = request;

  // Validate plan
  if (!plan || !['basic', 'pro', 'vip'].includes(plan)) {
    return { valid: false, error: 'Invalid plan selected' };
  }

  // Validate billing cycle
  if (!['monthly', 'yearly'].includes(billingCycle || 'monthly')) {
    return { valid: false, error: 'Invalid billing cycle' };
  }

  // Type-specific validations
  if (type === 'checkout' || type === 'subscription') {
    if (!userId || !email) {
      return { valid: false, error: 'User ID and email required for checkout/subscription' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }
  }

  if (type === 'subscription' && !paymentMethodId) {
    return { valid: false, error: 'Payment method required for subscription' };
  }

  return { valid: true };
}

// Check user payment limits
async function checkUserPaymentLimits(userId: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    // Check for existing active subscriptions
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active'
      }
    });

    // Check recent failed payments
    const recentFailedPayments = await prisma.payment.count({
      where: {
        userId,
        status: 'failed',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (recentFailedPayments >= 5) {
      return { 
        allowed: false, 
        error: 'Too many failed payment attempts. Please contact support.' 
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking user payment limits:', error);
    return { allowed: true }; // Allow on error to not block legitimate users
  }
}

// Validate coupon
async function validateCoupon(couponCode: string, plan: PlanType, userId: string): Promise<CouponValidation> {
  try {
    // Check with Stripe
    const coupon = await stripe.coupons.retrieve(couponCode);
    
    if (!coupon.valid) {
      return { valid: false, error: 'Coupon is no longer valid' };
    }

    // Check if user has already used this coupon
    const existingUsage = await prisma.couponUsage.findFirst({
      where: {
        userId,
        couponCode
      }
    });

    if (existingUsage) {
      return { valid: false, error: 'Coupon has already been used' };
    }

    // Calculate discount
    const basePrice = PLAN_PRICES[plan].monthly;
    let discountAmount = 0;
    let discountPercent = 0;

    if (coupon.amount_off) {
      discountAmount = coupon.amount_off;
    } else if (coupon.percent_off) {
      discountPercent = coupon.percent_off;
      discountAmount = Math.round((basePrice * coupon.percent_off) / 100);
    }

    return {
      valid: true,
      coupon,
      discountAmount,
      discountPercent
    };
  } catch (error) {
    return { valid: false, error: 'Invalid coupon code' };
  }
}

// Calculate pricing with discounts
function calculatePricing(plan: PlanType, billingCycle: 'monthly' | 'yearly', couponValidation: CouponValidation) {
  const baseAmount = PLAN_PRICES[plan][billingCycle];
  let finalAmount = baseAmount;
  let discountApplied = 0;

  if (couponValidation.valid && couponValidation.discountAmount) {
    discountApplied = couponValidation.discountAmount;
    finalAmount = Math.max(0, baseAmount - discountApplied);
  }

  return {
    baseAmount,
    discountApplied,
    finalAmount,
    currency: 'usd'
  };
}

// Handle checkout session creation
async function handleCheckoutSession(params: {
  plan: PlanType;
  userId: string;
  email: string;
  billingCycle: 'monthly' | 'yearly';
  couponCode?: string;
  pricing: any;
  metadata: Record<string, string>;
}): Promise<PaymentResponse> {
  const { plan, userId, email, billingCycle, couponCode, pricing, metadata } = params;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const sessionParams: any = {
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
          description: `${billingCycle} subscription to ${plan} plan`
        },
        unit_amount: pricing.finalAmount,
        recurring: billingCycle === 'monthly' ? { interval: 'month' } : { interval: 'year' }
      },
      quantity: 1
    }],
    mode: 'subscription',
    success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/cancel`,
    customer_email: email,
    metadata: {
      userId,
      plan,
      billingCycle,
      ...metadata
    }
  };

  if (couponCode) {
    sessionParams.discounts = [{ coupon: couponCode }];
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  // Create pending payment record
  await prisma.payment.create({
    data: {
      userId,
      stripePaymentIntentId: session.id,
      amount: pricing.finalAmount,
      currency: 'usd',
      status: 'pending',
      plan,
      billingCycle,
      metadata: JSON.stringify(metadata)
    }
  });

  return {
    success: true,
    sessionId: session.id,
    url: session.url!,
    metadata: {
      planDetails: { plan, billingCycle },
      discountApplied: pricing.discountApplied,
      finalAmount: pricing.finalAmount,
      currency: 'usd',
      billingCycle
    }
  };
}

// Handle subscription creation
async function handleSubscriptionCreation(params: {
  plan: PlanType;
  userId: string;
  email: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethodId?: string;
  couponCode?: string;
  pricing: any;
  metadata: Record<string, string>;
}): Promise<PaymentResponse> {
  const { plan, userId, email, billingCycle, paymentMethodId, couponCode, pricing, metadata } = params;

  // Create or retrieve customer
  let customer;
  try {
    const existingCustomer = await stripe.customers.list({
      email,
      limit: 1
    });
    
    if (existingCustomer.data.length > 0) {
      customer = existingCustomer.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        metadata: { userId }
      });
    }
  } catch (error) {
    throw new Error('Failed to create customer');
  }

  // Create price for the plan
  const price = await stripe.prices.create({
    unit_amount: pricing.finalAmount,
    currency: 'usd',
    recurring: { interval: billingCycle === 'monthly' ? 'month' : 'year' },
    product_data: {
      name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`
    }
  });

  // Create subscription
  const subscriptionParams: any = {
    customer: customer.id,
    items: [{ price: price.id }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      userId,
      plan,
      billingCycle,
      ...metadata
    }
  };

  if (paymentMethodId) {
    subscriptionParams.default_payment_method = paymentMethodId;
  }

  if (couponCode) {
    subscriptionParams.coupon = couponCode;
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams);

  // Create subscription record in database
  await prisma.subscription.create({
    data: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customer.id,
      plan,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      billingCycle,
      metadata: JSON.stringify(metadata)
    }
  });

  const invoice = subscription.latest_invoice as any;
  const paymentIntent = invoice?.payment_intent;

  return {
    success: true,
    subscriptionId: subscription.id,
    clientSecret: paymentIntent?.client_secret,
    invoiceId: invoice?.id,
    metadata: {
      planDetails: { plan, billingCycle },
      discountApplied: pricing.discountApplied,
      finalAmount: pricing.finalAmount,
      currency: 'usd',
      billingCycle,
      nextBillingDate: new Date(subscription.current_period_end * 1000).toISOString()
    }
  };
}

// Handle payment intent creation
async function handlePaymentIntent(params: {
  plan: PlanType;
  userId: string;
  billingCycle: 'monthly' | 'yearly';
  couponCode?: string;
  pricing: any;
  metadata: Record<string, string>;
}): Promise<PaymentResponse> {
  const { plan, userId, billingCycle, pricing, metadata } = params;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: pricing.finalAmount,
    currency: 'usd',
    metadata: {
      userId,
      plan,
      billingCycle,
      ...metadata
    }
  });

  // Create payment record
  await prisma.payment.create({
    data: {
      userId,
      stripePaymentIntentId: paymentIntent.id,
      amount: pricing.finalAmount,
      currency: 'usd',
      status: 'pending',
      plan,
      billingCycle,
      metadata: JSON.stringify(metadata)
    }
  });

  return {
    success: true,
    clientSecret: paymentIntent.client_secret!,
    amount: paymentIntent.amount,
    metadata: {
      planDetails: { plan, billingCycle },
      discountApplied: pricing.discountApplied,
      finalAmount: pricing.finalAmount,
      currency: 'usd',
      billingCycle
    }
  };
}




