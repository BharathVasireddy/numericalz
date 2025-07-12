import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// PUT /api/in-app-notifications/mark-all-read - Mark all notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') // Optional: mark all in specific category

    // Build where clause
    const whereClause: any = {
      userId: session.user.id,
      isRead: false,
    }

    if (category && category !== 'ALL') {
      whereClause.category = category
    }

    // Mark all matching notifications as read
    const result = await db.inAppNotification.updateMany({
      where: whereClause,
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    })

    // Get updated unread count
    const unreadCount = await db.inAppNotification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: result.count,
        unreadCount,
      },
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
} 