import { NextRequest, NextResponse } from 'next/server';
import { stripe, createPaymentIntent, createCheckoutSession } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import type { PlanType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, userId, email, type = 'intent' } = body;

    // Validate input
    if (!plan || !['basic', 'pro', 'vip'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan' },
        { status: 400 }
      );
    }

    if (type === 'checkout') {
      // Create checkout session
      if (!userId || !email) {
        return NextResponse.json(
          { success: false, error: 'User ID and email required for checkout' },
          { status: 400 }
        );
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const session = await createCheckoutSession(
        plan as PlanType,
        userId,
        `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/cancel`
      );

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        url: session.url,
      });
    } else {
      // Create payment intent
      const paymentIntent = await createPaymentIntent(plan as PlanType, userId);

      return NextResponse.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
      });
    }
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 400 }
      );
    }

    const payments = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
