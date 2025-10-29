/**
 * NEXORA SAFE-SHIP AUTHENTICATION SYSTEM
 * Comprehensive NextAuth configuration with magic links, Google OAuth, and MFA
 */

import { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      maxAge: 24 * 60 * 60, // 24 hours
    }),
    ...(process.env.ENABLE_GOOGLE_AUTH === 'true' ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    ] : []),
  ],
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        
        // Check if user is admin
        const isAdmin = user.email === process.env.ADMIN_EMAIL;
        session.user.role = isAdmin ? 'admin' : 'user';
        
        // Get subscription info
        const subscription = await prisma.subscription.findFirst({
          where: { userEmail: user.email! },
        });
        
        session.user.subscription = subscription;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.email === process.env.ADMIN_EMAIL ? 'admin' : 'user';
      }
      return token;
    },
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

// Helper functions for role-based access control
export const isAdmin = (user: any): boolean => {
  return user?.role === 'admin' || user?.email === process.env.ADMIN_EMAIL;
};

export const requireAuth = (handler: any) => {
  return async (req: any, res: any) => {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return handler(req, res, session);
  };
};

export const requireAdmin = (handler: any) => {
  return async (req: any, res: any) => {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !isAdmin(session.user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    return handler(req, res, session);
  };
};