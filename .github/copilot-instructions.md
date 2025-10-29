# Studio Nexora - AI Assistant Instructions

This document helps AI assistants understand the key patterns, workflows, and conventions in Studio Nexora, an AI-powered professional photography platform.

## Core Architecture

- Next.js 14 app router with TypeScript
- Prisma ORM with PostgreSQL database
- Replicate for AI image processing pipeline
- Stripe for payments and subscriptions
- Mobile companion app in Flutter

## Key Concepts

### Image Processing Pipeline

The core image processing flow in `src/lib/replicate.ts`:
1. Background removal (rembg model)
2. Face enhancement (GFPGAN)
3. Studio background generation (SDXL)
4. Image upscaling (Real-ESRGAN)

See `processImagePipeline()` for the full workflow.

### State Management

- Global state: Zustand store in `src/lib/store.ts`
- Persistence: Limited to language and last 10 images
- Key slices: user, images, currentImage, processing status

### Data Models

Critical Prisma models:
- `User`: Core user account
- `ProcessedImage`: Tracks image processing status and results
- `Payment`/`Subscription`: Stripe integration 
- `Analytics`: Event tracking
- `RateLimit`: API rate limiting

### API Routes

- `/api/upload`: File upload with validation
- `/api/studio`: AI processing endpoint
- `/api/payment`: Stripe payment handling
- `/api/webhook`: Stripe webhooks

## Development Workflow

1. Run development environment:
```bash
npm install
npm run dev
```

2. Database migrations:
```bash
npx prisma generate
npx prisma db push
```

3. Test workflow:
```bash
npm run type-check
npm run lint
npm run format
```

## Common Patterns

### Error Handling
- Prisma errors in `catch` blocks should be logged and rethrown
- API routes use Zod for request validation
- Client-side errors show toast notifications

### Security
- Rate limiting on API routes
- Input validation with Zod schemas
- File type/size validation on uploads
- Secure headers and CSRF protection

### Performance
- Image optimization with Sharp
- CDN-ready asset handling
- Caching strategies for API responses
- Code splitting and lazy loading

## Key Files

- `src/lib/replicate.ts`: AI processing pipeline
- `src/lib/store.ts`: Global state management
- `prisma/schema.prisma`: Database schema
- `src/lib/validations.ts`: Zod validation schemas
- `src/lib/translations.ts`: i18n translations