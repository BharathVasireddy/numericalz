import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getSystemActivityLog } from '@/lib/activity-middleware'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and partners can view system-wide activity logs
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const clientId = searchParams.get('clientId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get activity logs with optional filters
    let activities = await getSystemActivityLog(limit)

    // Apply additional filters if provided
    if (action) {
      activities = activities.filter(activity => 
        activity.action.toLowerCase().includes(action.toLowerCase())
      )
    }

    if (userId) {
      activities = activities.filter(activity => activity.userId === userId)
    }

    if (clientId) {
      activities = activities.filter(activity => activity.clientId === clientId)
    }

    if (startDate) {
      const start = new Date(startDate)
      activities = activities.filter(activity => 
        new Date(activity.timestamp) >= start
      )
    }

    if (endDate) {
      const end = new Date(endDate)
      activities = activities.filter(activity => 
        new Date(activity.timestamp) <= end
      )
    }

    // Transform activities for frontend consumption
    const transformedActivities = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      timestamp: activity.timestamp.toISOString(),
      userId: activity.userId,
      clientId: activity.clientId,
      details: activity.details,
      user: activity.user ? {
        id: activity.user.id,
        name: activity.user.name,
        email: activity.user.email,
        role: activity.user.role
      } : null,
      client: activity.client ? {
        id: activity.client.id,
        companyName: activity.client.companyName,
        clientCode: activity.client.clientCode
      } : null
    }))

    return NextResponse.json({
      success: true,
      activities: transformedActivities,
      total: transformedActivities.length,
      limit
    })

  } catch (error) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}