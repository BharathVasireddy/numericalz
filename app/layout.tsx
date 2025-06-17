import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { SimpleToaster } from '@/components/ui/simple-toaster'
import { PerformanceTracker } from '@/components/performance-tracker'

// Optimized font loading with display: 'swap' for better performance
const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
  preload: true,
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
  adjustFontFallback: true,
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
  // Performance optimization metadata
  other: {
    'application-name': 'Numericalz Internal System',
    'msapplication-TileColor': '#0f172a',
    'msapplication-config': '/browserconfig.xml',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zoom for accessibility
  minimumScale: 1,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  colorScheme: 'light dark',
}

/**
 * High-Performance Root Layout Component for the Numericalz Internal Management System
 * 
 * This layout:
 * - Implements advanced performance optimization techniques
 * - Sets up optimized font loading with proper fallbacks
 * - Configures comprehensive providers (Auth, Query, Theme, Performance)
 * - Includes resource preloading and critical resource hints
 * - Implements proper SEO and accessibility configuration
 * - Sets up performance monitoring and analytics
 * - Ensures proper hydration and SSR optimization
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html 
      lang="en" 
      className={plusJakartaSans.variable} 
      suppressHydrationWarning
    >
      <head>
        {/* Critical resource preloading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external services */}
        <link rel="dns-prefetch" href="https://api.companieshouse.gov.uk" />
        <link rel="dns-prefetch" href="https://upstash.io" />
        
        {/* Preload critical CSS (if using external stylesheets) */}
        <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        
        {/* Favicon and app icons with optimized sizes */}
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Security and performance headers */}
        <meta httpEquiv="Content-Security-Policy" content="upgrade-insecure-requests" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Performance optimization meta tags */}
        <meta name="renderer" content="webkit" />
        <meta httpEquiv="Cache-Control" content="public, max-age=31536000, immutable" />
        
        {/* Prefetch critical routes for faster navigation */}
        <link rel="prefetch" href="/dashboard" />
        <link rel="prefetch" href="/dashboard/clients" />
        <link rel="prefetch" href="/api/auth/session" />
        
        {/* Critical CSS inlining placeholder - can be populated by build process */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS for above-the-fold content */
            :root {
              --font-plus-jakarta-sans: ${plusJakartaSans.style.fontFamily};
            }
            body {
              font-family: var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeLegibility;
            }
            /* Prevent layout shift */
            #__next {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }
            /* Loading indicator styles */
            .loading-indicator {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(90deg, #3b82f6, #06b6d4);
              z-index: 9999;
              animation: loading 2s ease-in-out infinite;
            }
            @keyframes loading {
              0%, 100% { transform: translateX(-100%); }
              50% { transform: translateX(100%); }
            }
          `
        }} />
      </head>
      <body className={`${plusJakartaSans.className} antialiased`}>
        {/* Loading indicator for better perceived performance */}
        <div id="loading-indicator" className="loading-indicator" style={{ display: 'none' }} />
        
        {/* Main application providers */}
        <Providers>
          <div className="relative flex min-h-screen flex-col bg-background">
            {/* Main content area with proper semantic structure */}
            <main className="flex-1" role="main">
              {children}
            </main>
            
            {/* Footer placeholder for future use */}
            <footer className="sr-only" role="contentinfo">
              <p>Numericalz Internal Management System</p>
            </footer>
          </div>
          
          {/* Global toast notifications */}
          <SimpleToaster />
          
          {/* Performance tracking component */}
          <PerformanceTracker />
        </Providers>

        {/* Performance monitoring script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Performance monitoring initialization (simplified for production)
              (function() {
                if (typeof window !== 'undefined' && window.performance) {
                  window.addEventListener('load', function() {
                    // Hide loading indicator
                    const indicator = document.getElementById('loading-indicator');
                    if (indicator) indicator.style.display = 'none';
                  });
                }
              })();
            `
          }}
        />

        {/* Service Worker registration for PWA capabilities */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && '${process.env.NODE_ENV}' === 'production') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('✅ Service Worker registered successfully:', registration.scope);
                  }).catch(function(error) {
                    console.log('❌ Service Worker registration failed:', error);
                  });
                });
              }
            `
          }}
        />
      </body>
    </html>
  )
} 