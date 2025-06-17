'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initPerformanceMonitoring, trackWebVital } from '@/lib/performance'
import type { NextWebVitalsMetric } from 'next/app'

/**
 * Performance Tracker Component
 * 
 * This component:
 * - Initializes performance monitoring on mount
 * - Tracks Web Vitals metrics (LCP, FID, CLS, FCP, TTFB)
 * - Monitors route changes and page transitions
 * - Reports performance data to analytics
 * - Provides real-time performance feedback in development
 */
export function PerformanceTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Initialize performance monitoring
    initPerformanceMonitoring()

    // Track Core Web Vitals using Next.js built-in support
    if (typeof window !== 'undefined') {
      // Import web-vitals dynamically to reduce bundle size
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        // Largest Contentful Paint
        getLCP((metric) => {
          trackWebVital({
            name: 'LCP',
            value: metric.value,
            rating: metric.rating,
            timestamp: Date.now(),
            route: pathname,
            delta: metric.delta,
          })
        })

        // First Input Delay
        getFID((metric) => {
          trackWebVital({
            name: 'FID',
            value: metric.value,
            rating: metric.rating,
            timestamp: Date.now(),
            route: pathname,
            delta: metric.delta,
          })
        })

        // Cumulative Layout Shift
        getCLS((metric) => {
          trackWebVital({
            name: 'CLS',
            value: metric.value,
            rating: metric.rating,
            timestamp: Date.now(),
            route: pathname,
            delta: metric.delta,
          })
        })

        // First Contentful Paint
        getFCP((metric) => {
          trackWebVital({
            name: 'FCP',
            value: metric.value,
            rating: metric.rating,
            timestamp: Date.now(),
            route: pathname,
            delta: metric.delta,
          })
        })

        // Time to First Byte
        getTTFB((metric) => {
          trackWebVital({
            name: 'TTFB',
            value: metric.value,
            rating: metric.rating,
            timestamp: Date.now(),
            route: pathname,
            delta: metric.delta,
          })
        })
      }).catch(error => {
        console.error('Failed to load web-vitals:', error)
      })

      // Track custom performance metrics
      const trackCustomMetrics = () => {
        // Track bundle size impact
        if ('performance' in window && performance.getEntriesByType) {
          const resources = performance.getEntriesByType('resource')
          const jsResources = resources.filter(r => r.name.endsWith('.js'))
          const cssResources = resources.filter(r => r.name.endsWith('.css'))
          
          const totalJSSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
          const totalCSSSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0)

          if (process.env.NODE_ENV === 'development') {
            console.log('📦 Bundle Analysis:', {
              'JavaScript': `${(totalJSSize / 1024).toFixed(2)} KB`,
              'CSS': `${(totalCSSSize / 1024).toFixed(2)} KB`,
              'Total Resources': resources.length,
              'JS Files': jsResources.length,
              'CSS Files': cssResources.length,
            })
          }
        }

        // Track React hydration time
        const hydrationStart = performance.mark('hydration-start')
        const hydrationEnd = performance.mark('hydration-end')
        
        if (hydrationStart && hydrationEnd) {
          const hydrationTime = hydrationEnd.startTime - hydrationStart.startTime
          console.log(`⚡ React Hydration: ${hydrationTime.toFixed(2)}ms`)
        }
      }

      // Wait for load event to ensure all resources are loaded
      if (document.readyState === 'complete') {
        trackCustomMetrics()
      } else {
        window.addEventListener('load', trackCustomMetrics, { once: true })
      }

      // Track route change performance
      const startTime = performance.now()
      const endTime = performance.now()
      const routeChangeTime = endTime - startTime
      
      if (routeChangeTime > 0) {
        console.log(`🔄 Route change to ${pathname}: ${routeChangeTime.toFixed(2)}ms`)
      }
    }
  }, [pathname])

  // Track route changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const routeStartTime = performance.now()
      
      // Measure route change completion
      const measureRouteChange = () => {
        const routeEndTime = performance.now()
        const duration = routeEndTime - routeStartTime
        
        if (duration > 100) { // Only log significant route changes
          console.log(`📍 Route changed to ${pathname} in ${duration.toFixed(2)}ms`)
        }
      }

      // Use requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(measureRouteChange)
      } else {
        setTimeout(measureRouteChange, 0)
      }
    }
  }, [pathname])

  // Component does not render anything
  return null
}

/**
 * Report Web Vitals to analytics (Next.js integration)
 * This function can be used in _app.tsx for automatic reporting
 */
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // Convert Next.js metric to our format
  const webVitalMetric = {
    name: metric.name,
    value: metric.value,
    rating: getWebVitalRating(metric.name, metric.value),
    timestamp: Date.now(),
    route: window?.location?.pathname || '/',
    delta: 0, // Next.js doesn't provide delta
  }

  trackWebVital(webVitalMetric)

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production') {
    // Example: Google Analytics 4
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as any).gtag
      gtag('event', metric.name, {
        custom_map: { metric_value: 'value' },
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        event_category: 'Web Vitals',
        event_label: metric.label,
        non_interaction: true,
      })
    }

    // Example: Custom analytics endpoint
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: webVitalMetric,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }),
    }).catch(error => {
      console.error('Failed to send web vitals to analytics:', error)
    })
  }
}

/**
 * Determine Web Vital rating based on thresholds
 */
function getWebVitalRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  // Web Vitals thresholds (as of 2024)
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },      // Largest Contentful Paint (ms)
    FID: { good: 100, poor: 300 },        // First Input Delay (ms)
    CLS: { good: 0.1, poor: 0.25 },       // Cumulative Layout Shift
    FCP: { good: 1800, poor: 3000 },      // First Contentful Paint (ms)
    TTFB: { good: 800, poor: 1800 },      // Time to First Byte (ms)
    INP: { good: 200, poor: 500 },        // Interaction to Next Paint (ms)
  }

  const threshold = thresholds[name as keyof typeof thresholds]
  if (!threshold) return 'good'

  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}

/**
 * Hook for tracking custom performance metrics in components
 */
export function usePerformanceMetrics() {
  return {
    trackTiming: (name: string, startTime: number, endTime?: number) => {
      const actualEndTime = endTime || performance.now()
      const duration = actualEndTime - startTime
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`)
      }
      
      return duration
    },
    
    trackUserAction: (action: string, startTime: number) => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`👆 User action "${action}": ${duration.toFixed(2)}ms`)
      }
      
      // Track slow user interactions
      if (duration > 100) {
        console.warn(`🐌 Slow user interaction "${action}": ${duration.toFixed(2)}ms`)
      }
      
      return duration
    },
    
    markPerformance: (name: string) => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        performance.mark(name)
      }
    },
    
    measurePerformance: (name: string, startMark: string, endMark?: string) => {
      if (typeof window !== 'undefined' && 'performance' in window) {
        try {
          const measure = performance.measure(name, startMark, endMark)
          if (process.env.NODE_ENV === 'development') {
            console.log(`📏 ${name}: ${measure.duration.toFixed(2)}ms`)
          }
          return measure.duration
        } catch (error) {
          console.error('Performance measurement failed:', error)
          return 0
        }
      }
      return 0
    }
  }
}

export default PerformanceTracker 