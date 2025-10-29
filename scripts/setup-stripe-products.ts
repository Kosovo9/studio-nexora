import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

async function setupStripeProducts() {
  try {
    console.log('Setting up Stripe products and prices...');

    // Create products
    const basicProduct = await stripe.products.create({
      name: 'Nexora Basic',
      description: 'Basic plan with essential features',
      metadata: {
        plan: 'basic',
      },
    });

    const proProduct = await stripe.products.create({
      name: 'Nexora Pro',
      description: 'Professional plan with advanced features',
      metadata: {
        plan: 'pro',
      },
    });

    const vipProduct = await stripe.products.create({
      name: 'Nexora VIP',
      description: 'VIP plan with premium features and priority support',
      metadata: {
        plan: 'vip',
      },
    });

    // Create prices
    const basicPrice = await stripe.prices.create({
      product: basicProduct.id,
      unit_amount: 500, // $5.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan: 'basic',
      },
    });

    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 1500, // $15.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan: 'pro',
      },
    });

    const vipPrice = await stripe.prices.create({
      product: vipProduct.id,
      unit_amount: 3000, // $30.00
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        plan: 'vip',
      },
    });

    console.log('✅ Stripe products and prices created successfully!');
    console.log('\nAdd these to your .env file:');
    console.log(`PRICE_BASIC_ID=${basicPrice.id}`);
    console.log(`PRICE_PRO_ID=${proPrice.id}`);
    console.log(`PRICE_VIP_ID=${vipPrice.id}`);
    console.log(`\nProduct IDs:`);
    console.log(`PRODUCT_BASIC_ID=${basicProduct.id}`);
    console.log(`PRODUCT_PRO_ID=${proProduct.id}`);
    console.log(`PRODUCT_VIP_ID=${vipProduct.id}`);

  } catch (error) {
    console.error('❌ Error setting up Stripe products:', error);
    process.exit(1);
  }
}

// Run the setup
setupStripeProducts();