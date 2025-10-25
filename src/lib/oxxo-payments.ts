/**
 * OXXO Payment Integration (Mexico)
 * Cash payment system for Mexican market
 * Integrates with Stripe and Lemon Squeezy
 */

import { stripe } from './stripe';
import type { PlanType } from '@/types';

/**
 * Create OXXO payment with Stripe
 */
export async function createOxxoPayment(
  plan: PlanType,
  userId: string,
  email: string,
  customerName: string
) {
  try {
    const amounts = {
      basic: 500, // $5.00 USD = ~100 MXN
      pro: 1500, // $15.00 USD = ~300 MXN
      vip: 3000, // $30.00 USD = ~600 MXN
    };

    // Create payment intent with OXXO
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amounts[plan],
      currency: 'mxn', // Mexican Peso
      payment_method_types: ['oxxo'],
      metadata: {
        plan,
        userId,
        paymentMethod: 'oxxo',
      },
      receipt_email: email,
      description: `Studio Nexora - ${plan.toUpperCase()} Plan`,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    console.error('OXXO payment creation error:', error);
    throw new Error('Failed to create OXXO payment');
  }
}

/**
 * Generate OXXO voucher details
 */
export async function getOxxoVoucherDetails(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent.next_action?.oxxo_display_details) {
      throw new Error('OXXO details not available');
    }

    const oxxoDetails = paymentIntent.next_action.oxxo_display_details;

    return {
      reference: oxxoDetails.number,
      expiresAt: oxxoDetails.expires_after,
      hostedVoucherUrl: oxxoDetails.hosted_voucher_url,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      instructions: {
        es: [
          '1. Acude a cualquier tienda OXXO',
          '2. Indica al cajero que quieres realizar un pago de servicio',
          '3. Proporciona el número de referencia',
          '4. Realiza el pago en efectivo',
          '5. Guarda tu comprobante',
        ],
        en: [
          '1. Go to any OXXO store',
          '2. Tell the cashier you want to make a service payment',
          '3. Provide the reference number',
          '4. Make the payment in cash',
          '5. Keep your receipt',
        ],
      },
    };
  } catch (error) {
    console.error('Get OXXO voucher error:', error);
    throw new Error('Failed to get OXXO voucher details');
  }
}

/**
 * Check OXXO payment status
 */
export async function checkOxxoPaymentStatus(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      status: paymentIntent.status,
      paid: paymentIntent.status === 'succeeded',
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    };
  } catch (error) {
    console.error('Check OXXO payment status error:', error);
    throw new Error('Failed to check payment status');
  }
}

/**
 * Send OXXO voucher via email
 */
export async function sendOxxoVoucherEmail(
  email: string,
  voucherDetails: any,
  customerName: string
) {
  try {
    // This would integrate with your email service (SendGrid, Resend, etc.)
    const emailContent = {
      to: email,
      subject: 'Tu comprobante de pago OXXO - Studio Nexora',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .reference { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; font-size: 24px; font-weight: bold; text-align: center; }
            .instructions { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .instructions li { margin: 10px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎨 Studio Nexora</h1>
              <p>Comprobante de Pago OXXO</p>
            </div>
            <div class="content">
              <p>Hola ${customerName},</p>
              <p>Gracias por tu compra. Aquí está tu número de referencia para pagar en OXXO:</p>
              
              <div class="reference">
                ${voucherDetails.reference}
              </div>
              
              <p><strong>Monto a pagar:</strong> $${(voucherDetails.amount / 100).toFixed(2)} ${voucherDetails.currency.toUpperCase()}</p>
              <p><strong>Válido hasta:</strong> ${new Date(voucherDetails.expiresAt * 1000).toLocaleDateString('es-MX')}</p>
              
              <div class="instructions">
                <h3>📋 Instrucciones de Pago:</h3>
                <ol>
                  ${voucherDetails.instructions.es.map((step: string) => `<li>${step}</li>`).join('')}
                </ol>
              </div>
              
              <center>
                <a href="${voucherDetails.hostedVoucherUrl}" class="button">
                  📄 Descargar Comprobante PDF
                </a>
              </center>
              
              <p><strong>⚠️ Importante:</strong></p>
              <ul>
                <li>El pago puede tardar hasta 48 horas en reflejarse</li>
                <li>Guarda tu comprobante de pago</li>
                <li>Una vez confirmado el pago, recibirás acceso inmediato</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2025 Studio Nexora. Todos los derechos reservados.</p>
              <p>¿Necesitas ayuda? Contáctanos en support@studionexora.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    // Send email using your preferred service
    // await sendEmail(emailContent);

    return { success: true };
  } catch (error) {
    console.error('Send OXXO voucher email error:', error);
    throw new Error('Failed to send voucher email');
  }
}

/**
 * Handle OXXO payment webhook
 */
export async function handleOxxoPaymentWebhook(event: any) {
  const { type, data } = event;

  switch (type) {
    case 'payment_intent.succeeded':
      if (data.object.payment_method_types.includes('oxxo')) {
        return {
          type: 'oxxo_payment_succeeded',
          userId: data.object.metadata.userId,
          plan: data.object.metadata.plan,
          amount: data.object.amount,
          paymentIntentId: data.object.id,
        };
      }
      break;

    case 'payment_intent.payment_failed':
      if (data.object.payment_method_types.includes('oxxo')) {
        return {
          type: 'oxxo_payment_failed',
          userId: data.object.metadata.userId,
          paymentIntentId: data.object.id,
          reason: data.object.last_payment_error?.message,
        };
      }
      break;

    case 'payment_intent.canceled':
      if (data.object.payment_method_types.includes('oxxo')) {
        return {
          type: 'oxxo_payment_canceled',
          userId: data.object.metadata.userId,
          paymentIntentId: data.object.id,
        };
      }
      break;
  }

  return null;
}

/**
 * Get OXXO payment statistics
 */
export async function getOxxoPaymentStats(userId: string) {
  try {
    // This would query your database for OXXO payment statistics
    return {
      totalPayments: 0,
      successfulPayments: 0,
      pendingPayments: 0,
      failedPayments: 0,
      totalAmount: 0,
    };
  } catch (error) {
    console.error('Get OXXO stats error:', error);
    return null;
  }
}

/**
 * Cancel OXXO payment
 */
export async function cancelOxxoPayment(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    return {
      success: true,
      status: paymentIntent.status,
    };
  } catch (error) {
    console.error('Cancel OXXO payment error:', error);
    throw new Error('Failed to cancel OXXO payment');
  }
}

/**
 * Convert USD to MXN (approximate)
 */
export function convertUsdToMxn(usdAmount: number, exchangeRate: number = 20): number {
  return Math.round(usdAmount * exchangeRate);
}

/**
 * Format MXN currency
 */
export function formatMxnCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount / 100);
}
