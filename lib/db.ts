import { PrismaClient } from '@prisma/client'

/**
 * Global Prisma client instance for database operations
 * 
 * This implementation:
 * - Uses singleton pattern to prevent multiple connections
 * - Ensures proper connection reuse in development
 * - Handles serverless environments properly
 * - Provides type-safe database operations
 * - Fixes prepared statement issues
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create a new Prisma client with optimized settings for serverless
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
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

export default db 