import { PrismaClient } from '@prisma/client'

/**
 * SIMPLIFIED Prisma client for immediate performance fix
 * 
 * PERFORMANCE FIXES:
 * - Simplified connection pooling
 * - Removed circuit breaker overhead
 * - Optimized connection parameters
 * - Reduced logging overhead
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Simplified connection string for better performance
function getConnectionString() {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Essential connection parameters only
  const connectionParams = [
    'connection_limit=10',        // Reduced pool size
    'pool_timeout=10',           // Faster timeout
    'connect_timeout=10',        // Faster connection
    'statement_timeout=15000',   // 15 second timeout
  ].join('&')

  return baseUrl + (baseUrl.includes('?') ? '&' : '?') + connectionParams
}

// Create simplified Prisma client
function createPrismaClient() {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: getConnectionString(),
      },
    },
    // Minimal logging for performance
    log: process.env.NODE_ENV === 'development' 
      ? [{ emit: 'event', level: 'error' }]
      : [],
    
    // Simplified transaction settings
    transactionOptions: {
      maxWait: 5000,   // 5 seconds max wait
      timeout: 15000,  // 15 seconds timeout
    },
  })

  // Minimal performance monitoring
  if (process.env.NODE_ENV === 'development') {
    client.$on('error', (e) => {
      console.error('🚨 Database Error:', e)
    })
  }

  return client
}

// Global instance
export const db = globalForPrisma.prisma ?? createPrismaClient()

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Simple health check
export async function healthCheck(): Promise<{
  healthy: boolean
  responseTime: number
}> {
  const startTime = Date.now()
  
  try {
    await db.$queryRaw`SELECT 1 as health_check`
    
    return {
      healthy: true,
      responseTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - startTime
    }
  }
}

// Graceful shutdown handling
process.on('beforeExit', async () => {
  console.log('🔌 Disconnecting from database...')
  await db.$disconnect()
})

export default db 