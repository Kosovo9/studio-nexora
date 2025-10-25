# 🚀 Deployment Guide - Studio Nexora

Complete guide for deploying Studio Nexora to production.

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] All environment variables configured
- [ ] Database connection tested
- [ ] Replicate API token verified
- [ ] Stripe keys (live mode) configured
- [ ] Webhook endpoints set up
- [ ] Domain/subdomain configured

### 2. Security
- [ ] NEXTAUTH_SECRET generated (use: `openssl rand -base64 32`)
- [ ] Database credentials secured
- [ ] API keys stored securely
- [ ] CORS policies configured
- [ ] Rate limiting tested
- [ ] SSL certificate installed

### 3. Performance
- [ ] Images optimized
- [ ] Bundle size checked
- [ ] Database indexes created
- [ ] CDN configured (optional)
- [ ] Caching strategy implemented

### 4. Testing
- [ ] All API endpoints tested
- [ ] Payment flow tested (test mode)
- [ ] Image processing tested
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility checked

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

**Pros:**
- Zero configuration
- Automatic HTTPS
- Global CDN
- Serverless functions
- Easy rollbacks
- Preview deployments

**Steps:**

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login to Vercel**
```bash
vercel login
```

3. **Deploy**
```bash
vercel
```

4. **Set Environment Variables**
```bash
# Via CLI
vercel env add DATABASE_URL
vercel env add REPLICATE_API_TOKEN
vercel env add STRIPE_SECRET_KEY
# ... add all variables

# Or via Vercel Dashboard:
# Settings > Environment Variables
```

5. **Configure Database**
```bash
# Use Vercel Postgres or external provider
# Update DATABASE_URL in environment variables
```

6. **Set up Webhooks**
```bash
# Stripe webhook URL:
https://your-domain.vercel.app/api/webhook

# Add to Stripe Dashboard > Developers > Webhooks
```

7. **Deploy to Production**
```bash
vercel --prod
```

### Option 2: Docker

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - REPLICATE_API_TOKEN=${REPLICATE_API_TOKEN}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=studio_nexora
      - POSTGRES_PASSWORD=your_password
      - POSTGRES_DB=studio_nexora
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

**Deploy:**
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 3: AWS (EC2 + RDS)

**Steps:**

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.medium or larger
   - Configure security groups (80, 443, 22)

2. **Install Dependencies**
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

3. **Clone and Setup**
```bash
# Clone repository
git clone https://github.com/yourusername/studio-nexora.git
cd studio-nexora

# Install dependencies
npm install

# Create .env file
nano .env
# Add all environment variables

# Build
npm run build

# Start with PM2
pm2 start npm --name "studio-nexora" -- start
pm2 save
pm2 startup
```

4. **Configure Nginx**
```bash
sudo nano /etc/nginx/sites-available/studio-nexora
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/studio-nexora /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **Setup SSL with Let's Encrypt**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

6. **Setup RDS Database**
   - Create PostgreSQL instance
   - Configure security groups
   - Update DATABASE_URL in .env

### Option 4: DigitalOcean App Platform

**Steps:**

1. **Create App**
   - Connect GitHub repository
   - Select branch (main/production)

2. **Configure Build**
   - Build Command: `npm run build`
   - Run Command: `npm start`

3. **Add Environment Variables**
   - Add all variables from .env.example

4. **Add Database**
   - Create managed PostgreSQL database
   - Connect to app

5. **Deploy**
   - Click "Deploy"
   - Monitor build logs

## 🗄️ Database Setup

### PostgreSQL (Production)

**Option 1: Vercel Postgres**
```bash
# Install Vercel Postgres
vercel postgres create

# Get connection string
vercel postgres connect
```

**Option 2: Supabase**
```bash
# Create project at supabase.com
# Get connection string from Settings > Database
# Update DATABASE_URL
```

**Option 3: Railway**
```bash
# Create project at railway.app
# Add PostgreSQL service
# Copy connection string
```

**Run Migrations:**
```bash
# Push schema to database
npx prisma db push

# Or use migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## 🔐 Environment Variables (Production)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret-key"

# Replicate AI
REPLICATE_API_TOKEN="r8_live_your_token"

# Stripe (LIVE KEYS)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Price IDs (Production)
STRIPE_PRICE_BASIC="price_live_basic"
STRIPE_PRICE_PRO="price_live_pro"
STRIPE_PRICE_VIP="price_live_vip"

# App Configuration
NEXT_PUBLIC_APP_URL="https://your-domain.com"
NEXT_PUBLIC_MAX_FILE_SIZE="10485760"
NODE_ENV="production"

# Analytics (Optional)
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
```

## 🔄 CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 📊 Monitoring & Logging

### 1. Vercel Analytics
- Automatically enabled on Vercel
- View in Vercel Dashboard

### 2. Sentry (Error Tracking)
```bash
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs
```

### 3. LogRocket (Session Replay)
```bash
npm install logrocket

# Add to layout.tsx
import LogRocket from 'logrocket';
LogRocket.init('your-app-id');
```

### 4. Custom Logging
```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta);
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
  },
};
```

## 🔧 Post-Deployment

### 1. Verify Deployment
- [ ] Homepage loads correctly
- [ ] Image upload works
- [ ] AI processing works
- [ ] Payment flow works
- [ ] All API endpoints respond
- [ ] SSL certificate valid
- [ ] Mobile responsive

### 2. Setup Monitoring
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (Vercel Analytics)
- [ ] Database monitoring

### 3. Configure Backups
```bash
# Database backups
# Automated daily backups recommended

# For PostgreSQL
pg_dump -U username -d database > backup.sql

# Restore
psql -U username -d database < backup.sql
```

### 4. Setup Alerts
- Database connection failures
- API errors
- Payment failures
- High error rates
- Performance degradation

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Failed**
```bash
# Check connection string
# Verify SSL mode
# Check firewall rules
# Test connection: npx prisma db pull
```

**2. Build Failures**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

**3. API Errors**
```bash
# Check environment variables
# Verify API keys
# Check rate limits
# Review logs
```

**4. Image Upload Issues**
```bash
# Check file permissions
# Verify upload directory exists
# Check file size limits
# Review Sharp configuration
```

## 📈 Scaling

### Horizontal Scaling
- Use Vercel's automatic scaling
- Or configure load balancer (AWS ALB, Nginx)

### Database Scaling
- Connection pooling (PgBouncer)
- Read replicas
- Caching (Redis)

### CDN Configuration
- Cloudflare
- AWS CloudFront
- Vercel Edge Network

## 🔒 Security Hardening

### 1. Environment Variables
- Never commit .env files
- Use secrets management (Vercel, AWS Secrets Manager)
- Rotate keys regularly

### 2. Rate Limiting
- Already implemented in middleware
- Consider Cloudflare rate limiting

### 3. DDoS Protection
- Cloudflare
- AWS Shield
- Vercel DDoS protection

### 4. Regular Updates
```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Security audit
npm audit
npm audit fix
```

## 📞 Support

If you encounter issues during deployment:

1. Check the logs
2. Review environment variables
3. Consult the README.md
4. Open an issue on GitHub
5. Contact support@studionexora.com

---

**Deployment Checklist Complete!** ✅

Your Studio Nexora application is now ready for production! 🎉
