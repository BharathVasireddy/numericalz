/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig = {
  // Latest Next.js 14 performance optimizations (compatible version)
  experimental: {
    // Optimize package imports for faster builds
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-icons',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      'react-window',
      'recharts'
    ],
    // External packages for server components
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs', 'nodemailer'],
    // Enable optimized CSS loading (disabled to fix critters build issue)
    optimizeCss: false,
    // Enable modern bundling (if available)
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    }
  },
  
  // Enhanced compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
    // Remove React dev tools in production
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
  
  // Advanced image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'api.companieshouse.gov.uk',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Advanced webpack optimizations
  webpack: (config, { dev, isServer, webpack }) => {
    // Enhanced bundle splitting for better caching
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            // Separate vendor chunks for better caching
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: 10,
              chunks: 'all',
            },
            // UI components chunk
            ui: {
              test: /[\\/]components[\\/]ui[\\/]/,
              name: 'ui-components',
              priority: 20,
              chunks: 'all',
            },
            // Common utilities
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              chunks: 'all',
            },
          },
        },
        // Enable module concatenation
        concatenateModules: true,
        // Enable tree shaking for unused exports
        usedExports: true,
        // Enable side effects optimization
        sideEffects: false,
      }
    }
    
    // Optimize bundle size with aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    }

    // Add progress plugin for build visibility
    if (!dev) {
      config.plugins.push(
        new webpack.ProgressPlugin((percentage, message, ...args) => {
          if (process.env.CI !== 'true') {
            console.log(`${(percentage * 100).toFixed(2)}%`, message, ...args)
          }
        })
      )
    }

    // Optimize module resolution
    config.resolve.modules = ['node_modules']
    config.resolve.symlinks = false

    return config
  },
  
  // Enable advanced compression
  compress: true,
  
  // Reduce memory usage
  generateEtags: false,
  
  // Optimize static generation
  trailingSlash: false,
  
  // Remove powered by header
  poweredByHeader: false,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Production browser source maps for debugging (smaller than full maps)
  productionBrowserSourceMaps: false,
  
  // Enhanced output configuration
  output: 'standalone',
  
  // Advanced headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Performance headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          // Cache API responses
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, stale-while-revalidate=120',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          // Long-term cache for static assets
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)',
        headers: [
          // Cache static files
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Environment variables optimization
  env: {
    CUSTOM_KEY: 'numericalz-internal-app',
  },

  // Optimized redirects
  async redirects() {
    return []
  },

  // Optimized rewrites
  async rewrites() {
    return [
      {
        source: '/health',
        destination: '/api/health',
      },
    ]
  },

  // Logging configuration for monitoring
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

module.exports = withBundleAnalyzer(nextConfig) 