'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Performance Tracker Component (Simplified for Production)
 * 
 * This component:
 * - Provides basic performance monitoring
 * - Tracks route changes
 * - Avoids complex operations that could cause build issues
 */
export function PerformanceTracker() {
  const pathname = usePathname()

  useEffect(() => {
    // Only run in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development') {
      // Basic performance monitoring
      if (typeof window !== 'undefined' && window.performance) {
        console.log('🚀 Performance monitoring enabled for development')
      }
    }
  }, [])

  useEffect(() => {
    // Track route changes in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📍 Route changed to ${pathname}`)
    }
  }, [pathname])

  // Component does not render anything
  return null
} 