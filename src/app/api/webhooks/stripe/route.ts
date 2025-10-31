import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs';
import crypto from 'crypto';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Enhanced webhook event interfaces
interface WebhookEventData {
  id: string;
  type: string;
  data: any;
  metadata: Record<string, any>;
  timestamp: Date;
  source: 'stripe' | 'manual' | 'system';
  processed: boolean;
  retryCount: number;
  processingTime?: number;
  error?: string;
}

interface PaymentEventData {
  userId: string;
  amount: number;
  currency: string;
  planType: string;
  paymentMethod: string;
  country?: string;
  taxAmount?: number;
  discountAmount?: number;
  metadata: Record<string, any>;
}

interface SubscriptionEventData {
  userId: string;
  subscriptionId: string;
  planType: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, any>;
}

interface WebhookAnalytics {
  eventType: string;
  processingTime: number;
  success: boolean;
  retryCount: number;
  errorMessage?: string;
  metadata: Record<string, any>;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const webhookId = `webhook_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  
  try {
    // Extract request metadata
    const headersList = headers();
    const signature = headersList.get('stripe-signature');
    const userAgent = headersList.get('user-agent') || 'unknown';
    const ip = request.ip || headersList.get('x-forwarded-for') || 'unknown';
    
    // Enhanced security validation
    if (!signature) {
      await logWebhookSecurity('missing_signature', {
        ip,
        userAgent,
        webhookId,
      });
      
      return NextResponse.json(
        { 
          error: 'Missing stripe-signature header',
          webhookId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Validate webhook source
    const isValidSource = await validateWebhookSource(ip, userAgent);
    if (!isValidSource) {
      await logWebhookSecurity('invalid_source', {
        ip,
        userAgent,
        webhookId,
      });
      
      return NextResponse.json(
        { 
          error: 'Invalid webhook source',
          webhookId,
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }

    const body = await request.text();
    let event: Stripe.Event;

    // Enhanced signature verification
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      await logWebhookSecurity('signature_verification_failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
        ip,
        userAgent,
        webhookId,
      });
      
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { 
          error: 'Invalid signature',
          webhookId,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check for duplicate events
    const isDuplicate = await checkDuplicateEvent(event.id);
    if (isDuplicate) {
      await logWebhookEvent(event, {
        status: 'duplicate',
        processingTime: Date.now() - startTime,
        webhookId,
      });
      
      return NextResponse.json({ 
        received: true, 
        status: 'duplicate',
        webhookId,
        timestamp: new Date().toISOString(),
      });
    }

    // Log incoming webhook
    await logWebhookEvent(event, {
      status: 'received',
      processingTime: 0,
      webhookId,
      ip,
      userAgent,
    });

    // Enhanced event handling with comprehensive processing
    let processingResult;
    
    switch (event.type) {
      case 'checkout.session.completed':
        processingResult = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, webhookId);
        break;

      case 'checkout.session.expired':
        processingResult = await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session, webhookId);
        break;

      case 'customer.subscription.created':
        processingResult = await handleSubscriptionCreated(event.data.object as Stripe.Subscription, webhookId);
        break;

      case 'customer.subscription.updated':
        processingResult = await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, webhookId);
        break;

      case 'customer.subscription.deleted':
        processingResult = await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, webhookId);
        break;

      case 'customer.subscription.trial_will_end':
        processingResult = await handleTrialWillEnd(event.data.object as Stripe.Subscription, webhookId);
        break;

      case 'invoice.payment_succeeded':
        processingResult = await handlePaymentSucceeded(event.data.object as Stripe.Invoice, webhookId);
        break;

      case 'invoice.payment_failed':
        processingResult = await handlePaymentFailed(event.data.object as Stripe.Invoice, webhookId);
        break;

      case 'invoice.upcoming':
        processingResult = await handleInvoiceUpcoming(event.data.object as Stripe.Invoice, webhookId);
        break;

      case 'customer.created':
        processingResult = await handleCustomerCreated(event.data.object as Stripe.Customer, webhookId);
        break;

      case 'customer.updated':
        processingResult = await handleCustomerUpdated(event.data.object as Stripe.Customer, webhookId);
        break;

      case 'customer.deleted':
        processingResult = await handleCustomerDeleted(event.data.object as Stripe.Customer, webhookId);
        break;

      case 'payment_intent.succeeded':
        processingResult = await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, webhookId);
        break;

      case 'payment_intent.payment_failed':
        processingResult = await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, webhookId);
        break;

      case 'charge.dispute.created':
        processingResult = await handleChargeDispute(event.data.object as Stripe.Dispute, webhookId);
        break;

      case 'radar.early_fraud_warning.created':
        processingResult = await handleFraudWarning(event.data.object as any, webhookId);
        break;

      default:
        processingResult = await handleUnknownEvent(event, webhookId);
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Log successful processing
    const processingTime = Date.now() - startTime;
    await logWebhookEvent(event, {
      status: 'processed',
      processingTime,
      webhookId,
      result: processingResult,
    });

    // Track webhook analytics
    await trackWebhookAnalytics({
      eventType: event.type,
      processingTime,
      success: true,
      retryCount: 0,
      metadata: {
        webhookId,
        eventId: event.id,
        result: processingResult,
      },
    });

    return NextResponse.json({ 
      received: true,
      processed: true,
      webhookId,
      eventType: event.type,
      processingTime,
      timestamp: new Date().toISOString(),
      result: processingResult,
    }, {
      headers: {
        'X-Webhook-ID': webhookId,
        'X-Processing-Time': `${processingTime}ms`,
      },
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('Webhook error:', error);
    
    // Log error
    await logWebhookError({
      webhookId,
      error: errorMessage,
      processingTime,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Track error analytics
    await trackWebhookAnalytics({
      eventType: 'unknown',
      processingTime,
      success: false,
      retryCount: 0,
      errorMessage,
      metadata: { webhookId },
    });

    return NextResponse.json(
      { 
        error: 'Webhook handler failed',
        webhookId,
        timestamp: new Date().toISOString(),
        processingTime,
      },
      { 
        status: 500,
        headers: {
          'X-Webhook-ID': webhookId,
          'X-Processing-Time': `${processingTime}ms`,
        },
      }
    );
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, webhookId: string) {
  try {
    const userEmail = session.customer_email || session.metadata?.userEmail;
    const userId = session.metadata?.userId || session.client_reference_id;
    const planType = session.metadata?.planType || 'basic';
    const paymentIntentId = session.payment_intent as string;
    const subscriptionId = session.subscription as string;

    if (!userEmail && !userId) {
      throw new Error('No user identifier found in checkout session');
    }

    // Get comprehensive session details
    const sessionDetails = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['payment_intent', 'subscription', 'customer'],
    });

    // Extract payment details
    const paymentIntent = sessionDetails.payment_intent as Stripe.PaymentIntent;
    const customer = sessionDetails.customer as Stripe.Customer;
    
    // Update checkout log with completion details
    await prisma.checkoutLog.updateMany({
      where: { sessionId: session.id },
      data: { 
        status: 'completed',
        completedAt: new Date(),
        paymentIntentId,
        subscriptionId,
        updatedAt: new Date(),
        metadata: {
          ...session.metadata,
          completionDetails: {
            paymentMethod: paymentIntent?.payment_method,
            customerDetails: customer,
            totalAmount: session.amount_total,
            currency: session.currency,
          },
        },
      },
    });

    // Create comprehensive payment record
    const paymentData: PaymentEventData = {
      userId: userId || userEmail,
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      planType,
      paymentMethod: paymentIntent?.payment_method_types?.[0] || 'card',
      country: customer?.address?.country,
      taxAmount: session.total_details?.amount_tax || 0,
      discountAmount: session.total_details?.amount_discount || 0,
      metadata: {
        sessionId: session.id,
        paymentIntentId,
        subscriptionId,
        customerStripeId: customer?.id,
        webhookId,
      },
    };

    await prisma.payment.create({
      data: {
        userId: paymentData.userId,
        userEmail: userEmail || `user_${userId}@example.com`,
        stripePaymentId: paymentIntentId,
        stripeCustomerId: customer?.id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: 'succeeded',
        plan: paymentData.planType,
        paymentMethod: paymentData.paymentMethod,
        country: paymentData.country,
        taxAmount: paymentData.taxAmount,
        discountAmount: paymentData.discountAmount,
        metadata: paymentData.metadata,
        processedAt: new Date(),
      },
    });

    // Handle subscription creation if applicable
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await handleSubscriptionFromCheckout(subscription, paymentData, webhookId);
    }

    // Update user credits/limits based on plan
    await updateUserLimits(paymentData.userId, paymentData.planType, paymentData.amount);

    // Send confirmation notifications
    await sendPaymentConfirmation(paymentData);

    // Track conversion analytics
    await trackConversionAnalytics(paymentData);

    // Create audit log
    await createAuditLog('payment_completed', {
      userId: paymentData.userId,
      amount: paymentData.amount,
      planType: paymentData.planType,
      sessionId: session.id,
      webhookId,
    });

    console.log(`Payment completed for user: ${paymentData.userId}, plan: ${paymentData.planType}, amount: ${paymentData.amount}`);

    return {
      success: true,
      userId: paymentData.userId,
      amount: paymentData.amount,
      planType: paymentData.planType,
    };

  } catch (error) {
    console.error('Error handling checkout completed:', error);
    
    await logWebhookError({
      webhookId,
      event: 'checkout.session.completed',
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: session.id,
    });

    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription, webhookId: string) {
  try {
    const userEmail = subscription.metadata?.userEmail;
    const userId = subscription.metadata?.userId;
    const planType = subscription.metadata?.planType || 'basic';

    if (!userEmail && !userId) {
      throw new Error('No user identifier found in subscription metadata');
    }

    // Get expanded subscription details
    const expandedSubscription = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['customer', 'items.data.price.product', 'latest_invoice'],
    });

    const customer = expandedSubscription.customer as Stripe.Customer;
    const subscriptionItem = expandedSubscription.items.data[0];
    const price = subscriptionItem.price;
    const product = price.product as Stripe.Product;

    // Prepare subscription data
    const subscriptionData: SubscriptionEventData = {
      userId: userId || userEmail,
      subscriptionId: subscription.id,
      planType,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadata: {
        stripeCustomerId: customer.id,
        priceId: price.id,
        productId: product.id,
        interval: price.recurring?.interval,
        intervalCount: price.recurring?.interval_count,
        webhookId,
      },
    };

    // Create or update subscription record
    await prisma.subscription.upsert({
      where: { 
        userId: subscriptionData.userId,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customer.id,
        planType: subscriptionData.planType,
        status: subscriptionData.status,
        currentPeriodStart: subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        trialEnd: subscriptionData.trialEnd,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
        priceId: price.id,
        interval: price.recurring?.interval || 'month',
        intervalCount: price.recurring?.interval_count || 1,
        amount: price.unit_amount || 0,
        currency: price.currency,
        metadata: subscriptionData.metadata,
        updatedAt: new Date(),
      },
      create: {
        userId: subscriptionData.userId,
        userEmail: userEmail || `user_${userId}@example.com`,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customer.id,
        planType: subscriptionData.planType,
        status: subscriptionData.status,
        currentPeriodStart: subscriptionData.currentPeriodStart,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        trialEnd: subscriptionData.trialEnd,
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
        priceId: price.id,
        interval: price.recurring?.interval || 'month',
        intervalCount: price.recurring?.interval_count || 1,
        amount: price.unit_amount || 0,
        currency: price.currency,
        metadata: subscriptionData.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update user plan and limits
    await updateUserPlan(subscriptionData.userId, subscriptionData.planType);

    // Send welcome notification
    await sendSubscriptionWelcome(subscriptionData);

    // Track subscription analytics
    await trackSubscriptionAnalytics('created', subscriptionData);

    // Create audit log
    await createAuditLog('subscription_created', {
      userId: subscriptionData.userId,
      subscriptionId: subscription.id,
      planType: subscriptionData.planType,
      webhookId,
    });

    console.log(`Subscription created for user: ${subscriptionData.userId}, plan: ${subscriptionData.planType}`);

    return {
      success: true,
      userId: subscriptionData.userId,
      subscriptionId: subscription.id,
      planType: subscriptionData.planType,
      status: subscriptionData.status,
    };

  } catch (error) {
    console.error('Error handling subscription created:', error);
    
    await logWebhookError({
      webhookId,
      event: 'customer.subscription.created',
      error: error instanceof Error ? error.message : 'Unknown error',
      subscriptionId: subscription.id,
    });

    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const userEmail = subscription.metadata?.userEmail;

    if (!userEmail) {
      console.error('No user email found in subscription metadata');
      return;
    }

    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date(),
      },
    });

  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      },
    });

  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = invoice.subscription as string;
    
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: 'active',
        lastPaymentAt: new Date(),
        updatedAt: new Date(),
      },
    });

  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  try {
    const subscriptionId = invoice.subscription as string;
    
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: 'past_due',
        updatedAt: new Date(),
      },
    });

  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

// ==================== COMPREHENSIVE HELPER FUNCTIONS ====================

async function handleCheckoutExpired(session: Stripe.Checkout.Session, webhookId: string) {
  try {
    await prisma.checkoutLog.updateMany({
      where: { sessionId: session.id },
      data: { 
        status: 'expired',
        expiredAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await trackCheckoutAnalytics('expired', {
      sessionId: session.id,
      planType: session.metadata?.planType,
      amount: session.amount_total,
    });

    return { success: true, status: 'expired' };
  } catch (error) {
    console.error('Error handling checkout expired:', error);
    throw error;
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription, webhookId: string) {
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) return { success: false, reason: 'no_user_id' };

    await sendTrialEndingNotification(userId, {
      trialEnd: new Date(subscription.trial_end! * 1000),
      planType: subscription.metadata?.planType || 'basic',
    });

    await trackSubscriptionAnalytics('trial_ending', {
      userId,
      subscriptionId: subscription.id,
      trialEnd: new Date(subscription.trial_end! * 1000),
    });

    return { success: true };
  } catch (error) {
    console.error('Error handling trial will end:', error);
    throw error;
  }
}

async function handleInvoiceUpcoming(invoice: Stripe.Invoice, webhookId: string) {
  try {
    const subscription = invoice.subscription ? await stripe.subscriptions.retrieve(invoice.subscription as string) : null;
    const userId = subscription?.metadata?.userId;
    
    if (!userId) return { success: false, reason: 'no_user_id' };

    await sendUpcomingInvoiceNotification(userId, {
      amount: invoice.amount_due,
      currency: invoice.currency,
      dueDate: new Date(invoice.due_date! * 1000),
      planType: subscription?.metadata?.planType || 'basic',
    });

    return { success: true };
  } catch (error) {
    console.error('Error handling invoice upcoming:', error);
    throw error;
  }
}

async function handleCustomerCreated(customer: Stripe.Customer, webhookId: string) {
  try {
    await prisma.customer.upsert({
      where: { stripeCustomerId: customer.id },
      update: {
        email: customer.email,
        name: customer.name,
        metadata: customer.metadata,
        updatedAt: new Date(),
      },
      create: {
        stripeCustomerId: customer.id,
        email: customer.email || '',
        name: customer.name,
        metadata: customer.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error handling customer created:', error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, webhookId: string) {
  try {
    await prisma.payment.upsert({
      where: { stripePaymentId: paymentIntent.id },
      update: {
        status: 'succeeded',
        processedAt: new Date(),
        metadata: {
          ...paymentIntent.metadata,
          webhookId,
        },
      },
      create: {
        userEmail: paymentIntent.receipt_email || '',
        stripePaymentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'succeeded',
        plan: paymentIntent.metadata?.planType || 'basic',
        metadata: {
          ...paymentIntent.metadata,
          webhookId,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}

async function logWebhookEvent(event: Stripe.Event, metadata: any) {
  try {
    await prisma.webhookEvent.upsert({
      where: { eventId: event.id },
      update: {
        status: metadata.status,
        processingTime: metadata.processingTime,
        metadata,
        updatedAt: new Date(),
      },
      create: {
        eventId: event.id,
        eventType: event.type,
        status: metadata.status,
        processingTime: metadata.processingTime,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Webhook event log error:', error);
  }
}

async function trackCheckoutAnalytics(event: string, data: any) {
  try {
    await prisma.analytics.create({
      data: {
        event: `checkout_${event}`,
        metadata: data,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Checkout analytics error:', error);
  }
}

async function trackSubscriptionAnalytics(event: string, data: any) {
  try {
    await prisma.analytics.create({
      data: {
        event: `subscription_${event}`,
        metadata: data,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Subscription analytics error:', error);
  }
}

// Mock implementations for external services
async function sendTrialEndingNotification(userId: string, data: any) {
  console.log(`Sending trial ending notification to user: ${userId}`);
}

async function sendUpcomingInvoiceNotification(userId: string, data: any) {
  console.log(`Sending upcoming invoice notification to user: ${userId}`);
}
