import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

/**
 * POST /api/clients/[id]/assign
 * 
 * Assign a client to a user
 */
export async function POST(
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

    // Only managers can assign clients
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = params
    const { userId } = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if client exists
    const client = await db.client.findUnique({
      where: { id }
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Update client assignment
    const updatedClient = await db.client.update({
      where: { id },
      data: {
        assignedUserId: userId,
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Log the assignment activity
    await db.activityLog.create({
      data: {
        clientId: id,
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'client',
        resourceId: id,
        newValues: JSON.stringify({
          assignedUserId: userId,
        }),
        metadata: JSON.stringify({
          action: 'CLIENT_ASSIGNED',
          assignedUserId: userId,
          assignedUserName: user.name,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: `Client successfully assigned to ${user.name}`
    })

  } catch (error) {
    console.error('Client assignment error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign client' },
      { status: 500 }
    )
  }
} 