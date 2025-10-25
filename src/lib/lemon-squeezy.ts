/**
 * Lemon Squeezy Payment Integration
 * Alternative payment processor with support for international payments
 * Perfect for SSN requirements and global markets
 */

import crypto from 'crypto';
import type { PlanType } from '@/types';

const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY!;
const LEMON_SQUEEZY_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID!;
const LEMON_SQUEEZY_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!;

export const LEMON_SQUEEZY_PLANS = {
  basic: {
    variantId: process.env.LEMON_SQUEEZY_VARIANT_BASIC!,
    price: 500, // $5.00
  },
  pro: {
    variantId: process.env.LEMON_SQUEEZY_VARIANT_PRO!,
    price: 1500, // $15.00
  },
  vip: {
    variantId: process.env.LEMON_SQUEEZY_VARIANT_VIP!,
    price: 3000, // $30.00
  },
};

interface LemonSqueezyCheckout {
  data: {
    id: string;
    attributes: {
      url: string;
      custom_price: number;
    };
  };
}

interface LemonSqueezySubscription {
  data: {
    id: string;
    attributes: {
      status: string;
      customer_id: number;
      product_id: number;
      variant_id: number;
      renews_at: string;
      ends_at: string | null;
    };
  };
}

/**
 * Create a checkout session
 */
export async function createLemonSqueezyCheckout(
  plan: PlanType,
  userId: string,
  email: string,
  customData?: Record<string, any>
): Promise<string> {
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email,
              custom: {
                user_id: userId,
                plan,
                ...customData,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: LEMON_SQUEEZY_STORE_ID,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: LEMON_SQUEEZY_PLANS[plan].variantId,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create Lemon Squeezy checkout');
    }

    const data: LemonSqueezyCheckout = await response.json();
    return data.data.attributes.url;
  } catch (error) {
    console.error('Lemon Squeezy checkout error:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Get subscription details
 */
export async function getLemonSqueezySubscription(
  subscriptionId: string
): Promise<LemonSqueezySubscription['data']> {
  try {
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get subscription');
    }

    const data: LemonSqueezySubscription = await response.json();
    return data.data;
  } catch (error) {
    console.error('Get subscription error:', error);
    throw new Error('Failed to get subscription');
  }
}

/**
 * Cancel subscription
 */
export async function cancelLemonSqueezySubscription(
  subscriptionId: string
): Promise<void> {
  try {
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${subscriptionId}`,
      {
        method: 'DELETE',
        headers: {
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to cancel subscription');
    }
  } catch (error) {
    console.error('Cancel subscription error:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Verify webhook signature
 */
export function verifyLemonSqueezyWebhook(
  payload: string,
  signature: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', LEMON_SQUEEZY_WEBHOOK_SECRET);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}

/**
 * Handle webhook events
 */
export async function handleLemonSqueezyWebhook(event: any) {
  const { meta, data } = event;
  const eventName = meta.event_name;

  switch (eventName) {
    case 'order_created':
      // Handle new order
      return {
        type: 'order_created',
        userId: data.attributes.custom_data?.user_id,
        plan: data.attributes.custom_data?.plan,
        amount: data.attributes.total,
        orderId: data.id,
      };

    case 'subscription_created':
      // Handle new subscription
      return {
        type: 'subscription_created',
        userId: data.attributes.custom_data?.user_id,
        subscriptionId: data.id,
        status: data.attributes.status,
        renewsAt: data.attributes.renews_at,
      };

    case 'subscription_updated':
      // Handle subscription update
      return {
        type: 'subscription_updated',
        subscriptionId: data.id,
        status: data.attributes.status,
        renewsAt: data.attributes.renews_at,
        endsAt: data.attributes.ends_at,
      };

    case 'subscription_cancelled':
      // Handle subscription cancellation
      return {
        type: 'subscription_cancelled',
        subscriptionId: data.id,
        endsAt: data.attributes.ends_at,
      };

    case 'subscription_resumed':
      // Handle subscription resumption
      return {
        type: 'subscription_resumed',
        subscriptionId: data.id,
        renewsAt: data.attributes.renews_at,
      };

    case 'subscription_expired':
      // Handle subscription expiration
      return {
        type: 'subscription_expired',
        subscriptionId: data.id,
      };

    case 'subscription_payment_success':
      // Handle successful payment
      return {
        type: 'payment_success',
        subscriptionId: data.attributes.subscription_id,
        amount: data.attributes.total,
      };

    case 'subscription_payment_failed':
      // Handle failed payment
      return {
        type: 'payment_failed',
        subscriptionId: data.attributes.subscription_id,
        reason: data.attributes.status_reason,
      };

    default:
      console.log(`Unhandled Lemon Squeezy event: ${eventName}`);
      return null;
  }
}

/**
 * Get customer portal URL
 */
export async function getLemonSqueezyPortalUrl(
  customerId: string
): Promise<string> {
  try {
    const response = await fetch(
      `https://api.lemonsqueezy.com/v1/customers/${customerId}`,
      {
        headers: {
          'Accept': 'application/vnd.api+json',
          'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get customer portal URL');
    }

    const data = await response.json();
    return data.data.attributes.urls.customer_portal;
  } catch (error) {
    console.error('Get portal URL error:', error);
    throw new Error('Failed to get customer portal URL');
  }
}

/**
 * Create one-time payment (for non-subscription purchases)
 */
export async function createLemonSqueezyPayment(
  amount: number,
  userId: string,
  email: string,
  description: string
): Promise<string> {
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email,
              custom: {
                user_id: userId,
                description,
              },
            },
            product_options: {
              name: description,
              description: description,
            },
            checkout_options: {
              button_color: '#3b82f6',
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: LEMON_SQUEEZY_STORE_ID,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment');
    }

    const data: LemonSqueezyCheckout = await response.json();
    return data.data.attributes.url;
  } catch (error) {
    console.error('Create payment error:', error);
    throw new Error('Failed to create payment');
  }
}
