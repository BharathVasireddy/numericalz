/**
 * PERFORMANCE CACHE SYSTEM
 * 
 * This system implements smart caching to reduce database calls
 * and improve performance while maintaining real-time updates for critical data.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>()
  
  // Cache TTL settings (in milliseconds) - BALANCED for real-time + performance
  private readonly TTL = {
    // Critical dashboard data - shorter TTL for real-time updates
    DASHBOARD_DATA: 30 * 1000,    // 30 seconds for dashboard
    USER_COUNTS: 60 * 1000,       // 1 minute for user counts
    CLIENT_COUNTS: 30 * 1000,     // 30 seconds for client counts
    
    // General data - moderate TTL
    USERS: 2 * 60 * 1000,         // 2 minutes (reduced from 5)
    CLIENTS: 60 * 1000,           // 1 minute (reduced from 2)
    
    // Static/reference data - longer TTL
    STATIC_DATA: 5 * 60 * 1000,   // 5 minutes (reduced from 10)
  }
  
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.TTL.STATIC_DATA
    }
    this.cache.set(key, entry)
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  delete(key: string): void {
    this.cache.delete(key)
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  // Force refresh by clearing specific cache patterns
  invalidatePattern(pattern: string): number {
    let invalidated = 0
    const keys = Array.from(this.cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key)
        invalidated++
      }
    })
    return invalidated
  }
  
  // Generate cache keys
  generateKey(prefix: string, params: Record<string, any> = {}): string {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    return paramStr ? `${prefix}:${paramStr}` : prefix
  }
  
  // Cache statistics
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
  
  // Cleanup expired entries
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    return cleaned
  }
}

// Global cache instance
export const performanceCache = new PerformanceCache()

// Cache decorators for common data patterns
export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      // Try cache first
      const cached = performanceCache.get<T>(key)
      if (cached !== null) {
        resolve(cached)
        return
      }
      
      // Fetch from database
      const data = await fetcher()
      
      // Cache the result
      performanceCache.set(key, data, ttl)
      
      resolve(data)
    } catch (error) {
      reject(error)
    }
  })
}

// Specific cache functions for common queries
export const CacheHelpers = {
  // Dashboard cache - SHORT TTL for real-time updates
  dashboard: {
    getPartnerData: (userId: string, fetcher: () => Promise<any>) => 
      withCache(`dashboard:partner:${userId}`, fetcher, performanceCache['TTL'].DASHBOARD_DATA),
    
    getManagerData: (userId: string, fetcher: () => Promise<any>) => 
      withCache(`dashboard:manager:${userId}`, fetcher, performanceCache['TTL'].DASHBOARD_DATA),
    
    getStaffData: (userId: string, fetcher: () => Promise<any>) => 
      withCache(`dashboard:staff:${userId}`, fetcher, performanceCache['TTL'].DASHBOARD_DATA),
    
    invalidate: (userId?: string) => {
      if (userId) {
        performanceCache.delete(`dashboard:partner:${userId}`)
        performanceCache.delete(`dashboard:manager:${userId}`)
        performanceCache.delete(`dashboard:staff:${userId}`)
      } else {
        performanceCache.invalidatePattern('dashboard:')
      }
    }
  },
  
  // Users cache
  users: {
    getAll: (fetcher: () => Promise<any[]>) => 
      withCache('users:all', fetcher, performanceCache['TTL'].USERS),
    
    getActive: (fetcher: () => Promise<any[]>) => 
      withCache('users:active', fetcher, performanceCache['TTL'].USERS),
    
    getById: (id: string, fetcher: () => Promise<any>) => 
      withCache(`user:${id}`, fetcher, performanceCache['TTL'].USERS),
    
    invalidate: () => {
      performanceCache.delete('users:all')
      performanceCache.delete('users:active')
      performanceCache.invalidatePattern('user:')
    }
  },
  
  // Clients cache
  clients: {
    getPage: (params: Record<string, any>, fetcher: () => Promise<any>) => {
      const key = performanceCache.generateKey('clients:page', params)
      return withCache(key, fetcher, performanceCache['TTL'].CLIENTS)
    },
    
    getCount: (params: Record<string, any>, fetcher: () => Promise<number>) => {
      const key = performanceCache.generateKey('clients:count', params)
      return withCache(key, fetcher, performanceCache['TTL'].CLIENT_COUNTS)
    },
    
    getUserCounts: (fetcher: () => Promise<any[]>) => 
      withCache('clients:user-counts', fetcher, performanceCache['TTL'].USER_COUNTS),
    
    invalidate: (pattern?: string) => {
      if (pattern) {
        // Invalidate specific pattern
        performanceCache.invalidatePattern(pattern)
      } else {
        // Invalidate all client caches
        performanceCache.invalidatePattern('clients:')
        performanceCache.invalidatePattern('client:')
      }
    }
  },
  
  // VAT data cache
  vat: {
    getClients: (params: Record<string, any>, fetcher: () => Promise<any[]>) => {
      const key = performanceCache.generateKey('vat:clients', params)
      return withCache(key, fetcher, performanceCache['TTL'].CLIENTS)
    },
    
    invalidate: () => {
      performanceCache.invalidatePattern('vat:')
    }
  }
}

// Auto-cleanup every 2 minutes (more frequent)
setInterval(() => {
  const cleaned = performanceCache.cleanup()
  if (cleaned > 0) {
    console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`)
  }
}, 2 * 60 * 1000)

// Export cache invalidation function for manual use
export function clearAllCaches(): void {
  performanceCache.clear()
  console.log('🧹 All caches cleared manually')
}

// Export dashboard cache invalidation
export function invalidateDashboardCache(userId?: string): void {
  CacheHelpers.dashboard.invalidate(userId)
  console.log(`🧹 Dashboard cache invalidated${userId ? ` for user ${userId}` : ' for all users'}`)
} 