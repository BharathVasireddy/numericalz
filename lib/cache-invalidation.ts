/**
 * Cache Invalidation Utilities for Real-time Updates
 * 
 * This module provides utilities to invalidate caches when data changes,
 * ensuring users see updates immediately without waiting for cache expiry.
 */

import { invalidateCache, invalidateByTags } from './cache'

// Cache key patterns for different data types
export const CACHE_PATTERNS = {
  CLIENTS: [
    'client:*',
    'api:/api/clients*',
    'clients-list',
    'clients-active',
    'clients-inactive',
  ],
  USERS: [
    'user:*',
    'api:/api/users*',
    'users-list',
    'team-members',
  ],
  TEAMS: [
    'team:*',
    'api:/api/teams*',
    'teams-list',
  ],
} as const

// Cache tags for granular invalidation
export const CACHE_TAGS = {
  CLIENTS: 'clients',
  USERS: 'users', 
  TEAMS: 'teams',
  CLIENT_ASSIGNMENTS: 'client-assignments',
} as const

/**
 * Invalidate all client-related caches
 * Call this after creating, updating, or deleting clients
 */
export async function invalidateClientCaches(): Promise<void> {
  try {
    // Invalidate by patterns
    await invalidateCache([...CACHE_PATTERNS.CLIENTS])
    
    // Invalidate by tags
    await invalidateByTags([
      CACHE_TAGS.CLIENTS,
      CACHE_TAGS.CLIENT_ASSIGNMENTS,
    ])
    
    // Also invalidate React Query cache keys commonly used
    if (typeof window !== 'undefined' && window.queryClient) {
      const queryClient = window.queryClient
      queryClient.invalidateQueries({
        queryKey: ['clients'],
      })
      queryClient.invalidateQueries({
        queryKey: ['api', 'clients'],
      })
    }
  } catch (error) {
    // Cache invalidation failed - not critical for functionality
  }
}

/**
 * Invalidate user-related caches
 * Call this after creating, updating, or deleting users
 */
export async function invalidateUserCaches(): Promise<void> {
  try {
    await invalidateCache([...CACHE_PATTERNS.USERS])
    await invalidateByTags([CACHE_TAGS.USERS])
    
    if (typeof window !== 'undefined' && window.queryClient) {
      const queryClient = window.queryClient
      queryClient.invalidateQueries({
        queryKey: ['users'],
      })
    }
  } catch (error) {
    // Cache invalidation failed - not critical
  }
}

/**
 * Invalidate team-related caches
 * Call this after creating, updating, or deleting teams
 */
export async function invalidateTeamCaches(): Promise<void> {
  try {
    await invalidateCache([...CACHE_PATTERNS.TEAMS])
    await invalidateByTags([CACHE_TAGS.TEAMS])
    
    if (typeof window !== 'undefined' && window.queryClient) {
      const queryClient = window.queryClient
      queryClient.invalidateQueries({
        queryKey: ['teams'],
      })
    }
  } catch (error) {
    // Cache invalidation failed - not critical
  }
}

/**
 * Invalidate caches when client assignments change
 * Call this after assigning/reassigning clients to users
 */
export async function invalidateClientAssignmentCaches(): Promise<void> {
  try {
    // Client assignments affect both client and user data
    await Promise.all([
      invalidateClientCaches(),
      invalidateUserCaches(),
    ])
    
    await invalidateByTags([CACHE_TAGS.CLIENT_ASSIGNMENTS])
  } catch (error) {
    // Cache invalidation failed - not critical
  }
}

/**
 * Invalidate all application caches
 * Use sparingly - only for major data changes
 */
export async function invalidateAllCaches(): Promise<void> {
  try {
    await Promise.all([
      invalidateClientCaches(),
      invalidateUserCaches(), 
      invalidateTeamCaches(),
    ])
  } catch (error) {
    // Cache invalidation failed - not critical
  }
}

/**
 * Client-side cache invalidation helper
 * Call this from React components after mutations
 */
export function invalidateClientSideCache(queryKeys: string[][]): void {
  if (typeof window !== 'undefined' && window.queryClient) {
    const queryClient = window.queryClient
    queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey })
      // Also refetch active queries immediately
      queryClient.refetchQueries({ queryKey })
    })
  }
}

// Global query client reference for client-side invalidation
declare global {
  interface Window {
    queryClient?: {
      invalidateQueries: (options: { queryKey: string[] }) => void
      refetchQueries: (options: { queryKey: string[] }) => void
    }
  }
}

export default {
  invalidateClientCaches,
  invalidateUserCaches,
  invalidateTeamCaches,
  invalidateClientAssignmentCaches,
  invalidateAllCaches,
  invalidateClientSideCache,
} 