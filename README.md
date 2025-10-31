# Nexora Studio - SAFE-SHIP Mode 🚀

Professional AI-powered photo enhancement platform with comprehensive internationalization, authentication, and payment processing.

## 🌟 SAFE-SHIP Features

- ✅ **12 Language Support**: es, en, pt, fr, it, de, nl, sv, no, da, ja, ko
- ✅ **NextAuth Integration**: Email magic links + Google OAuth
- ✅ **Stripe Payments**: 3 subscription tiers with secure webhooks
- ✅ **Admin Dashboard**: Complete content and system management
- ✅ **Image Processing**: AI-powered with watermarks and job queue
- ✅ **Rate Limiting**: API protection and abuse prevention
- ✅ **Comprehensive Testing**: Playwright + Lighthouse CI
- ✅ **Security Headers**: HSTS, CSP, and more via Vercel
- ✅ **Legal Compliance**: Terms, Privacy, GDPR-ready

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (LTS)
- pnpm 8+
- PostgreSQL database
- Redis instance
- Stripe account (test mode)
- Vercel account

### Environment Setup

1. Copy environment template:
```bash
cp .env.example .env
```

2. Configure required variables:
```env
# Authentication
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAIL=admin@yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nexora

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PRICE_BASIC_ID=price_...
PRICE_PRO_ID=price_...
PRICE_VIP_ID=price_...

# Storage (R2/S3)
STORAGE_BUCKET=your-bucket
STORAGE_ENDPOINT=https://your-endpoint
STORAGE_KEY=your-access-key
STORAGE_SECRET=your-secret-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

### Installation & Setup

```bash
# Quick setup (recommended)
pnpm run setup

# Or manual setup:
pnpm install
pnpm run setup:safe-ship

# Start development server
pnpm dev
```

## 📋 Available Scripts

### Development
```bash
pnpm dev                 # Start development server
pnpm build              # Build for production
pnpm start              # Start production server
```

### Database
```bash
pnpm run db:push        # Push schema changes
pnpm run db:studio      # Open Prisma Studio
pnpm run db:generate    # Generate Prisma client
pnpm run seed           # Seed test data
```

### Testing & QA
```bash
pnpm run verify         # Lint + type-check
pnpm run test           # Run Playwright tests
pnpm run test:ui        # Run tests with UI
pnpm run lighthouse     # Run Lighthouse audit
pnpm run qa:full        # Complete QA pipeline
```

### Deployment
```bash
pnpm run deploy:preview # Deploy to staging
pnpm run deploy         # Deploy to production
```

### Maintenance
```bash
pnpm run worker:start   # Start job worker
pnpm run queue:clean    # Clean old jobs
pnpm run setup:stripe   # Setup Stripe products
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 14 with App Router
- **Authentication**: NextAuth.js with email + Google
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Stripe with webhooks
- **Storage**: Cloudflare R2 / AWS S3
- **Queue**: Bull with Redis
- **Styling**: Tailwind CSS + Radix UI
- **i18n**: next-intl with 12 languages
- **Testing**: Playwright + Lighthouse CI

### Key Components

#### Authentication Flow
