import React from 'react'

/**
 * Advanced Performance Monitoring System for Numericalz
 * 
 * Features:
 * - Core Web Vitals tracking (LCP, FID, CLS, FCP, TTFB)
 * - Component render performance monitoring
 * - API response time tracking
 * - Memory usage monitoring
 * - Real-time performance alerts
 * - Bundle size analysis
 * - User experience metrics
 */

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  route?: string
  componentName?: string
  userId?: string
}

interface WebVitalsMetric extends PerformanceMetric {
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
}

interface ComponentMetric {
  componentName: string
  renderTime: number
  rerenderCount: number
  propsSize: number
  timestamp: number
}

interface APIMetric {
  endpoint: string
  method: string
  duration: number
  status: number
  timestamp: number
  cacheHit?: boolean
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private webVitals: WebVitalsMetric[] = []
  private componentMetrics: ComponentMetric[] = []
  private apiMetrics: APIMetric[] = []
  private observers: PerformanceObserver[] = []
  private isMonitoring = false

  constructor() {
    this.setupPerformanceObservers()
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    if (typeof window === 'undefined' || this.isMonitoring) return

    this.isMonitoring = true
    console.log('🚀 Performance monitoring initialized')

    // Track initial page load metrics
    this.trackPageLoad()

    // Monitor navigation timing
    this.monitorNavigation()

    // Track resource loading
    this.monitorResources()

    // Monitor long tasks
    this.monitorLongTasks()

    // Track memory usage (if available)
    this.monitorMemory()

    // Set up periodic reporting
    this.setupPeriodicReporting()
  }

  /**
   * Track Core Web Vitals
   */
  trackWebVital(metric: WebVitalsMetric) {
    this.webVitals.push(metric)
    
    // Alert for poor performance
    if (metric.rating === 'poor') {
      console.warn(`🚨 Poor ${metric.name} performance:`, metric.value)
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        this.sendToAnalytics('web-vital', metric)
      }
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
        route: metric.route
      })
    }
  }

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number, propsSize: number = 0) {
    const existing = this.componentMetrics.find(m => m.componentName === componentName)
    
    if (existing) {
      existing.rerenderCount++
      existing.renderTime = renderTime
      existing.propsSize = propsSize
      existing.timestamp = Date.now()
    } else {
      this.componentMetrics.push({
        componentName,
        renderTime,
        rerenderCount: 1,
        propsSize,
        timestamp: Date.now()
      })
    }

    // Alert for slow renders
    if (renderTime > 16.67) { // More than one frame (60fps)
      console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
    }
  }

  /**
   * Track API performance
   */
  trackAPICall(endpoint: string, method: string, duration: number, status: number, cacheHit?: boolean) {
    this.apiMetrics.push({
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now(),
      cacheHit
    })

    // Alert for slow API calls
    if (duration > 1000) {
      console.warn(`🐌 Slow API call: ${method} ${endpoint} took ${duration}ms`)
    }

    // Track error rates
    if (status >= 400) {
      console.error(`❌ API error: ${method} ${endpoint} returned ${status}`)
    }
  }

  /**
   * Setup performance observers
   */
  private setupPerformanceObservers() {
    if (typeof window === 'undefined') return

    try {
      // Observe paint timing
      if ('PerformanceObserver' in window) {
        const paintObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.trackMetric({
              name: entry.name,
              value: entry.startTime,
              timestamp: Date.now()
            })
          })
        })
        paintObserver.observe({ entryTypes: ['paint'] })
        this.observers.push(paintObserver)

        // Observe navigation timing
        const navigationObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            const navEntry = entry as PerformanceNavigationTiming
            this.trackMetric({
              name: 'navigation-timing',
              value: navEntry.loadEventEnd - navEntry.fetchStart,
              timestamp: Date.now()
            })
          })
        })
        navigationObserver.observe({ entryTypes: ['navigation'] })
        this.observers.push(navigationObserver)
      }
    } catch (error) {
      console.error('Failed to setup performance observers:', error)
    }
  }

  /**
   * Track page load metrics
   */
  private trackPageLoad() {
    if (typeof window === 'undefined') return

    window.addEventListener('load', () => {
      // DOM Content Loaded
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        this.trackMetric({
          name: 'dom-content-loaded',
          value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          timestamp: Date.now()
        })

        this.trackMetric({
          name: 'page-load-complete',
          value: navigation.loadEventEnd - navigation.fetchStart,
          timestamp: Date.now()
        })
      }
    })
  }

  /**
   * Monitor navigation performance
   */
  private monitorNavigation() {
    if (typeof window === 'undefined') return

    // Track route changes (for SPA)
    let lastRoute = window.location.pathname
    const checkRoute = () => {
      const currentRoute = window.location.pathname
      if (currentRoute !== lastRoute) {
        this.trackMetric({
          name: 'route-change',
          value: performance.now(),
          timestamp: Date.now(),
          route: currentRoute
        })
        lastRoute = currentRoute
      }
    }

    // Check for route changes
    setInterval(checkRoute, 100)
  }

  /**
   * Monitor resource loading
   */
  private monitorResources() {
    if (typeof window === 'undefined') return

    const processResourceEntries = () => {
      const resources = performance.getEntriesByType('resource')
      resources.forEach((resource) => {
        if (resource.duration > 500) { // Resources taking more than 500ms
          console.warn(`🐌 Slow resource: ${resource.name} took ${resource.duration.toFixed(2)}ms`)
        }
      })
    }

    // Process existing resources
    setTimeout(processResourceEntries, 2000)

    // Monitor new resources
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 500) {
            console.warn(`🐌 Slow resource: ${entry.name} took ${entry.duration.toFixed(2)}ms`)
          }
        })
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    }
  }

  /**
   * Monitor long tasks that block the main thread
   */
  private monitorLongTasks() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          console.warn(`🚨 Long task detected: ${entry.duration.toFixed(2)}ms`)
          this.trackMetric({
            name: 'long-task',
            value: entry.duration,
            timestamp: Date.now()
          })
        })
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
      this.observers.push(longTaskObserver)
    } catch (error) {
      // Long task API not supported
    }
  }

  /**
   * Monitor memory usage
   */
  private monitorMemory() {
    if (typeof window === 'undefined') return

    const checkMemory = () => {
      // @ts-ignore - memory API is experimental
      if (performance.memory) {
        // @ts-ignore
        const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory
        
        const memoryUsage = (usedJSHeapSize / jsHeapSizeLimit) * 100
        
        this.trackMetric({
          name: 'memory-usage',
          value: memoryUsage,
          timestamp: Date.now()
        })

        // Alert if memory usage is high
        if (memoryUsage > 80) {
          console.warn(`🚨 High memory usage: ${memoryUsage.toFixed(2)}%`)
        }
      }
    }

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000)
  }

  /**
   * Setup periodic reporting
   */
  private setupPeriodicReporting() {
    if (process.env.NODE_ENV !== 'development') return

    setInterval(() => {
      this.generateReport()
    }, 60000) // Every minute in development
  }

  /**
   * Track a custom metric
   */
  private trackMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const now = Date.now()
    const last5Minutes = now - 5 * 60 * 1000

    // Filter recent metrics
    const recentMetrics = this.metrics.filter(m => m.timestamp > last5Minutes)
    const recentWebVitals = this.webVitals.filter(m => m.timestamp > last5Minutes)
    const recentAPIMetrics = this.apiMetrics.filter(m => m.timestamp > last5Minutes)

    const report = {
      timestamp: new Date().toISOString(),
      period: '5 minutes',
      webVitals: this.analyzeWebVitals(recentWebVitals),
      api: this.analyzeAPIMetrics(recentAPIMetrics),
      components: this.analyzeComponentMetrics(),
      memory: this.getMemoryInfo(),
      summary: {
        totalMetrics: recentMetrics.length,
        slowComponents: this.componentMetrics.filter(c => c.renderTime > 16.67).length,
        slowAPIs: recentAPIMetrics.filter(a => a.duration > 1000).length,
      }
    }

    console.log('📊 Performance Report:', report)
    return report
  }

  /**
   * Analyze Web Vitals
   */
  private analyzeWebVitals(metrics: WebVitalsMetric[]) {
    const byMetric = metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = { values: [], ratings: { good: 0, 'needs-improvement': 0, poor: 0 } }
      }
      acc[metric.name].values.push(metric.value)
      acc[metric.name].ratings[metric.rating]++
      return acc
    }, {} as any)

    return Object.entries(byMetric).map(([name, data]: [string, any]) => ({
      name,
      average: data.values.reduce((a: number, b: number) => a + b, 0) / data.values.length || 0,
      min: Math.min(...data.values) || 0,
      max: Math.max(...data.values) || 0,
      count: data.values.length,
      ratings: data.ratings
    }))
  }

  /**
   * Analyze API metrics
   */
  private analyzeAPIMetrics(metrics: APIMetric[]) {
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length || 0
    const errorRate = (metrics.filter(m => m.status >= 400).length / metrics.length * 100) || 0
    const cacheHitRate = (metrics.filter(m => m.cacheHit).length / metrics.length * 100) || 0

    return {
      totalCalls: metrics.length,
      averageDuration: Math.round(avgDuration),
      errorRate: Math.round(errorRate * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      slowest: metrics.sort((a, b) => b.duration - a.duration).slice(0, 3)
    }
  }

  /**
   * Analyze component metrics
   */
  private analyzeComponentMetrics() {
    const slowComponents = this.componentMetrics
      .filter(c => c.renderTime > 16.67)
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, 5)

    const frequentRerenders = this.componentMetrics
      .filter(c => c.rerenderCount > 10)
      .sort((a, b) => b.rerenderCount - a.rerenderCount)
      .slice(0, 5)

    return {
      totalComponents: this.componentMetrics.length,
      slowComponents,
      frequentRerenders
    }
  }

  /**
   * Get memory information
   */
  private getMemoryInfo() {
    if (typeof window === 'undefined') return null

    // @ts-ignore
    if (performance.memory) {
      // @ts-ignore
      const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory
      return {
        usedMB: Math.round(usedJSHeapSize / 1024 / 1024),
        totalMB: Math.round(totalJSHeapSize / 1024 / 1024),
        limitMB: Math.round(jsHeapSizeLimit / 1024 / 1024),
        usagePercent: Math.round((usedJSHeapSize / jsHeapSizeLimit) * 100)
      }
    }
    return null
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(type: string, data: any) {
    // Implement your analytics service integration here
    // Examples: Google Analytics, Mixpanel, Custom endpoint
    
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to custom analytics endpoint
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, timestamp: Date.now() })
      }).catch(error => {
        console.error('Failed to send analytics:', error)
      })
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      metrics: this.metrics,
      webVitals: this.webVitals,
      componentMetrics: this.componentMetrics,
      apiMetrics: this.apiMetrics
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = []
    this.webVitals = []
    this.componentMetrics = []
    this.apiMetrics = []
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.isMonitoring = false
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor()

/**
 * React hook for tracking component performance
 */
export function usePerformanceTracking(componentName: string) {
  if (typeof window === 'undefined') return { trackRender: () => {} }

  const trackRender = (renderTime?: number, propsSize?: number) => {
    const actualRenderTime = renderTime || performance.now()
    performanceMonitor.trackComponentRender(componentName, actualRenderTime, propsSize)
  }

  return { trackRender }
}

/**
 * Higher-order component for automatic performance tracking
 */
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component'

  const PerformanceTrackedComponent = (props: P) => {
    const startTime = performance.now()
    
    React.useEffect(() => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      performanceMonitor.trackComponentRender(displayName, renderTime, JSON.stringify(props).length)
    })

    return React.createElement(WrappedComponent, props)
  }

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${displayName})`
  return PerformanceTrackedComponent
}

/**
 * Track API calls automatically
 */
export function trackAPICall(endpoint: string, method: string, duration: number, status: number, cacheHit?: boolean) {
  performanceMonitor.trackAPICall(endpoint, method, duration, status, cacheHit)
}

/**
 * Track Web Vitals
 */
export function trackWebVital(metric: WebVitalsMetric) {
  performanceMonitor.trackWebVital(metric)
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
  performanceMonitor.init()
}

/**
 * Generate performance report
 */
export function generatePerformanceReport() {
  return performanceMonitor.generateReport()
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics() {
  return performanceMonitor.getMetrics()
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics() {
  performanceMonitor.clearMetrics()
}

export default performanceMonitor 