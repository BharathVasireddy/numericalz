import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

// Schema for creating notifications
const CreateNotificationSchema = z.object({
  userId: z.string(),
  category: z.enum(['VAT', 'ACCOUNTS', 'REMINDERS']),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  clientId: z.string().optional(),
  relatedId: z.string().optional(),
  metadata: z.string().optional(),
})

// GET /api/in-app-notifications - Get notifications for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') // 'VAT', 'ACCOUNTS', 'REMINDERS', or null for all
    const isRead = searchParams.get('isRead') // 'true', 'false', or null for all
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const whereClause: any = {
      userId: session.user.id,
    }

    if (category && category !== 'ALL') {
      whereClause.category = category
    }

    if (isRead !== null) {
      whereClause.isRead = isRead === 'true'
    }

    const notifications = await db.inAppNotification.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    })

    // Get total count for pagination
    const totalCount = await db.inAppNotification.count({
      where: whereClause,
    })

    // Get unread count
    const unreadCount = await db.inAppNotification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        totalCount,
        unreadCount,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching in-app notifications:', error)
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
}

// POST /api/in-app-notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow MANAGER and PARTNER roles to create notifications
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = CreateNotificationSchema.parse(body)

    const notification = await db.inAppNotification.create({
      data: {
        ...validatedData,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: notification,
    })
  } catch (error) {
    console.error('Error creating in-app notification:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors,
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
} 