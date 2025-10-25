import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, handleSuccessfulPayment } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = verifyWebhookSignature(body, signature);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentData = await handleSuccessfulPayment(paymentIntent);

        // Create payment record
        await prisma.payment.create({
          data: {
            userId: paymentData.userId,
            stripePaymentId: paymentIntent.id,
            amount: paymentData.amount,
            currency: 'usd',
            status: 'succeeded',
            plan: paymentData.plan,
            metadata: {
              paymentIntentId: paymentIntent.id,
            },
          },
        });

        // Track analytics
        await prisma.analytics.create({
          data: {
            event: 'payment_completed',
            userId: paymentData.userId,
            metadata: {
              plan: paymentData.plan,
              amount: paymentData.amount,
            },
          },
        });

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // Track failed payment
        await prisma.analytics.create({
          data: {
            event: 'payment_failed',
            userId: paymentIntent.metadata.userId || null,
            metadata: {
              paymentIntentId: paymentIntent.id,
              error: paymentIntent.last_payment_error?.message,
            },
          },
        });

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;

        if (userId) {
          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0].price.id,
              stripeCustomerId: subscription.customer as string,
              status: subscription.status,
              plan: subscription.metadata.plan || 'basic',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
            update: {
              status: subscription.status,
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;

        if (userId) {
          await prisma.subscription.update({
            where: { userId },
            data: {
              status: 'canceled',
            },
          });
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      },
      { status: 400 }
    );
  }
}
