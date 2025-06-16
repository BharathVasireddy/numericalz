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
    
    try {
      await db.$connect()
      userCount = await db.user.count()
      dbConnected = true
    } catch (error) {
      console.error('Database connection error:', error)
    }

    return NextResponse.json({
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasDbUrl,
        hasNextAuthSecret,
        hasNextAuthUrl,
        dbUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
      },
      database: {
        connected: dbConnected,
        userCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
} 