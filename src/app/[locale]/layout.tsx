import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { LanguageSelector } from '@/components/LanguageSelector'
import { locales } from '@/i18n/config'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Studio Nexora - AI专业摄影',
  description: '运用AI技术将您的照片转换为专业工作室人像。超逼真背景、面部优化等功能。',
  keywords: ['AI摄影', '工作室人像', '专业照片', 'AI图像处理', '人工智能', '照片处理', '专业摄影', '人像美化', '背景替换'],
  authors: [{ name: 'Studio Nexora' }],
  creator: 'Studio Nexora',
  publisher: 'Studio Nexora',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://studio-nexora.vercel.app'),
  alternates: {
    canonical: '/',
    languages: {
      'es': '/es',
      'en': '/en',
      'pt': '/pt',
      'fr': '/fr',
      'de': '/de',
      'it': '/it',
      'ja': '/ja',
      'ko': '/ko',
      'zh': '/zh',
      'ar': '/ar',
      'hi': '/hi',
      'ru': '/ru',
    },
  },
  openGraph: {
    title: 'Studio Nexora - AI专业摄影',
    description: '运用AI技术将您的照片转换为专业工作室人像。超逼真背景、面部优化等功能。',
    url: 'https://studio-nexora.vercel.app',
    siteName: 'Studio Nexora',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Studio Nexora - AI Professional Photography',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Studio Nexora - AI Professional Photography',
    description: 'Transform your photos into professional studio portraits with AI',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

interface RootLayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const messages = await getMessages()
  
  return (
    <html lang={params.locale} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <NextIntlClientProvider locale={params.locale} messages={messages}>
          <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <header className="p-4">
              <LanguageSelector currentLocale={params.locale} />
            </header>
            {children}
          </div>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}