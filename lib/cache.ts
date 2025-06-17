import { Redis } from '@upstash/redis'
import { unstable_cache } from 'next/cache'

/**
 * High-Performance Caching System for Numericalz
 * 
 * Features:
 * - Multi-level caching (Memory + Redis + Next.js)
 * - Automatic cache invalidation
 * - Performance monitoring
 * - Type-safe cache operations
 * - SWR (Stale While Revalidate) support
 * - Circuit breaker for Redis failures
 */

// Initialize Redis client with error handling
let redis: Redis | null = null

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 10000),
      },
      automaticDeserialization: true,
    })
    // Redis cache initialized
  } else {
    // Redis not configured, using memory cache only
  }
} catch (error) {
  // Redis initialization failed
  redis = null
}

// In-memory cache for fast access
const memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

// Performance metrics
const cacheMetrics = {
  memoryHits: 0,
  memoryMisses: 0,
  redisHits: 0,
  redisMisses: 0,
  errors: 0,
  totalRequests: 0,
}

// Circuit breaker for Redis
let redisCircuitBreaker = {
  isOpen: false,
  failures: 0,
  lastFailure: 0,
  timeout: 60000, // 1 minute
}

// Cache key prefixes for different data types
export const CACHE_PREFIXES = {
  CLIENT: 'client:',
  USER: 'user:',
  TASK: 'task:',
  TEAM: 'team:',
  COMPANY_HOUSE: 'ch:',
  SESSION: 'session:',
  API: 'api:',
} as const

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  DAILY: 86400, // 24 hours
} as const

/**
 * Get data from cache with fallback hierarchy: Memory -> Redis -> Database
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    memoryTtl?: number
    skipMemory?: boolean
    skipRedis?: boolean
    tags?: string[]
  } = {}
): Promise<T> {
  const {
    ttl = CACHE_TTL.MEDIUM,
    memoryTtl = Math.min(ttl, CACHE_TTL.SHORT),
    skipMemory = false,
    skipRedis = false,
    tags = [],
  } = options

  cacheMetrics.totalRequests++

  try {
    // Level 1: Memory cache (fastest)
    if (!skipMemory) {
      const memoryData = getFromMemoryCache<T>(key)
      if (memoryData !== null) {
        cacheMetrics.memoryHits++
        return memoryData
      }
      cacheMetrics.memoryMisses++
    }

    // Level 2: Redis cache (fast)
    if (!skipRedis && redis && !redisCircuitBreaker.isOpen) {
      try {
        const redisData = await getFromRedisCache<T>(key)
        if (redisData !== null) {
          cacheMetrics.redisHits++
          // Populate memory cache
          if (!skipMemory) {
            setMemoryCache(key, redisData, memoryTtl)
          }
          return redisData
        }
        cacheMetrics.redisMisses++
      } catch (error) {
        handleRedisError(error)
      }
    }

    // Level 3: Database/API call (slowest)
    const data = await fetcher()

    // Store in caches (async, don't block response)
    Promise.all([
      !skipMemory ? setMemoryCache(key, data, memoryTtl) : Promise.resolve(),
      !skipRedis && redis && !redisCircuitBreaker.isOpen 
        ? setRedisCache(key, data, ttl, tags).catch(handleRedisError)
        : Promise.resolve(),
    ]).catch(error => {
      cacheMetrics.errors++
    })

    return data
  } catch (error) {
    cacheMetrics.errors++
    // Fallback to direct fetcher call
    return fetcher()
  }
}

/**
 * Memory cache operations
 */
function getFromMemoryCache<T>(key: string): T | null {
  const cached = memoryCache.get(key)
  if (!cached) return null

  const now = Date.now()
  if (now > cached.timestamp + cached.ttl * 1000) {
    memoryCache.delete(key)
    return null
  }

  return cached.data
}

function setMemoryCache<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })

    // Memory cleanup: remove old entries if cache is too large
    if (memoryCache.size > 1000) {
      const entries = Array.from(memoryCache.entries())
      const now = Date.now()
      
      // Remove expired entries
      for (const [k, v] of entries) {
        if (now > v.timestamp + v.ttl * 1000) {
          memoryCache.delete(k)
        }
      }

      // If still too large, remove oldest entries
      if (memoryCache.size > 800) {
        const sortedEntries = entries
          .sort((a, b) => a[1].timestamp - b[1].timestamp)
          .slice(0, memoryCache.size - 800)
        
        for (const [k] of sortedEntries) {
          memoryCache.delete(k)
        }
      }
    }

    return Promise.resolve()
  } catch (error) {
    return Promise.resolve()
  }
}

/**
 * Redis cache operations
 */
async function getFromRedisCache<T>(key: string): Promise<T | null> {
  if (!redis || redisCircuitBreaker.isOpen) return null

  try {
    const data = await redis.get(key)
    
    // Reset circuit breaker on success
    if (redisCircuitBreaker.failures > 0) {
      redisCircuitBreaker.failures = 0
      redisCircuitBreaker.isOpen = false
    }

    return data as T
  } catch (error) {
    handleRedisError(error)
    return null
  }
}

async function setRedisCache<T>(
  key: string, 
  data: T, 
  ttl: number, 
  tags: string[] = []
): Promise<void> {
  if (!redis || redisCircuitBreaker.isOpen) return

  try {
    // Use pipeline for atomic operations
    const pipeline = redis.pipeline()
    
    // Set main data
    pipeline.setex(key, ttl, JSON.stringify(data))
    
    // Set tags for invalidation
    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, key)
      pipeline.expire(`tag:${tag}`, ttl + 60) // Tags expire slightly later
    }

    await pipeline.exec()

    // Reset circuit breaker on success
    if (redisCircuitBreaker.failures > 0) {
      redisCircuitBreaker.failures = 0
      redisCircuitBreaker.isOpen = false
    }
  } catch (error) {
    handleRedisError(error)
  }
}

/**
 * Cache invalidation
 */
export async function invalidateCache(patterns: string | string[]): Promise<void> {
  const keys = Array.isArray(patterns) ? patterns : [patterns]
  
  // Clear from memory cache
  for (const pattern of keys) {
    for (const [key] of memoryCache) {
      if (key.includes(pattern) || key.match(new RegExp(pattern))) {
        memoryCache.delete(key)
      }
    }
  }

  // Clear from Redis
  if (redis && !redisCircuitBreaker.isOpen) {
    try {
      for (const pattern of keys) {
        const keysToDelete = await redis.keys(pattern)
        if (keysToDelete.length > 0) {
          await redis.del(...keysToDelete)
        }
      }
    } catch (error) {
      handleRedisError(error)
    }
  }
}

/**
 * Invalidate by tags
 */
export async function invalidateByTags(tags: string[]): Promise<void> {
  if (!redis || redisCircuitBreaker.isOpen) return

  try {
    for (const tag of tags) {
      const keys = await redis.smembers(`tag:${tag}`)
      if (keys.length > 0) {
        // Delete the actual cache entries
        await redis.del(...keys)
        // Delete the tag set
        await redis.del(`tag:${tag}`)
        
        // Also clear from memory cache
        for (const key of keys) {
          memoryCache.delete(key)
        }
      }
    }
  } catch (error) {
    handleRedisError(error)
  }
}

/**
 * Next.js cache integration
 */
export function createCachedFunction<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    tags?: string[]
    revalidate?: number
  } = {}
) {
  return unstable_cache(fn, undefined, {
    tags: options.tags,
    revalidate: options.revalidate,
  })
}

/**
 * SWR (Stale While Revalidate) implementation
 */
export async function getCachedDataSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    staleTime?: number
    tags?: string[]
  } = {}
): Promise<T> {
  const { ttl = CACHE_TTL.MEDIUM, staleTime = ttl / 2, tags = [] } = options

  // Try to get cached data
  const cached = await getCachedData(key, fetcher, { ttl: ttl * 2, tags }) // Longer TTL for SWR

  // Check if data is stale
  const lastUpdated = await getLastUpdated(key)
  const isStale = !lastUpdated || Date.now() - lastUpdated > staleTime * 1000

  if (isStale) {
    // Background revalidation
    fetcher()
      .then(fresh => {
        setMemoryCache(key, fresh, ttl)
        if (redis && !redisCircuitBreaker.isOpen) {
          setRedisCache(key, fresh, ttl, tags).catch(handleRedisError)
        }
        setLastUpdated(key)
      })
      .catch(error => {
        // SWR background revalidation failed
      })
  }

  return cached
}

/**
 * Helper functions
 */
function handleRedisError(error: any): void {
  cacheMetrics.errors++
  
  redisCircuitBreaker.failures++
  redisCircuitBreaker.lastFailure = Date.now()
  
  // Open circuit breaker after 3 failures
  if (redisCircuitBreaker.failures >= 3) {
    redisCircuitBreaker.isOpen = true
    
    // Auto-recovery after timeout
    setTimeout(() => {
      redisCircuitBreaker.isOpen = false
      redisCircuitBreaker.failures = 0
    }, redisCircuitBreaker.timeout)
  }
}

async function getLastUpdated(key: string): Promise<number | null> {
  try {
    if (redis && !redisCircuitBreaker.isOpen) {
      const timestamp = await redis.get(`lastupdate:${key}`)
      return timestamp ? parseInt(timestamp as string) : null
    }
  } catch (error) {
    // Ignore errors for last updated checks
  }
  return null
}

async function setLastUpdated(key: string): Promise<void> {
  try {
    if (redis && !redisCircuitBreaker.isOpen) {
      await redis.setex(`lastupdate:${key}`, CACHE_TTL.VERY_LONG, Date.now().toString())
    }
  } catch (error) {
    // Ignore errors for last updated sets
  }
}

/**
 * Performance monitoring
 */
export function getCacheMetrics() {
  const total = cacheMetrics.memoryHits + cacheMetrics.memoryMisses + cacheMetrics.redisHits + cacheMetrics.redisMisses
  
  return {
    ...cacheMetrics,
    memoryHitRate: total > 0 ? (cacheMetrics.memoryHits / total * 100).toFixed(2) + '%' : '0%',
    redisHitRate: total > 0 ? (cacheMetrics.redisHits / total * 100).toFixed(2) + '%' : '0%',
    overallHitRate: total > 0 ? ((cacheMetrics.memoryHits + cacheMetrics.redisHits) / total * 100).toFixed(2) + '%' : '0%',
    circuitBreakerStatus: redisCircuitBreaker.isOpen ? 'OPEN' : 'CLOSED',
    memoryCacheSize: memoryCache.size,
  }
}

export function resetCacheMetrics(): void {
  cacheMetrics.memoryHits = 0
  cacheMetrics.memoryMisses = 0
  cacheMetrics.redisHits = 0
  cacheMetrics.redisMisses = 0
  cacheMetrics.errors = 0
  cacheMetrics.totalRequests = 0
}

/**
 * Cache warming utilities
 */
export async function warmCache(warmers: Array<() => Promise<any>>): Promise<void> {
  const results = await Promise.allSettled(warmers.map(warmer => warmer()))
  
  const successful = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length
  
  // Cache warming completed silently
}

/**
 * Cleanup old cache entries
 */
export async function cleanupCache(): Promise<void> {
  // Clean memory cache
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, value] of memoryCache) {
    if (now > value.timestamp + value.ttl * 1000) {
      memoryCache.delete(key)
      cleaned++
    }
  }
  
  // Note: Redis automatically handles TTL expiration
}

// Periodic cleanup
if (process.env.NODE_ENV === 'production') {
  setInterval(cleanupCache, 5 * 60 * 1000) // Every 5 minutes
}

export default {
  get: getCachedData,
  getSWR: getCachedDataSWR,
  invalidate: invalidateCache,
  invalidateByTags,
  metrics: getCacheMetrics,
  warmCache,
  cleanupCache,
} 