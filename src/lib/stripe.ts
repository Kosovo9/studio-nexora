import Stripe from 'stripe';
import type { PlanType } from '@/types';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

export const PLANS = {
  basic: {
    priceId: process.env.STRIPE_PRICE_BASIC!,
    amount: 500, // $5.00
  },
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO!,
    amount: 1500, // $15.00
  },
  vip: {
    priceId: process.env.STRIPE_PRICE_VIP!,
    amount: 3000, // $30.00
  },
};

/**
 * Create a payment intent
 */
export async function createPaymentIntent(plan: PlanType, userId?: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: PLANS[plan].amount,
      currency: 'usd',
      metadata: {
        plan,
        userId: userId || 'guest',
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error('Failed to create payment intent');
  }
}

/**
 * Create a checkout session
 */
export async function createCheckoutSession(
  plan: PlanType,
  userId: string,
  successUrl: string,
  cancelUrl: string
) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PLANS[plan].priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        plan,
        userId,
      },
      client_reference_id: userId,
    });

    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Create a subscription
 */
export async function createSubscription(
  customerId: string,
  plan: PlanType,
  userId: string
) {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: PLANS[plan].priceId,
        },
      ],
      metadata: {
        plan,
        userId,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error('Failed to create subscription');
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return subscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Get customer
 */
export async function getCustomer(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return customer;
  } catch (error) {
    console.error('Error getting customer:', error);
    throw new Error('Failed to get customer');
  }
}

/**
 * Create customer
 */
export async function createCustomer(email: string, userId: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });

    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw new Error('Failed to create customer');
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    return event;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw new Error('Invalid webhook signature');
  }
}

/**
 * Handle successful payment
 */
export async function handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;
  const plan = metadata.plan as PlanType;
  const userId = metadata.userId;

  // Here you would update your database with the payment information
  // For example, create a Payment record and update user's subscription

  return {
    plan,
    userId,
    amount: paymentIntent.amount,
    status: paymentIntent.status,
  };
}

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
  } catch (error) {
    console.error('Error getting subscription status:', error);
    throw new Error('Failed to get subscription status');
  }
}
