import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { SimpleToaster } from '@/components/ui/simple-toaster'

const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
  weight: ['300', '400', '500', '600', '700', '800']
})

export const metadata: Metadata = {
  title: {
    default: 'Numericalz Internal Management System',
    template: '%s | Numericalz'
  },
  description: 'Internal management system for Numericalz - UK accounting firm client and task management platform',
  keywords: ['accounting', 'client management', 'task management', 'UK accounting firm', 'numericalz'],
  authors: [{ name: 'Numericalz Development Team' }],
  creator: 'Numericalz',
  publisher: 'Numericalz',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    title: 'Numericalz Internal Management System',
    description: 'Internal management system for Numericalz - UK accounting firm',
    siteName: 'Numericalz Internal System',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Numericalz Internal Management System',
    description: 'Internal management system for Numericalz - UK accounting firm',
  },

}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

/**
 * Root layout component for the Numericalz Internal Management System
 * 
 * This layout:
 * - Sets up the global HTML structure
 * - Configures fonts and styling
 * - Provides authentication, query client, and theme providers
 * - Includes global toast notifications
 * - Ensures proper metadata and SEO configuration
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={plusJakartaSans.variable} suppressHydrationWarning>
      <head>
        {/* Preload critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Security headers for CSP (additional to Next.js config) */}
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
      </head>
      <body className={`${plusJakartaSans.className} antialiased`}>
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <div className="flex-1">
              {children}
            </div>
          </div>
          <SimpleToaster />
        </Providers>
      </body>
    </html>
  )
} 