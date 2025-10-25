# 🚀 Studio Nexora - Complete Setup Guide

Step-by-step guide to get Studio Nexora running on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - Comes with Node.js
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

### Verify Installation

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v9.0.0 or higher
psql --version  # Should be v14.0 or higher
```

## 🎯 Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/studio-nexora.git

# Navigate to project directory
cd studio-nexora
```

## 📦 Step 2: Install Dependencies

```bash
# Install all dependencies
npm install

# This will install:
# - Next.js 14
# - React 18
# - TypeScript
# - Tailwind CSS
# - Prisma
# - And all other dependencies
```

**Expected output:**
```
added 500+ packages in 30s
```

## 🗄️ Step 3: Setup Database

### Option A: Local PostgreSQL

1. **Create Database**
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE studio_nexora;

# Create user (optional)
CREATE USER studio_user WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE studio_nexora TO studio_user;

# Exit
\q
```

2. **Get Connection String**
```
postgresql://studio_user:your_password@localhost:5432/studio_nexora
```

### Option B: Cloud Database (Recommended for Production)

**Supabase (Free Tier Available):**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string from Settings > Database
4. Use the "Connection pooling" string for better performance

**Railway (Free Tier Available):**
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL service
4. Copy connection string

**Vercel Postgres:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Create database
vercel postgres create
```

## 🔑 Step 4: Setup Environment Variables

1. **Copy the example file**
```bash
cp .env.example .env
```

2. **Edit .env file**
```bash
# Windows
notepad .env

# Mac/Linux
nano .env
```

3. **Fill in the values:**

```env
# ============================================
# DATABASE
# ============================================
DATABASE_URL="postgresql://user:password@localhost:5432/studio_nexora"

# ============================================
# NEXTAUTH (Authentication)
# ============================================
NEXTAUTH_URL="http://localhost:3000"
# Generate secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-key-here"

# ============================================
# REPLICATE AI (Required for image processing)
# ============================================
# Get your token from: https://replicate.com/account/api-tokens
REPLICATE_API_TOKEN="r8_your_token_here"

# ============================================
# STRIPE (Payment Processing)
# ============================================
# Get test keys from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY="sk_test_your_key_here"
STRIPE_PUBLISHABLE_KEY="pk_test_your_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Create products and get price IDs from Stripe Dashboard
STRIPE_PRICE_BASIC="price_test_basic_id"
STRIPE_PRICE_PRO="price_test_pro_id"
STRIPE_PRICE_VIP="price_test_vip_id"

# ============================================
# APP CONFIGURATION
# ============================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_MAX_FILE_SIZE="10485760"
NODE_ENV="development"

# ============================================
# ANALYTICS (Optional)
# ============================================
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

## 🎨 Step 5: Setup External Services

### A. Replicate AI (Required)

1. **Sign up** at [replicate.com](https://replicate.com)
2. **Get API Token**:
   - Go to Account Settings
   - Click "API Tokens"
   - Create new token
   - Copy and paste into `.env`

### B. Stripe (Required for Payments)

1. **Sign up** at [stripe.com](https://stripe.com)

2. **Get API Keys**:
   - Go to Developers > API Keys
   - Copy "Publishable key" and "Secret key"
   - Use TEST mode keys for development

3. **Create Products**:
   ```bash
   # Go to Products > Add Product
   
   # Create 3 products:
   1. Basic Plan - $5.00
   2. Pro Plan - $15.00
   3. VIP Plan - $30.00
   
   # Copy the Price IDs for each
   ```

4. **Setup Webhook** (for local testing):
   ```bash
   # Install Stripe CLI
   # Windows: Download from https://github.com/stripe/stripe-cli/releases
   # Mac: brew install stripe/stripe-cli/stripe
   
   # Login
   stripe login
   
   # Forward webhooks to local server
   stripe listen --forward-to localhost:3000/api/webhook
   
   # Copy the webhook signing secret to .env
   ```

### C. AWS S3 (Optional - for image storage)

1. **Create S3 Bucket**
2. **Create IAM User** with S3 permissions
3. **Get Access Keys**
4. **Add to .env**:
   ```env
   AWS_ACCESS_KEY_ID="your-access-key"
   AWS_SECRET_ACCESS_KEY="your-secret-key"
   AWS_REGION="us-east-1"
   AWS_BUCKET_NAME="studio-nexora-images"
   ```

## 🗃️ Step 6: Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

**Expected output:**
```
✔ Generated Prisma Client
✔ Database schema pushed successfully
```

## 🏃 Step 7: Run Development Server

```bash
# Start the development server
npm run dev
```

**Expected output:**
```
▲ Next.js 14.1.0
- Local:        http://localhost:3000
- Network:      http://192.168.1.x:3000

✓ Ready in 2.5s
```

## 🌐 Step 8: Open in Browser

1. Open your browser
2. Navigate to [http://localhost:3000](http://localhost:3000)
3. You should see the Studio Nexora homepage!

## ✅ Step 9: Test the Application

### Test Image Upload
1. Click "Upload Photo" or drag & drop an image
2. Select image type (Solo Me or Me + Pet)
3. Check the consent checkbox
4. Click "Create Studio Photo"

### Test Payment Flow
1. Click on a pricing plan
2. Use Stripe test card: `4242 4242 4242 4242`
3. Any future date for expiry
4. Any 3 digits for CVC
5. Any 5 digits for ZIP

## 🔧 Troubleshooting

### Issue: Database Connection Failed

**Solution:**
```bash
# Check if PostgreSQL is running
# Windows: Check Services
# Mac: brew services list
# Linux: sudo systemctl status postgresql

# Test connection
psql -U postgres -d studio_nexora

# Verify DATABASE_URL in .env
```

### Issue: Module Not Found

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json .next
npm install
```

### Issue: Prisma Client Not Generated

**Solution:**
```bash
# Regenerate Prisma Client
npx prisma generate

# If still failing, check DATABASE_URL
```

### Issue: Port 3000 Already in Use

**Solution:**
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Or use different port:
PORT=3001 npm run dev
```

### Issue: Replicate API Errors

**Solution:**
```bash
# Verify API token is correct
# Check Replicate account has credits
# Test token: curl -H "Authorization: Token $REPLICATE_API_TOKEN" https://api.replicate.com/v1/models
```

### Issue: Stripe Webhook Not Working

**Solution:**
```bash
# Make sure Stripe CLI is running
stripe listen --forward-to localhost:3000/api/webhook

# Verify webhook secret in .env matches CLI output
```

## 📚 Additional Commands

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Start production server
npm start

# Database commands
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Generate Prisma Client
```

## 🎓 Next Steps

1. **Explore the Code**
   - Check `src/app/page.tsx` for the main UI
   - Review `src/app/api/` for API routes
   - Look at `src/lib/` for utilities

2. **Customize**
   - Update branding in `src/app/layout.tsx`
   - Modify pricing in `src/app/page.tsx`
   - Adjust AI prompts in `src/lib/replicate.ts`

3. **Deploy**
   - Follow `DEPLOYMENT.md` for production deployment
   - Test thoroughly before going live
   - Set up monitoring and analytics

4. **Read Documentation**
   - `README.md` - Project overview
   - `DEPLOYMENT.md` - Deployment guide
   - API documentation in each route file

## 🆘 Getting Help

If you're stuck:

1. **Check the logs** - Look for error messages in terminal
2. **Review environment variables** - Ensure all are set correctly
3. **Check database connection** - Verify PostgreSQL is running
4. **Test API keys** - Ensure Replicate and Stripe keys are valid
5. **Open an issue** - Create issue on GitHub with error details
6. **Contact support** - support@studionexora.com

## 🎉 Success!

If you've made it this far, congratulations! Your Studio Nexora development environment is ready.

**What you can do now:**
- ✅ Upload and process images with AI
- ✅ Test payment flows
- ✅ Customize the application
- ✅ Deploy to production

---

**Happy Coding!** 🚀

Made with ❤️ by Studio Nexora Team
