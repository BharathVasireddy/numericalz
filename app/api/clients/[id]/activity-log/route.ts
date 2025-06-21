import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getClientActivityLog } from '@/lib/activity-middleware'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = params.id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get client activity logs
    const activities = await getClientActivityLog(clientId, limit)

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
      } : null
    }))

    return NextResponse.json({
      success: true,
      activities: transformedActivities,
      total: transformedActivities.length,
      clientId
    })

  } catch (error) {
    console.error('Error fetching client activity logs:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}