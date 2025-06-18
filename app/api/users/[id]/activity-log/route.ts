import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only PARTNER and MANAGER can view activity logs
    if (!['PARTNER', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const userId = params.id

    // Fetch activity logs for the user
    const activityLogs = await db.activityLog.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100, // Limit to last 100 activities
      include: {
        client: {
          select: {
            id: true,
            companyName: true
          }
        }
      }
    })

    // Transform the data for frontend consumption
    const transformedLogs = activityLogs.map(log => ({
      id: log.id,
      action: log.action,
      resource: log.client ? 'Client' : 'System',
      resourceName: log.client?.companyName || 'System',
      timestamp: log.timestamp,
      details: log.details || `${log.action.replace(/_/g, ' ').toLowerCase()}`
    }))

    return NextResponse.json({
      success: true,
      data: transformedLogs
    })

  } catch (error) {
    console.error('Error fetching user activity log:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 