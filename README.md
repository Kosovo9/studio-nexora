# 🎨 Studio Nexora - AI Professional Photography Platform

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Transform your photos into professional studio portraits with AI. Hyperrealistic backgrounds, face enhancement, and more - all powered by cutting-edge AI technology.

## ✨ Features

### 🎯 Core Features
- **AI-Powered Image Processing** - Professional studio backgrounds generated with Replicate AI
- **Multiple Image Types** - Support for solo portraits and person + pet photos
- **Real-time Processing** - Live progress tracking with visual feedback
- **Multi-language Support** - 10 languages (EN, ES, PT, FR, DE, IT, JA, KO, ZH, AR)
- **Drag & Drop Upload** - Intuitive file upload with validation
- **Image Gallery** - View and download all processed images
- **Responsive Design** - Optimized for all devices (mobile, tablet, desktop)

### 💳 Payment & Subscriptions
- **Stripe Integration** - Secure payment processing
- **Multiple Plans** - Basic ($5), Pro ($15), VIP ($30)
- **Subscription Management** - Recurring billing with Stripe
- **Payment History** - Track all transactions

### 🔒 Security & Performance
- **Rate Limiting** - Prevent abuse with intelligent rate limiting
- **Input Validation** - Zod schema validation for all inputs
- **CSRF Protection** - Secure against cross-site attacks
- **Image Optimization** - Sharp for image processing and optimization
- **Watermark Protection** - Invisible watermarks for legal protection
- **CDN Ready** - Optimized for content delivery networks

### 📊 Analytics & Monitoring
- **Event Tracking** - Comprehensive analytics with Prisma
- **Error Logging** - Detailed error tracking and reporting
- **Performance Metrics** - Processing time and success rates
- **User Analytics** - Track user behavior and engagement

### 🎨 UI/UX Excellence
- **Framer Motion Animations** - Smooth, professional animations
- **Glass Morphism Design** - Modern, elegant UI
- **Dark Mode** - Eye-friendly dark theme
- **Accessibility** - WCAG 2.1 AA compliant
- **Toast Notifications** - Real-time user feedback
- **Loading States** - Skeleton screens and progress indicators

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL database
- Replicate API account
- Stripe account (for payments)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/studio-nexora.git
cd studio-nexora
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/studio_nexora"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Replicate AI
REPLICATE_API_TOKEN="your-replicate-token"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

4. **Set up the database**
```bash
npm run db:push
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
studio-nexora/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/          # File upload endpoint
│   │   │   ├── studio/          # AI processing endpoint
│   │   │   ├── payment/         # Payment processing
│   │   │   └── webhook/         # Stripe webhooks
│   │   ├── globals.css          # Global styles
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Main page (100x optimized)
│   ├── components/              # Reusable components
│   ├── lib/
│   │   ├── prisma.ts           # Database client
│   │   ├── replicate.ts        # AI processing
│   │   ├── stripe.ts           # Payment processing
│   │   ├── store.ts            # State management (Zustand)
│   │   ├── translations.ts     # i18n translations
│   │   ├── utils.ts            # Utility functions
│   │   └── validations.ts      # Zod schemas
│   └── types/
│       └── index.ts            # TypeScript types
├── prisma/
│   └── schema.prisma           # Database schema
├── public/
│   └── uploads/                # Uploaded images
├── .env.example                # Environment template
├── next.config.js              # Next.js config
├── tailwind.config.ts          # Tailwind config
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Dropzone** - File upload component
- **React Hot Toast** - Toast notifications
- **Zustand** - State management
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Relational database
- **Sharp** - Image processing
- **Zod** - Schema validation

### AI & Processing
- **Replicate** - AI model hosting
- **Stability AI SDXL** - Image generation
- **GFPGAN** - Face enhancement
- **Real-ESRGAN** - Image upscaling
- **Rembg** - Background removal

### Payment & Auth
- **Stripe** - Payment processing
- **NextAuth.js** - Authentication (optional)

### Analytics & Monitoring
- **Vercel Analytics** - Web analytics
- **Vercel Speed Insights** - Performance monitoring
- **Custom Analytics** - Event tracking with Prisma

## 🎯 API Endpoints

### Upload Image
```typescript
POST /api/upload
Content-Type: multipart/form-data

Body:
- file: File (max 10MB)
- imageType: 'person' | 'person-pet'

Response:
{
  success: true,
  url: "/uploads/filename.jpg",
  filename: "filename.jpg",
  size: 1234567
}
```

### Process Image
```typescript
POST /api/studio
Content-Type: application/json

Body:
{
  imageUrl: string,
  imageType: 'person' | 'person-pet',
  userId?: string
}

Response:
{
  success: true,
  id: string,
  processedUrls: string[],
  watermarkId: string,
  processingTime: number
}
```

### Create Payment
```typescript
POST /api/payment
Content-Type: application/json

Body:
{
  plan: 'basic' | 'pro' | 'vip',
  userId: string,
  email: string,
  type?: 'intent' | 'checkout'
}

Response:
{
  success: true,
  clientSecret: string,
  amount: number
}
```

### Webhook Handler
```typescript
POST /api/webhook
Headers:
- stripe-signature: string

Body: Stripe event payload
```

## 🔧 Configuration

### Database Schema

The application uses Prisma with PostgreSQL. Key models:

- **User** - User accounts
- **ProcessedImage** - Image processing records
- **Payment** - Payment transactions
- **Subscription** - Subscription management
- **Analytics** - Event tracking
- **RateLimit** - Rate limiting data

### Environment Variables

See `.env.example` for all required environment variables.

### Stripe Setup

1. Create a Stripe account
2. Get your API keys from the dashboard
3. Create products and prices for each plan
4. Set up webhook endpoint: `https://yourdomain.com/api/webhook`
5. Add webhook secret to `.env`

### Replicate Setup

1. Create a Replicate account
2. Get your API token
3. Add to `.env` as `REPLICATE_API_TOKEN`

## 📊 Performance Optimizations

### Image Optimization
- Sharp for server-side processing
- Next.js Image component for lazy loading
- WebP format support
- Responsive images with srcset

### Code Splitting
- Dynamic imports for heavy components
- Route-based code splitting
- Optimized bundle size

### Caching
- Static asset caching
- API response caching
- Database query optimization

### SEO
- Meta tags optimization
- Open Graph tags
- Twitter Card tags
- Sitemap generation

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Format code
npm run format
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

```bash
# Or use Vercel CLI
npm i -g vercel
vercel
```

### Docker

```bash
# Build image
docker build -t studio-nexora .

# Run container
docker run -p 3000:3000 studio-nexora
```

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔐 Security Best Practices

- ✅ Input validation with Zod
- ✅ Rate limiting on all endpoints
- ✅ CSRF protection
- ✅ Secure headers (CSP, HSTS, etc.)
- ✅ File type and size validation
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection
- ✅ Environment variable security

## 📈 Monitoring & Analytics

### Built-in Analytics
- Image processing events
- Payment completions
- Error tracking
- User engagement

### External Services
- Vercel Analytics for web vitals
- Stripe Dashboard for payments
- Database monitoring with Prisma

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Replicate](https://replicate.com/) - AI Model Hosting
- [Stripe](https://stripe.com/) - Payment Processing
- [Vercel](https://vercel.com/) - Hosting Platform
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework

## 📞 Support

- 📧 Email: support@studionexora.com
- 💬 Discord: [Join our community](https://discord.gg/studionexora)
- 🐦 Twitter: [@studionexora](https://twitter.com/studionexora)
- 📖 Documentation: [docs.studionexora.com](https://docs.studionexora.com)

## 🗺️ Roadmap

- [ ] Video processing support
- [ ] Batch processing
- [ ] Mobile app (React Native)
- [ ] Advanced editing tools
- [ ] Social media integration
- [ ] Marketplace for backgrounds
- [ ] API for developers
- [ ] White-label solution

---

Made with ❤️ by Studio Nexora Team

**100x Optimized** | **Production Ready** | **Enterprise Grade**
#   s t u d i o - n e x o r a  
 