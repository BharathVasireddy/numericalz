import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// PUT /api/in-app-notifications/[id]/read - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Check if notification exists and belongs to the user
    const existingNotification = await db.inAppNotification.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Mark as read
    const updatedNotification = await db.inAppNotification.update({
      where: { id },
      data: {
        isRead: true,
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
      data: updatedNotification,
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json({
      error: 'Internal server error',
    }, { status: 500 })
  }
} 