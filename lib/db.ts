import { PrismaClient } from '@prisma/client'

/**
 * Optimized Prisma client instance for high-performance database operations
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Single global instance with connection pooling
 * - Minimal logging overhead
 * - Fast connection reuse
 * - No complex retry mechanisms
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create optimized Prisma client
function createPrismaClient() {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Optimized connection string for performance
  const connectionString = baseUrl + 
    (baseUrl.includes('?') ? '&' : '?') + 
    'connection_limit=10&pool_timeout=20&connect_timeout=10'

  return new PrismaClient({
    datasources: {
      db: {
        url: connectionString,
      },
    },
    // Minimal logging for performance
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Fast transaction settings
    transactionOptions: {
      maxWait: 5000, // 5 seconds max wait
      timeout: 15000, // 15 seconds timeout
    },
  })
}

// Global instance
export const db = globalForPrisma.prisma ?? createPrismaClient()

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Simple health check
export async function healthCheck(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1 as health_check`
    return true
  } catch (error) {
    return false
  }
}

// Graceful shutdown
const cleanup = async () => {
  await db.$disconnect()
}

process.on('beforeExit', cleanup)
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

export default db 