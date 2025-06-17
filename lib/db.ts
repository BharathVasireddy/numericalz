import { PrismaClient } from '@prisma/client'

/**
 * Global Prisma client instance for database operations
 * 
 * This implementation:
 * - Uses singleton pattern to prevent multiple connections
 * - Ensures proper connection reuse in development
 * - Handles serverless environments properly
 * - Provides type-safe database operations
 * - Optimized for Supabase performance
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create a new Prisma client with optimized settings for serverless and Supabase
function createPrismaClient() {
  // Optimize connection string for Supabase
  const optimizedUrl = process.env.DATABASE_URL + 
    (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 
    'pgbouncer=true&connection_limit=1&pool_timeout=20'

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: optimizedUrl,
      },
    },
    // Optimize for serverless
    __internal: {
      engine: {
        connectTimeout: 10000,
        queryTimeout: 30000,
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Ensure clean disconnection in serverless environments
export async function ensureConnection() {
  try {
    await db.$connect()
    return db
  } catch (error) {
    console.error('Database connection failed:', error)
    throw error
  }
}

export async function cleanupConnection() {
  try {
    await db.$disconnect()
  } catch (error) {
    console.error('Database disconnection failed:', error)
  }
}

// Performance optimization helper
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
      }
    }
  }
  
  throw lastError!
}

export default db 