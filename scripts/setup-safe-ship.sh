#!/bin/bash

echo "🚀 Setting up SAFE-SHIP mode for Nexora..."

# Check if required environment variables are set
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ STRIPE_SECRET_KEY not set in environment"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in environment"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗃️ Running database migrations..."
npx prisma db push

# Setup Stripe products
echo "💳 Setting up Stripe products..."
npx tsx scripts/setup-stripe-products.ts

# Seed test data
echo "🌱 Seeding test data..."
npx tsx scripts/seed-test-data.ts

# Build the application
echo "🏗️ Building application..."
pnpm run build

echo "✅ SAFE-SHIP setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with the Stripe price IDs shown above"
echo "2. Configure your webhook endpoint in Stripe dashboard"
echo "3. Run 'pnpm dev' to start development server"
echo "4. Run 'pnpm run deploy:preview' to deploy to staging"