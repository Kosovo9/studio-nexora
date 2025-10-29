#!/bin/bash

# Studio Nexora Production Deployment Script
# Usage: ./scripts/deploy-production.sh [platform]
# Platforms: vercel, docker, manual

set -e

PLATFORM=${1:-vercel}
PROJECT_NAME="studio-nexora"

echo "🚀 Deploying Studio Nexora to $PLATFORM..."

# Pre-deployment checks
echo "📋 Running pre-deployment checks..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from .env.example"
    exit 1
fi

# Check if required environment variables are set
required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "STRIPE_SECRET_KEY" "REPLICATE_API_TOKEN")
for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env; then
        echo "❌ Required environment variable $var not found in .env"
        exit 1
    fi
done

echo "✅ Environment variables check passed"

# Run tests
echo "🧪 Running tests..."
pnpm run verify
echo "✅ Tests passed"

# Build check
echo "🔨 Testing build..."
pnpm run build
echo "✅ Build successful"

case $PLATFORM in
    "vercel")
        echo "🌐 Deploying to Vercel..."
        
        # Install Vercel CLI if not present
        if ! command -v vercel &> /dev/null; then
            echo "Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        # Deploy to production
        vercel --prod --yes
        
        echo "✅ Deployed to Vercel successfully!"
        ;;
        
    "docker")
        echo "🐳 Building Docker image..."
        
        # Build Docker image
        docker build -t $PROJECT_NAME:latest .
        
        # Tag for registry (optional)
        if [ ! -z "$DOCKER_REGISTRY" ]; then
            docker tag $PROJECT_NAME:latest $DOCKER_REGISTRY/$PROJECT_NAME:latest
            docker push $DOCKER_REGISTRY/$PROJECT_NAME:latest
            echo "✅ Pushed to Docker registry: $DOCKER_REGISTRY/$PROJECT_NAME:latest"
        fi
        
        echo "✅ Docker image built successfully!"
        ;;
        
    "manual")
        echo "📦 Preparing manual deployment..."
        
        # Create deployment package
        mkdir -p dist
        cp -r .next dist/
        cp -r public dist/
        cp package.json dist/
        cp -r prisma dist/
        
        # Create deployment instructions
        cat > dist/DEPLOY.md << EOF
# Manual Deployment Instructions

1. Upload all files to your server
2. Install dependencies: npm install --production
3. Set environment variables
4. Run database migrations: npx prisma db push
5. Start the application: npm start

Required environment variables:
$(grep -v '^#' .env.example | grep '=' | cut -d'=' -f1 | sed 's/^/- /')
EOF
        
        echo "✅ Manual deployment package created in dist/"
        ;;
        
    *)
        echo "❌ Unknown platform: $PLATFORM"
        echo "Available platforms: vercel, docker, manual"
        exit 1
        ;;
esac

echo "🎉 Deployment completed successfully!"
echo "📊 Don't forget to:"
echo "  - Set up monitoring"
echo "  - Configure webhooks"
echo "  - Test payment flows"
echo "  - Update DNS records (if needed)"