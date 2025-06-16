import { PrismaClient } from '@prisma/client'

/**
 * Global Prisma client instance for database operations
 * 
 * This implementation:
 * - Uses singleton pattern to prevent multiple connections
 * - Ensures proper connection reuse in development
 * - Handles production connection pooling
 * - Provides type-safe database operations
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Gracefully disconnect from database on process termination
 */
process.on('beforeExit', async () => {
  await db.$disconnect()
})

process.on('SIGINT', async () => {
  await db.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await db.$disconnect()
  process.exit(0)
})

export default db 