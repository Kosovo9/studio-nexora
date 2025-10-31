import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';

// Define locales and default
const locales = ['es', 'en', 'pt', 'fr', 'it', 'de', 'nl', 'sv', 'no', 'da', 'ja', 'ko', 'zh'];
const defaultLocale = 'es';

// Create next-intl middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

// Define protected routes (requires authentication)
const isProtectedRoute = createRouteMatcher([
  '/studio(.*)',
  '/admin(.*)',
  '/upload(.*)',
  '/success(.*)',
]);

// Combine Clerk and next-intl middleware
export default clerkMiddleware(async (auth, request) => {
  // Check if route is protected
  if (isProtectedRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      // Redirect to sign-in if not authenticated
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('redirect_url', request.url);
      return Response.redirect(signInUrl);
    }
  }

  // Apply next-intl middleware for locale handling
  return intlMiddleware(request);
});

export const config = {
  matcher: [
    // Skip all internal Next.js paths
    '/((?!_next|_vercel|.*\\..*|api|favicon.ico|robots.txt|sitemap.xml).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

// TODO: Rate limiting for generation endpoints should be implemented here
// or in API route handlers using @/lib/ratelimit
// Example: Check rate limits for /api/studio and /api/upload routes
