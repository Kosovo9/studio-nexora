import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// Enhanced Stripe configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
  telemetry: false,
});

// Enhanced rate limiting configuration
const RATE_LIMIT_CHECKOUT = parseInt(process.env.RATE_LIMIT_CHECKOUT || '10');
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000'); // 15 minutes
const RATE_LIMIT_BURST = parseInt(process.env.RATE_LIMIT_BURST || '3'); // Burst limit

// Comprehensive interfaces
interface CheckoutRequest {
  priceId: string;
  planType?: string;
  couponCode?: string;
  billingCycle?: 'monthly' | 'yearly';
  addons?: string[];
  customAmount?: number;
  currency?: string;
  locale?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
  allowPromotionCodes?: boolean;
  collectTaxId?: boolean;
  collectBillingAddress?: boolean;
  paymentMethods?: string[];
  trialDays?: number;
  setupFutureUsage?: 'on_session' | 'off_session';
}

interface CheckoutResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
  code?: string;
  metadata?: {
    requestId: string;
    timestamp: string;
    responseTime: number;
    planDetails?: PlanDetails;
    pricing?: PricingDetails;
    discounts?: DiscountDetails[];
  };
}

interface PlanDetails {
  id: string;
  name: string;
  description: string;
  features: string[];
  limits: Record<string, number>;
  billingCycle: string;
  trialDays?: number;
}

interface PricingDetails {
  baseAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  formattedTotal: string;
}

interface DiscountDetails {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
}

interface RateLimitData {
  count: number;
  burstCount: number;
  resetAt: number;
  burstResetAt: number;
  blocked: boolean;
}

// Enhanced rate limiting store with burst protection
const checkoutRateLimit = new Map<string, RateLimitData>();

// Fraud detection patterns
const FRAUD_PATTERNS = {
  rapidCheckouts: 5, // Max checkouts in 5 minutes
  suspiciousUserAgents: [
    'bot', 'crawler', 'spider', 'scraper', 'automated'
  ],
  blockedCountries: process.env.BLOCKED_COUNTRIES?.split(',') || [],
  maxAmountPerHour: 10000, // $100 per hour limit
};

function checkAdvancedRateLimit(ip: string, userAgent: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const userLimit = checkoutRateLimit.get(ip);

  // Initialize or reset if expired
  if (!userLimit || now > userLimit.resetAt) {
    checkoutRateLimit.set(ip, {
      count: 1,
      burstCount: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
      burstResetAt: now + 300000, // 5 minutes for burst
      blocked: false,
    });
    return { allowed: true };
  }

  // Check if blocked
  if (userLimit.blocked) {
    return { allowed: false, reason: 'IP_BLOCKED' };
  }

  // Check burst limit (short-term)
  if (now <= userLimit.burstResetAt) {
    if (userLimit.burstCount >= RATE_LIMIT_BURST) {
      userLimit.blocked = true;
      return { allowed: false, reason: 'BURST_LIMIT_EXCEEDED' };
    }
    userLimit.burstCount++;
  } else {
    // Reset burst counter
    userLimit.burstCount = 1;
    userLimit.burstResetAt = now + 300000;
  }

  // Check regular limit
  if (userLimit.count >= RATE_LIMIT_CHECKOUT) {
    return { allowed: false, reason: 'RATE_LIMIT_EXCEEDED' };
  }

  // Check for suspicious user agent
  const suspiciousUA = FRAUD_PATTERNS.suspiciousUserAgents.some(pattern =>
    userAgent.toLowerCase().includes(pattern)
  );
  
  if (suspiciousUA) {
    return { allowed: false, reason: 'SUSPICIOUS_USER_AGENT' };
  }

  userLimit.count++;
  return { allowed: true };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Extract request metadata
    const headersList = headers();
    const ip = request.ip || headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    const country = headersList.get('cf-ipcountry') || 'unknown';
    const acceptLanguage = headersList.get('accept-language') || 'en';
    
    // Advanced rate limiting and fraud detection
    const rateLimitCheck = checkAdvancedRateLimit(ip, userAgent);
    if (!rateLimitCheck.allowed) {
      await logSecurityEvent('checkout_rate_limit', {
        ip,
        userAgent,
        reason: rateLimitCheck.reason,
        requestId,
      });
      
      return NextResponse.json({
        success: false,
        error: 'Too many checkout attempts. Please try again later.',
        code: rateLimitCheck.reason,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      }, { status: 429 });
    }

    // Enhanced authentication check
    const { userId } = auth();
    if (!userId) {
      await logSecurityEvent('checkout_unauthorized', {
        ip,
        userAgent,
        requestId,
      });
      
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      }, { status: 401 });
    }

    // Parse and validate request body
    const requestBody: CheckoutRequest = await request.json();
    const {
      priceId,
      planType,
      couponCode,
      billingCycle = 'monthly',
      addons = [],
      customAmount,
      currency = 'usd',
      locale = 'en',
      metadata = {},
      successUrl,
      cancelUrl,
      allowPromotionCodes = true,
      collectTaxId = true,
      collectBillingAddress = true,
      paymentMethods = ['card'],
      trialDays,
      setupFutureUsage,
    } = requestBody;

    // Comprehensive input validation
    const validationResult = await validateCheckoutRequest(requestBody, userId);
    if (!validationResult.valid) {
      return NextResponse.json({
        success: false,
        error: validationResult.error,
        code: validationResult.code,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      }, { status: 400 });
    }

    // Get user information
    const user = await getUserInfo(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      }, { status: 404 });
    }

    // Fraud detection checks
    const fraudCheck = await performFraudDetection({
      userId,
      ip,
      userAgent,
      country,
      priceId,
      customAmount,
      user,
    });
    
    if (fraudCheck.blocked) {
      await logSecurityEvent('checkout_fraud_detected', {
        userId,
        ip,
        reason: fraudCheck.reason,
        riskScore: fraudCheck.riskScore,
        requestId,
      });
      
      return NextResponse.json({
        success: false,
        error: 'Payment cannot be processed at this time',
        code: 'FRAUD_DETECTED',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
      }, { status: 403 });
    }

    // Check for existing active subscription
    const existingSubscription = await checkExistingSubscription(userId);
    if (existingSubscription && !existingSubscription.canUpgrade) {
      return NextResponse.json({
        success: false,
        error: existingSubscription.message,
        code: 'EXISTING_SUBSCRIPTION',
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
          currentPlan: existingSubscription.currentPlan,
        },
      }, { status: 400 });
    }

    // Get or create Stripe customer
    const stripeCustomer = await getOrCreateStripeCustomer(user);

    // Get plan details and pricing
    const planDetails = await getPlanDetails(priceId, planType);
    const pricingDetails = await calculatePricing({
      priceId,
      customAmount,
      couponCode,
      addons,
      currency,
      country,
    });

    // Apply discounts and promotions
    const discounts = await applyDiscounts({
      userId,
      couponCode,
      planDetails,
      isFirstTime: !existingSubscription,
    });

    // Prepare checkout session configuration
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: billingCycle === 'yearly' ? 'subscription' : 'payment',
      payment_method_types: paymentMethods as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      line_items: await buildLineItems({
        priceId,
        customAmount,
        addons,
        planDetails,
        pricingDetails,
      }),
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      customer: stripeCustomer.id,
      customer_email: user.email,
      client_reference_id: userId,
      metadata: {
        userId,
        planType: planDetails.name,
        requestId,
        billingCycle,
        country,
        locale,
        ...metadata,
      },
      allow_promotion_codes: allowPromotionCodes,
      billing_address_collection: collectBillingAddress ? 'required' : 'auto',
      tax_id_collection: {
        enabled: collectTaxId,
      },
      automatic_tax: {
        enabled: true,
      },
      currency_options: {
        [currency]: {
          custom_unit_amount: {
            enabled: !!customAmount,
          },
        },
      },
      locale: locale as Stripe.Checkout.SessionCreateParams.Locale,
      ...(trialDays && {
        subscription_data: {
          trial_period_days: trialDays,
        },
      }),
      ...(setupFutureUsage && {
        payment_intent_data: {
          setup_future_usage: setupFutureUsage,
        },
      }),
    };

    // Apply discounts to session
    if (discounts.length > 0) {
      sessionConfig.discounts = discounts.map(discount => ({
        coupon: discount.code,
      }));
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create(sessionConfig);

    // Create comprehensive checkout log
    await createCheckoutLog({
      userId,
      sessionId: checkoutSession.id,
      priceId,
      planDetails,
      pricingDetails,
      discounts,
      ip,
      userAgent,
      country,
      requestId,
      fraudScore: fraudCheck.riskScore,
      metadata: {
        billingCycle,
        addons,
        customAmount,
        locale,
        paymentMethods,
        trialDays,
      },
    });

    // Track analytics
    await trackCheckoutAnalytics({
      userId,
      sessionId: checkoutSession.id,
      planType: planDetails.name,
      amount: pricingDetails.totalAmount,
      currency,
      country,
      source: 'web',
      requestId,
    });

    // Send notification
    await sendCheckoutNotification(userId, {
      type: 'checkout_initiated',
      sessionId: checkoutSession.id,
      planName: planDetails.name,
      amount: pricingDetails.formattedTotal,
    });

    // Build comprehensive response
    const response: CheckoutResponse = {
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url!,
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        planDetails,
        pricing: pricingDetails,
        discounts,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'X-Request-ID': requestId,
        'X-Response-Time': `${Date.now() - startTime}ms`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Checkout error:', error);
    
    // Track error
    await trackCheckoutError({
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
      userId: auth().userId,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      },
    }, { 
      status: 500,
      headers: {
        'X-Request-ID': requestId,
        'X-Response-Time': `${Date.now() - startTime}ms`,
      },
    });
  }
}

// ==================== COMPREHENSIVE HELPER FUNCTIONS ====================

async function validateCheckoutRequest(request: CheckoutRequest, userId: string) {
  // Validate price ID
  const validPriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_VIP_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE_ID,
  ].filter(Boolean);

  if (!request.priceId || !validPriceIds.includes(request.priceId)) {
    return { valid: false, error: 'Invalid price ID', code: 'INVALID_PRICE_ID' };
  }

  // Validate custom amount if provided
  if (request.customAmount) {
    if (request.customAmount < 100 || request.customAmount > 100000) { // $1 to $1000
      return { valid: false, error: 'Invalid custom amount', code: 'INVALID_AMOUNT' };
    }
  }

  // Validate currency
  const supportedCurrencies = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy'];
  if (request.currency && !supportedCurrencies.includes(request.currency)) {
    return { valid: false, error: 'Unsupported currency', code: 'UNSUPPORTED_CURRENCY' };
  }

  // Validate payment methods
  const supportedPaymentMethods = ['card', 'paypal', 'apple_pay', 'google_pay'];
  if (request.paymentMethods) {
    const invalidMethods = request.paymentMethods.filter(method => 
      !supportedPaymentMethods.includes(method)
    );
    if (invalidMethods.length > 0) {
      return { valid: false, error: 'Unsupported payment method', code: 'UNSUPPORTED_PAYMENT_METHOD' };
    }
  }

  return { valid: true };
}

async function getUserInfo(userId: string) {
  try {
    // Mock user info - replace with actual user lookup
    return {
      id: userId,
      email: `user_${userId}@example.com`,
      name: 'User Name',
      country: 'US',
      createdAt: new Date(),
    };
  } catch (error) {
    return null;
  }
}

async function performFraudDetection(data: any) {
  let riskScore = 0;
  const reasons = [];

  // Check blocked countries
  if (FRAUD_PATTERNS.blockedCountries.includes(data.country)) {
    riskScore += 50;
    reasons.push('blocked_country');
  }

  // Check suspicious user agent
  const suspiciousUA = FRAUD_PATTERNS.suspiciousUserAgents.some(pattern =>
    data.userAgent.toLowerCase().includes(pattern)
  );
  if (suspiciousUA) {
    riskScore += 30;
    reasons.push('suspicious_user_agent');
  }

  // Check amount anomalies
  if (data.customAmount && data.customAmount > 50000) { // $500+
    riskScore += 25;
    reasons.push('high_amount');
  }

  // Check user history
  const userHistory = await getUserPaymentHistory(data.userId);
  if (userHistory.failedPayments > 3) {
    riskScore += 20;
    reasons.push('payment_history');
  }

  // Check IP reputation
  const ipReputation = await checkIPReputation(data.ip);
  if (ipReputation.risk === 'high') {
    riskScore += 40;
    reasons.push('ip_reputation');
  }

  return {
    blocked: riskScore >= 70,
    riskScore,
    reasons,
    reason: reasons.join(', '),
  };
}

async function checkExistingSubscription(userId: string) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'active',
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      canUpgrade: subscription.planType !== 'enterprise',
      message: subscription.planType === 'enterprise' 
        ? 'You already have the highest tier subscription'
        : 'You can upgrade your existing subscription',
      currentPlan: subscription.planType,
    };
  } catch (error) {
    return null;
  }
}

async function getOrCreateStripeCustomer(user: any) {
  try {
    // Check if customer exists
    const existingCustomer = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (existingCustomer.data.length > 0) {
      return existingCustomer.data[0];
    }

    // Create new customer
    return await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    throw new Error(`Failed to create Stripe customer: ${error}`);
  }
}

async function getPlanDetails(priceId: string, planType?: string): Promise<PlanDetails> {
  const plans = {
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ID!]: {
      id: 'basic',
      name: 'Basic',
      description: 'Perfect for individuals',
      features: ['10 images/month', 'Basic AI models', 'Email support'],
      limits: { images: 10, storage: 1000 },
      billingCycle: 'monthly',
    },
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ID!]: {
      id: 'pro',
      name: 'Pro',
      description: 'Great for professionals',
      features: ['100 images/month', 'Advanced AI models', 'Priority support'],
      limits: { images: 100, storage: 10000 },
      billingCycle: 'monthly',
    },
    [process.env.NEXT_PUBLIC_STRIPE_PRICE_VIP_ID!]: {
      id: 'vip',
      name: 'VIP',
      description: 'For power users',
      features: ['Unlimited images', 'All AI models', '24/7 support'],
      limits: { images: -1, storage: -1 },
      billingCycle: 'monthly',
    },
  };

  return plans[priceId] || plans[process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC_ID!];
}

async function calculatePricing(options: any): Promise<PricingDetails> {
  // Get base price from Stripe
  const price = await stripe.prices.retrieve(options.priceId);
  const baseAmount = options.customAmount || price.unit_amount || 0;
  
  // Calculate discounts
  let discountAmount = 0;
  if (options.couponCode) {
    const coupon = await stripe.coupons.retrieve(options.couponCode);
    if (coupon.percent_off) {
      discountAmount = Math.round(baseAmount * (coupon.percent_off / 100));
    } else if (coupon.amount_off) {
      discountAmount = coupon.amount_off;
    }
  }

  // Calculate tax (simplified)
  const taxRate = getTaxRate(options.country);
  const taxableAmount = baseAmount - discountAmount;
  const taxAmount = Math.round(taxableAmount * taxRate);
  
  const totalAmount = baseAmount - discountAmount + taxAmount;

  return {
    baseAmount,
    discountAmount,
    taxAmount,
    totalAmount,
    currency: options.currency || 'usd',
    formattedTotal: formatCurrency(totalAmount, options.currency || 'usd'),
  };
}

async function applyDiscounts(options: any): Promise<DiscountDetails[]> {
  const discounts: DiscountDetails[] = [];

  // Apply coupon code
  if (options.couponCode) {
    try {
      const coupon = await stripe.coupons.retrieve(options.couponCode);
      discounts.push({
        code: options.couponCode,
        type: coupon.percent_off ? 'percentage' : 'fixed',
        value: coupon.percent_off || coupon.amount_off || 0,
        description: coupon.name || 'Discount applied',
      });
    } catch (error) {
      console.error('Invalid coupon code:', error);
    }
  }

  // Apply first-time user discount
  if (options.isFirstTime) {
    discounts.push({
      code: 'FIRST_TIME',
      type: 'percentage',
      value: 10,
      description: 'First-time user discount',
    });
  }

  return discounts;
}

async function buildLineItems(options: any) {
  const lineItems = [
    {
      price: options.priceId,
      quantity: 1,
      ...(options.customAmount && {
        price_data: {
          currency: 'usd',
          product_data: {
            name: options.planDetails.name,
            description: options.planDetails.description,
          },
          unit_amount: options.customAmount,
        },
      }),
    },
  ];

  // Add addon items
  for (const addon of options.addons || []) {
    lineItems.push({
      price: addon,
      quantity: 1,
    });
  }

  return lineItems;
}

// Mock implementations for external services
async function getUserPaymentHistory(userId: string) {
  return { failedPayments: 0, successfulPayments: 5 };
}

async function checkIPReputation(ip: string) {
  return { risk: 'low', score: 10 };
}

function getTaxRate(country: string): number {
  const taxRates: Record<string, number> = {
    'US': 0.08,
    'CA': 0.13,
    'GB': 0.20,
    'DE': 0.19,
    'FR': 0.20,
  };
  return taxRates[country] || 0;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

async function createCheckoutLog(data: any) {
  try {
    await prisma.checkoutLog.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        priceId: data.priceId,
        planType: data.planDetails.name,
        amount: data.pricingDetails.totalAmount,
        currency: data.pricingDetails.currency,
        status: 'created',
        ip: data.ip,
        userAgent: data.userAgent,
        country: data.country,
        requestId: data.requestId,
        fraudScore: data.fraudScore,
        metadata: data.metadata,
      },
    });
  } catch (error) {
    console.error('Checkout log error:', error);
  }
}

async function trackCheckoutAnalytics(data: any) {
  try {
    await prisma.analytics.create({
      data: {
        event: 'checkout_initiated',
        userId: data.userId,
        metadata: data,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

async function sendCheckoutNotification(userId: string, data: any) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: 'Checkout Initiated',
        message: `Your ${data.planName} subscription checkout has been initiated`,
        data,
      },
    });
  } catch (error) {
    console.error('Notification error:', error);
  }
}

async function trackCheckoutError(data: any) {
  try {
    await prisma.analytics.create({
      data: {
        event: 'checkout_error',
        userId: data.userId,
        metadata: data,
      },
    });
  } catch (error) {
    console.error('Error tracking error:', error);
  }
}

async function logSecurityEvent(event: string, data: any) {
  try {
    await prisma.securityLog.create({
      data: {
        event,
        severity: 'medium',
        metadata: data,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Security log error:', error);
  }
}
