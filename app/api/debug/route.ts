import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const hasDbUrl = !!process.env.DATABASE_URL
    const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET
    const hasNextAuthUrl = !!process.env.NEXTAUTH_URL
    
    // Test database connection
    let dbConnected = false
    let userCount = 0
    let dbError = null
    
    try {
      // Test basic connection
      await db.$connect()
      
      // Test query execution
      userCount = await db.user.count()
      dbConnected = true
      
      // Test finding admin user
      const adminUser = await db.user.findUnique({
        where: { email: 'admin@numericalz.com' },
        select: { id: true, email: true, name: true, role: true, isActive: true }
      })
      
      return NextResponse.json({
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          hasDbUrl,
          hasNextAuthSecret,
          hasNextAuthUrl,
          dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
        },
        database: {
          connected: dbConnected,
          userCount,
          adminUserExists: !!adminUser,
          adminUser: adminUser ? {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name,
            role: adminUser.role,
            isActive: adminUser.isActive
          } : null
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown database error'
      console.error('Database connection error:', error)
      
      return NextResponse.json({
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          hasDbUrl,
          hasNextAuthSecret,
          hasNextAuthUrl,
          dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
        },
        database: {
          connected: false,
          error: dbError,
          userCount: 0,
        },
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
} 