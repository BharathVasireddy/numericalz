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
  // Get base URL and optimize for Supabase connection reliability
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Enhanced connection string for Supabase stability
  const optimizedUrl = baseUrl + 
    (baseUrl.includes('?') ? '&' : '?') + 
    'pgbouncer=true&connection_limit=1&pool_timeout=20&connect_timeout=60&statement_timeout=30000'

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: optimizedUrl,
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Ensure clean disconnection in serverless environments with retry logic
export async function ensureConnection(maxRetries: number = 3) {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await db.$connect()
      return db
    } catch (error) {
      lastError = error as Error
      console.error(`Database connection attempt ${attempt}/${maxRetries} failed:`, error)
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000
        console.log(`Retrying connection in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  console.error('All database connection attempts failed')
  throw lastError!
}

export async function cleanupConnection() {
  try {
    await db.$disconnect()
  } catch (error) {
    console.error('Database disconnection failed:', error)
  }
}

// Enhanced performance optimization helper with Supabase-specific error handling
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
      
      // Check if it's a connection-related error
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : ''
      const isConnectionError = errorMessage.includes('connection') || 
                               errorMessage.includes('timeout') || 
                               errorMessage.includes('reach database')
      
      if (isConnectionError && i < maxRetries - 1) {
        console.log(`Connection error detected, retrying operation (${i + 1}/${maxRetries})...`)
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
        
        // Try to reconnect
        try {
          await ensureConnection(1)
        } catch (connectError) {
          console.error('Reconnection failed:', connectError)
        }
      } else if (i < maxRetries - 1) {
        // For non-connection errors, shorter delay
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }
  
  throw lastError!
}

// Wrapper for database operations with automatic retry
export async function dbOperation<T>(operation: () => Promise<T>): Promise<T> {
  return executeWithRetry(operation, 3)
}

export default db 