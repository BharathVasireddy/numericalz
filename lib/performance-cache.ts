/**
 * PERFORMANCE CACHE SYSTEM
 * 
 * This system implements aggressive caching to reduce database calls
 * and improve performance when database latency is high.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class PerformanceCache {
  private cache = new Map<string, CacheEntry<any>>()
  
  // Cache TTL settings (in milliseconds)
  private readonly TTL = {
    USERS: 5 * 60 * 1000,        // 5 minutes
    CLIENTS: 2 * 60 * 1000,      // 2 minutes  
    CLIENT_COUNTS: 1 * 60 * 1000, // 1 minute
    USER_COUNTS: 2 * 60 * 1000,   // 2 minutes
    STATIC_DATA: 10 * 60 * 1000,  // 10 minutes
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
        const keys = Array.from(performanceCache['cache'].keys())
        keys.forEach(key => {
          if (key.includes(pattern)) {
            performanceCache.delete(key)
          }
        })
      } else {
        // Invalidate all client caches
        const keys = Array.from(performanceCache['cache'].keys())
        keys.forEach(key => {
          if (key.startsWith('clients:') || key.startsWith('client:')) {
            performanceCache.delete(key)
          }
        })
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
      const keys = Array.from(performanceCache['cache'].keys())
      keys.forEach(key => {
        if (key.startsWith('vat:')) {
          performanceCache.delete(key)
        }
      })
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(() => {
  const cleaned = performanceCache.cleanup()
  if (cleaned > 0) {
    console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`)
  }
}, 5 * 60 * 1000)

export default performanceCache 