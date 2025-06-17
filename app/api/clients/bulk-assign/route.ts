import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers can perform bulk operations
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { clientIds, assignedUserId } = await request.json()

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'Client IDs are required' }, { status: 400 })
    }

    if (!assignedUserId) {
      return NextResponse.json({ error: 'Assigned user ID is required' }, { status: 400 })
    }

    // Verify the assigned user exists
    const assignedUser = await db.user.findUnique({
      where: { id: assignedUserId }
    })

    if (!assignedUser) {
      return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 })
    }

    // Update all selected clients
    const result = await db.client.updateMany({
      where: {
        id: { in: clientIds },
        isActive: true // Only update active clients
      },
      data: {
        assignedUserId: assignedUserId
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${result.count} clients to ${assignedUser.name}`,
      updatedCount: result.count
    })

  } catch (error) {
    console.error('Error in bulk assign:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 