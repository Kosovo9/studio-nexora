import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, handleSuccessfulPayment } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// Types for webhook processing
interface WebhookProcessingResult {
  eventType: string;
  success: boolean;
  actions?: string[];
  error?: string;
}

interface WebhookEvent {
  id: string;
  type: string;
  data: any;
}

// Helper functions
// verifyWebhookSignature is imported from @/lib/stripe

// Enhanced webhook processing utilities
async function checkWebhookRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `webhook_rate_limit:${ip}`;
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100; // Max 100 webhooks per minute per IP

  try {
    // In a real implementation, you'd use Redis
    // For now, we'll use a simple in-memory approach
    const now = Date.now();
    const requests = webhookRateLimitStore.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter((timestamp: number) => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // Add current request
    validRequests.push(now);
    webhookRateLimitStore.set(key, validRequests);

    return { allowed: true, remaining: maxRequests - validRequests.length };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true, remaining: maxRequests }; // Fail open
  }
}

async function checkEventIdempotency(eventId: string): Promise<boolean> {
  try {
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId }
    });
    return !!existing;
  } catch (error) {
    console.error('Idempotency check failed:', error);
    return false; // Fail safe - process the event
  }
}

async function markEventProcessed(eventId: string, result: WebhookProcessingResult): Promise<void> {
  try {
    await prisma.webhookEvent.create({
      data: {
        eventId,
        eventType: result.eventType,
        processed: true,
        success: result.success,
        actions: result.actions || [],
        error: result.error,
        processedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to mark event as processed:', error);
  }
}

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Notification and logging utilities
function shouldSendNotification(eventType: string): boolean {
  const notificationEvents = [
    'payment_intent.payment_failed',
    'customer.subscription.deleted',
    'customer.subscription.trial_will_end',
    'invoice.payment_failed',
    'invoice.upcoming'
  ];
  return notificationEvents.includes(eventType);
}

async function sendWebhookNotification(event: WebhookEvent, result: WebhookProcessingResult): Promise<void> {
  try {
    // Implementation would depend on your notification system
    console.log(`Sending notification for ${event.type}:`, result);
  } catch (error) {
    console.error('Failed to send webhook notification:', error);
  }
}

async function logWebhookEvent(data: {
  eventId: string;
  eventType: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
}): Promise<void> {
  try {
    await prisma.webhookLog.create({
      data: {
        eventId: data.eventId,
        eventType: data.eventType,
        ip: data.ip,
        userAgent: data.userAgent,
        timestamp: data.timestamp,
        status: 'received'
      }
    });
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}

async function logWebhookError(data: {
  error: string;
  ip: string;
  body: string;
  signature: string;
  timestamp: Date;
}): Promise<void> {
  try {
    await prisma.webhookLog.create({
      data: {
        eventId: 'error',
        eventType: 'error',
        ip: data.ip,
        userAgent: 'unknown',
        timestamp: data.timestamp,
        status: 'error',
        error: data.error,
        metadata: JSON.stringify({
          body: data.body,
          signature: data.signature
        })
      }
    });
  } catch (error) {
    console.error('Failed to log webhook error:', error);
  }
}

async function logUnhandledEvent(event: WebhookEvent): Promise<void> {
  try {
    await prisma.webhookLog.create({
      data: {
        eventId: event.id,
        eventType: event.type,
        ip: 'stripe',
        userAgent: 'stripe-webhook',
        timestamp: new Date(),
        status: 'unhandled',
        metadata: JSON.stringify({ eventData: event.data })
      }
    });
  } catch (error) {
    console.error('Failed to log unhandled event:', error);
  }
}

async function logWebhookProcessingError(event: WebhookEvent, error: unknown): Promise<void> {
  try {
    await prisma.webhookLog.create({
      data: {
        eventId: event.id,
        eventType: event.type,
        ip: 'stripe',
        userAgent: 'stripe-webhook',
        timestamp: new Date(),
        status: 'processing_error',
        error: error instanceof Error ? error.message : 'Unknown processing error',
        metadata: JSON.stringify({ eventData: event.data })
      }
    });
  } catch (logError) {
    console.error('Failed to log processing error:', logError);
  }
}

async function trackWebhookAnalytics(data: {
  eventId: string;
  eventType: string;
  processingTime: number;
  success: boolean;
  ip: string;
}): Promise<void> {
  try {
    await prisma.analytics.create({
      data: {
        event: 'webhook_processed',
        userId: null,
        metadata: {
          eventId: data.eventId,
          eventType: data.eventType,
          processingTime: data.processingTime,
          success: data.success,
          ip: data.ip
        }
      }
    });
  } catch (error) {
    console.error('Failed to track webhook analytics:', error);
  }
}

// Business logic helpers
async function updateUserCredits(userId: string, plan: string): Promise<void> {
  const creditMap: Record<string, number> = {
    basic: 100,
    pro: 500,
    premium: 1000
  };

  const credits = creditMap[plan] || 0;
  
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { increment: credits },
        plan: plan
      }
    });
  } catch (error) {
    console.error('Failed to update user credits:', error);
  }
}

async function updateUserPlan(userId: string, plan: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { plan }
    });
  } catch (error) {
    console.error('Failed to update user plan:', error);
  }
}

async function trackPaymentEvent(eventType: string, data: any): Promise<void> {
  try {
    await prisma.analytics.create({
      data: {
        event: eventType,
        userId: data.userId,
        metadata: data
      }
    });
  } catch (error) {
    console.error('Failed to track payment event:', error);
  }
}

async function trackRevenueEvent(userId: string, amount: number, plan: string): Promise<void> {
  try {
    await prisma.analytics.create({
      data: {
        event: 'revenue_generated',
        userId,
        metadata: {
          amount,
          plan,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Failed to track revenue event:', error);
  }
}

// Notification helpers (mock implementations)
async function sendPaymentActionNotification(userId: string, paymentIntentId: string): Promise<void> {
  console.log(`Sending payment action notification to user ${userId} for payment ${paymentIntentId}`);
}

async function sendTrialEndingNotification(userId: string, trialEnd: number | null): Promise<void> {
  console.log(`Sending trial ending notification to user ${userId}, trial ends: ${trialEnd}`);
}

async function sendPaymentFailedNotification(userId: string, invoiceId: string): Promise<void> {
  console.log(`Sending payment failed notification to user ${userId} for invoice ${invoiceId}`);
}

async function sendUpcomingPaymentNotification(userId: string, amount: number, periodEnd: number | null): Promise<void> {
  console.log(`Sending upcoming payment notification to user ${userId}, amount: ${amount}, period end: ${periodEnd}`);
}

// Logging helpers (mock implementations)
async function logInvoiceEvent(action: string, invoiceId: string, customerId: string): Promise<void> {
  console.log(`Invoice ${action}: ${invoiceId} for customer ${customerId}`);
}

async function logCustomerEvent(action: string, customerId: string, email: string | null): Promise<void> {
  console.log(`Customer ${action}: ${customerId} (${email})`);
}

async function syncCustomerData(customer: Stripe.Customer): Promise<void> {
  console.log(`Syncing customer data for ${customer.id}`);
}

async function handleCustomerDeletion(customerId: string): Promise<void> {
  console.log(`Handling customer deletion for ${customerId}`);
}

async function handleChargeDispute(chargeId: string, action: string): Promise<void> {
  console.log(`Handling charge dispute ${action} for charge ${chargeId}`);
}

async function logAccountEvent(action: string, accountId: string): Promise<void> {
  console.log(`Account ${action}: ${accountId}`);
}

async function logCapabilityEvent(action: string, capabilityId: string, status: string): Promise<void> {
  console.log(`Capability ${action}: ${capabilityId} status ${status}`);
}

async function logApplicationEvent(action: string, applicationId: string): Promise<void> {
  console.log(`Application ${action}: ${applicationId}`);
}

async function processCheckoutSuccess(userId: string, session: Stripe.Checkout.Session): Promise<void> {
  console.log(`Processing checkout success for user ${userId}, session ${session.id}`);
}

async function logCheckoutEvent(action: string, sessionId: string): Promise<void> {
  console.log(`Checkout ${action}: ${sessionId}`);
}

// In-memory rate limiting store (in production, use Redis)
const webhookRateLimitStore = new Map<string, number[]>();

export async function POST(request: NextRequest): Promise<NextResponse<WebhookProcessingResult>> {
  const startTime = Date.now();
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';
  
  try {
    // Enhanced rate limiting
    const rateLimitResult = await checkWebhookRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          eventId: 'unknown',
          eventType: 'unknown',
          processingTime: Date.now() - startTime,
          error: 'Rate limit exceeded' 
        },
        { status: 429 }
      );
    }

    const body = await request.text();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { 
          success: false, 
          eventId: 'unknown',
          eventType: 'unknown',
          processingTime: Date.now() - startTime,
          error: 'Missing Stripe signature' 
        },
        { status: 400 }
      );
    }

    // Verify webhook signature with enhanced security
    const event = await verifyWebhookSignatureEnhanced(body, signature);
    
    // Check for duplicate events (idempotency)
    const isDuplicate = await checkEventIdempotency(event.id);
    if (isDuplicate) {
      return NextResponse.json({
        success: true,
        eventId: event.id,
        eventType: event.type,
        processingTime: Date.now() - startTime,
        actions: ['duplicate_ignored']
      });
    }

    // Log webhook receipt
    await logWebhookEvent({
      eventId: event.id,
      eventType: event.type,
      ip,
      userAgent: headersList.get('user-agent') || 'unknown',
      timestamp: new Date()
    });

    // Process webhook event with timeout protection
    const processingResult = await Promise.race([
      processWebhookEvent(event),
      new Promise<WebhookProcessingResult>((_, reject) => 
        setTimeout(() => reject(new Error('Webhook processing timeout')), WEBHOOK_TIMEOUT)
      )
    ]);

    // Mark event as processed
    await markEventProcessed(event.id, processingResult);

    // Track webhook analytics
    await trackWebhookAnalytics({
      eventId: event.id,
      eventType: event.type,
      processingTime: Date.now() - startTime,
      success: processingResult.success,
      ip
    });

    return NextResponse.json({
      ...processingResult,
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Log webhook error
    await logWebhookError({
      error: error instanceof Error ? error.message : 'Unknown error',
      ip,
      body: body?.substring(0, 1000) || 'No body',
      signature: signature || 'No signature',
      timestamp: new Date()
    });

    return NextResponse.json(
      {
        success: false,
        eventId: 'unknown',
        eventType: 'unknown',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 400 }
    );
  }
}

// Enhanced webhook signature verification
async function verifyWebhookSignatureEnhanced(body: string, signature: string): Promise<WebhookEvent> {
  try {
    const event = verifyWebhookSignature(body, signature);
    
    // Additional security checks
    if (!event.id || !event.type || !event.created) {
      throw new Error('Invalid webhook event structure');
    }

    // Check event age (prevent replay attacks)
    const eventAge = Date.now() - (event.created * 1000);
    if (eventAge > 5 * 60 * 1000) { // 5 minutes
      throw new Error('Webhook event too old');
    }

    return event;
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Process webhook event with comprehensive handling
async function processWebhookEvent(event: WebhookEvent): Promise<WebhookProcessingResult> {
  const actions: string[] = [];
  
  try {
    // Get handler for event type
    const handler = WEBHOOK_HANDLERS[event.type as keyof typeof WEBHOOK_HANDLERS];
    
    if (!handler) {
      // Log unhandled event type
      await logUnhandledEvent(event);
      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        processingTime: 0,
        actions: ['unhandled_event_logged']
      };
    }

    // Execute handler with retry logic
    const result = await executeWithRetry(
      () => handler(event.data.object, event),
      MAX_RETRY_ATTEMPTS
    );

    actions.push(...(result.actions || []));

    // Send notifications if needed
    if (shouldSendNotification(event.type)) {
      await sendWebhookNotification(event, result);
      actions.push('notification_sent');
    }

    return {
      success: true,
      eventId: event.id,
      eventType: event.type,
      processingTime: 0,
      actions
    };

  } catch (error) {
    console.error(`Error processing webhook event ${event.id}:`, error);
    
    // Log processing error
    await logWebhookProcessingError(event, error);
    
    return {
      success: false,
      eventId: event.id,
      eventType: event.type,
      processingTime: 0,
      error: error instanceof Error ? error.message : 'Processing failed',
      actions
    };
  }
}

// Webhook event handlers
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, event: WebhookEvent) {
  const userId = paymentIntent.metadata.userId;
  if (!userId) {
    throw new Error('Missing userId in payment intent metadata');
  }

  // Update payment record
  await prisma.payment.upsert({
    where: { stripePaymentIntentId: paymentIntent.id },
    create: {
      userId,
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'succeeded',
      plan: paymentIntent.metadata.plan || 'basic',
      billingCycle: paymentIntent.metadata.billingCycle || 'monthly',
      metadata: JSON.stringify(paymentIntent.metadata)
    },
    update: {
      status: 'succeeded',
      completedAt: new Date()
    }
  });

  // Update user credits/subscription
  await updateUserCredits(userId, paymentIntent.metadata.plan || 'basic');

  // Track analytics
  await trackPaymentEvent('payment_succeeded', {
    userId,
    amount: paymentIntent.amount,
    plan: paymentIntent.metadata.plan || 'basic',
    paymentIntentId: paymentIntent.id
  });

  return { actions: ['payment_updated', 'credits_added', 'analytics_tracked'] };
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, event: WebhookEvent) {
  const userId = paymentIntent.metadata.userId;
  
  // Update payment record
  if (userId) {
    await prisma.payment.updateMany({
      where: { 
        userId,
        stripePaymentIntentId: paymentIntent.id 
      },
      data: {
        status: 'failed',
        failureReason: paymentIntent.last_payment_error?.message
      }
    });
  }

  // Track analytics
  await trackPaymentEvent('payment_failed', {
    userId: userId || 'unknown',
    amount: paymentIntent.amount,
    paymentIntentId: paymentIntent.id,
    error: paymentIntent.last_payment_error?.message
  });

  return { actions: ['payment_failed_recorded', 'analytics_tracked'] };
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent, event: WebhookEvent) {
  const userId = paymentIntent.metadata.userId;
  
  if (userId) {
    await prisma.payment.updateMany({
      where: { 
        userId,
        stripePaymentIntentId: paymentIntent.id 
      },
      data: { status: 'canceled' }
    });
  }

  return { actions: ['payment_canceled'] };
}

async function handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent, event: WebhookEvent) {
  const userId = paymentIntent.metadata.userId;
  
  if (userId) {
    // Send notification to user about required action
    await sendPaymentActionNotification(userId, paymentIntent.id);
  }

  return { actions: ['action_notification_sent'] };
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription, event: WebhookEvent) {
  const userId = subscription.metadata.userId;
  if (!userId) {
    throw new Error('Missing userId in subscription metadata');
  }

  await prisma.subscription.create({
    data: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      plan: subscription.metadata.plan || 'basic',
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      billingCycle: subscription.metadata.billingCycle || 'monthly',
      metadata: JSON.stringify(subscription.metadata)
    }
  });

  // Update user plan
  await updateUserPlan(userId, subscription.metadata.plan || 'basic');

  return { actions: ['subscription_created', 'user_plan_updated'] };
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, event: WebhookEvent) {
  const userId = subscription.metadata.userId;
  if (!userId) return { actions: ['no_user_id'] };

  await prisma.subscription.updateMany({
    where: { 
      userId,
      stripeSubscriptionId: subscription.id 
    },
    data: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      plan: subscription.metadata.plan || 'basic'
    }
  });

  // Update user plan if changed
  await updateUserPlan(userId, subscription.metadata.plan || 'basic');

  return { actions: ['subscription_updated', 'user_plan_synced'] };
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, event: WebhookEvent) {
  const userId = subscription.metadata.userId;
  if (!userId) return { actions: ['no_user_id'] };

  await prisma.subscription.updateMany({
    where: { 
      userId,
      stripeSubscriptionId: subscription.id 
    },
    data: {
      status: 'canceled',
      canceledAt: new Date()
    }
  });

  // Downgrade user to free plan
  await updateUserPlan(userId, 'free');

  return { actions: ['subscription_canceled', 'user_downgraded'] };
}

async function handleSubscriptionTrialWillEnd(subscription: Stripe.Subscription, event: WebhookEvent) {
  const userId = subscription.metadata.userId;
  if (!userId) return { actions: ['no_user_id'] };

  // Send trial ending notification
  await sendTrialEndingNotification(userId, subscription.trial_end);

  return { actions: ['trial_ending_notification_sent'] };
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, event: WebhookEvent) {
  const customerId = invoice.customer as string;
  
  // Find subscription
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId }
  });

  if (subscription) {
    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        status: 'active',
        lastPaymentAt: new Date()
      }
    });

    // Track revenue
    await trackRevenueEvent(subscription.userId, invoice.amount_paid, subscription.plan);
  }

  return { actions: ['invoice_payment_processed', 'revenue_tracked'] };
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, event: WebhookEvent) {
  const customerId = invoice.customer as string;
  
  // Find subscription
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId }
  });

  if (subscription) {
    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'past_due' }
    });

    // Send payment failed notification
    await sendPaymentFailedNotification(subscription.userId, invoice.id);
  }

  return { actions: ['subscription_past_due', 'notification_sent'] };
}

async function handleInvoiceUpcoming(invoice: Stripe.Invoice, event: WebhookEvent) {
  const customerId = invoice.customer as string;
  
  // Find subscription
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId }
  });

  if (subscription) {
    // Send upcoming payment notification
    await sendUpcomingPaymentNotification(subscription.userId, invoice.amount_due, invoice.period_end);
  }

  return { actions: ['upcoming_payment_notification_sent'] };
}

async function handleInvoiceCreated(invoice: Stripe.Invoice, event: WebhookEvent) {
  // Log invoice creation for tracking
  await logInvoiceEvent('created', invoice.id, invoice.customer as string);
  return { actions: ['invoice_logged'] };
}

async function handleCustomerCreated(customer: Stripe.Customer, event: WebhookEvent) {
  // Log customer creation
  await logCustomerEvent('created', customer.id, customer.email);
  return { actions: ['customer_logged'] };
}

async function handleCustomerUpdated(customer: Stripe.Customer, event: WebhookEvent) {
  // Sync customer data if needed
  await syncCustomerData(customer);
  return { actions: ['customer_synced'] };
}

async function handleCustomerDeleted(customer: Stripe.Customer, event: WebhookEvent) {
  // Handle customer deletion
  await handleCustomerDeletion(customer.id);
  return { actions: ['customer_deletion_handled'] };
}

async function handleDisputeCreated(charge: Stripe.Charge, event: WebhookEvent) {
  // Handle dispute creation
  await handleChargeDispute(charge.id, 'created');
  return { actions: ['dispute_handled'] };
}

async function handleDisputeUpdated(charge: Stripe.Charge, event: WebhookEvent) {
  // Handle dispute update
  await handleChargeDispute(charge.id, 'updated');
  return { actions: ['dispute_updated'] };
}

async function handleAccountUpdated(account: Stripe.Account, event: WebhookEvent) {
  // Handle account updates
  await logAccountEvent('updated', account.id);
  return { actions: ['account_logged'] };
}

async function handleCapabilityUpdated(capability: Stripe.Capability, event: WebhookEvent) {
  // Handle capability updates
  await logCapabilityEvent('updated', capability.id, capability.status);
  return { actions: ['capability_logged'] };
}

async function handleApplicationDeauthorized(application: any, event: WebhookEvent) {
  // Handle application deauthorization
  await logApplicationEvent('deauthorized', application.id);
  return { actions: ['application_deauth_logged'] };
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, event: WebhookEvent) {
  const userId = session.metadata?.userId;
  if (!userId) return { actions: ['no_user_id'] };

  // Process successful checkout
  await processCheckoutSuccess(userId, session);
  return { actions: ['checkout_processed'] };
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session, event: WebhookEvent) {
  // Log expired checkout session
  await logCheckoutEvent('expired', session.id);
  return { actions: ['checkout_expiry_logged'] };
}
