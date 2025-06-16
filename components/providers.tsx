'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'

interface ProvidersProps {
  children: React.ReactNode
}

/**
 * Providers component that wraps the application with all necessary providers
 * 
 * Includes:
 * - NextAuth SessionProvider for authentication
 * - React Query QueryClientProvider for server state management
 * - Next-themes ThemeProvider for dark/light mode
 * - React Query DevTools for development
 */
export function Providers({ children }: ProvidersProps) {
  // Create a stable QueryClient instance
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time of 5 minutes
        staleTime: 1000 * 60 * 5,
        // Cache time of 10 minutes
        gcTime: 1000 * 60 * 10,
        // Retry on failure
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (except 401 which might be temporary)
          if (error?.status >= 400 && error?.status < 500 && error?.status !== 401) {
            return false
          }
          return failureCount < 3
        },
        // Refetch on window focus only if data is stale
        refetchOnWindowFocus: false,
        // Don't refetch on reconnect if data is fresh
        refetchOnReconnect: false,
      },
      mutations: {
        // Global error handling for mutations
        onError: (error: any) => {
          console.error('Mutation error:', error)
          // You can add global error toast here
        },
      },
    },
  }))

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          {/* Only show React Query DevTools in development */}
          {process.env.NODE_ENV === 'development' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
} 