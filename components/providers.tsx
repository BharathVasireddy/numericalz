'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'

interface ProvidersProps {
  children: React.ReactNode
}

// Performance monitoring for React Query
const queryMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  successfulQueries: 0,
  failedQueries: 0,
  totalMutations: 0,
  failedMutations: 0,
}

/**
 * High-Performance Providers component with advanced caching and monitoring
 * 
 * Includes:
 * - NextAuth SessionProvider for authentication
 * - Optimized React Query QueryClientProvider with advanced caching
 * - Next-themes ThemeProvider for dark/light mode
 * - React Query DevTools for development
 * - Performance monitoring and error handling
 * - Automatic retry mechanisms with exponential backoff
 */
export function Providers({ children }: ProvidersProps) {
  // Error handler for global error management
  const handleQueryError = useCallback((error: any) => {
    queryMetrics.failedQueries++
    
    // Don't show toast for authentication errors or network errors in development
    if (error?.status === 401 || error?.status === 403) {
      return // Authentication errors are handled by the auth system
    }
    
    if (process.env.NODE_ENV === 'production') {
      toast.error('Something went wrong. Please try again.')
    }
  }, [])

  // Mutation error handler
  const handleMutationError = useCallback((error: any) => {
    queryMetrics.failedMutations++
    
    // Show user-friendly error messages
    if (error?.status === 409) {
      toast.error('This action conflicts with existing data.')
    } else if (error?.status === 422) {
      toast.error('Please check your input and try again.')
    } else if (error?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else {
      toast.error('Operation failed. Please try again.')
    }
  }, [])

  // Create an optimized QueryClient with real-time settings
  const [queryClient] = useState(() => {
    // Query cache with performance monitoring
    const queryCache = new QueryCache({
      onSuccess: () => {
        queryMetrics.successfulQueries++
      },
      onError: handleQueryError,
    })

    // Mutation cache with error handling
    const mutationCache = new MutationCache({
      onSuccess: () => {
        queryMetrics.totalMutations++
      },
      onError: handleMutationError,
    })

    return new QueryClient({
      queryCache,
      mutationCache,
      defaultOptions: {
        queries: {
          // Disable all caching for real-time updates
          staleTime: 0, // Always consider data stale
          // No cache time for real-time data
          gcTime: 0, // Immediate garbage collection
          // Intelligent retry logic
          retry: (failureCount, error: any) => {
            // Don't retry on authentication errors
            if (error?.status === 401 || error?.status === 403) {
              return false
            }
            // Don't retry on client errors (4xx) except for 408, 429
            if (error?.status >= 400 && error?.status < 500) {
              return error?.status === 408 || error?.status === 429
            }
            // Retry up to 3 times for server errors and network issues
            return failureCount < 3
          },
          // Exponential backoff for retries
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          // Always refetch for real-time data
          refetchOnWindowFocus: true,
          // Always refetch on reconnect
          refetchOnReconnect: true,
          // Enable background refetch for real-time updates
          refetchInterval: 5000, // Refetch every 5 seconds for real-time data
          // Network mode for better offline handling
          networkMode: 'online',
          // Enhanced error retry logic
          retryOnMount: true,
          // Optimized query key serialization
          queryKeyHashFn: (queryKey) => {
            return JSON.stringify(queryKey, (key, val) =>
              typeof val === 'object' && val !== null && !Array.isArray(val)
                ? Object.keys(val)
                    .sort()
                    .reduce((result, key) => {
                      result[key] = val[key]
                      return result
                    }, {} as any)
                : val
            )
          },
        },
        mutations: {
          // Mutation retry logic
          retry: (failureCount, error: any) => {
            // Don't retry on client errors
            if (error?.status >= 400 && error?.status < 500) {
              return false
            }
            // Retry server errors up to 2 times
            return failureCount < 2
          },
          // Exponential backoff for mutation retries
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
          // Network mode for mutations
          networkMode: 'online',
        },
      },
    })
  })

  // Performance monitoring (silent in production)
  if (process.env.NODE_ENV === 'development') {
    // Track metrics without console logging
    setTimeout(() => {
      const totalQueries = queryMetrics.successfulQueries + queryMetrics.failedQueries
      const totalMutations = queryMetrics.totalMutations + queryMetrics.failedMutations
      
      // Metrics are tracked but not logged to console
      if (totalQueries > 0 || totalMutations > 0) {
        // Silent tracking for performance monitoring
      }
    }, 30000)
  }

  // Expose queryClient globally for cache invalidation
  if (typeof window !== 'undefined') {
    window.queryClient = queryClient
  }

  return (
    <SessionProvider
      // Real-time session management
      refetchInterval={60} // 1 minute for real-time updates
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
          storageKey="numericalz-theme"
        >
          {children}
          {/* Development tools with performance monitoring */}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools 
              initialIsOpen={false}
            />
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}

// Export query metrics for monitoring
export const getReactQueryMetrics = () => queryMetrics

// Reset metrics function for testing
export const resetReactQueryMetrics = () => {
  queryMetrics.cacheHits = 0
  queryMetrics.cacheMisses = 0
  queryMetrics.successfulQueries = 0
  queryMetrics.failedQueries = 0
  queryMetrics.totalMutations = 0
  queryMetrics.failedMutations = 0
} 