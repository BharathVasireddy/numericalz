import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/clients/[id]/assign
 * 
 * Assign a user to a client
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers can assign users
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Manager access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { assignedUserId } = body

    // Check if client exists
    const existingClient = await db.client.findUnique({
      where: { id: params.id },
    })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // If assignedUserId is provided, verify the user exists
    if (assignedUserId) {
      const user = await db.user.findUnique({
        where: { id: assignedUserId },
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // Update client assignment
    const updatedClient = await db.client.update({
      where: { id: params.id },
      data: {
        assignedUserId: assignedUserId || null,
        updatedAt: new Date(),
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

    return NextResponse.json({
      success: true,
      client: updatedClient,
      message: assignedUserId 
        ? 'User assigned successfully' 
        : 'Client unassigned successfully',
    })

  } catch (error) {
    console.error('Error assigning user:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign user' },
      { status: 500 }
    )
  }
} 