import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

/**
 * POST /api/clients/[id]/resign
 * 
 * Resign (deactivate) a client
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

    // Only managers can resign clients
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = params

    // Check if client exists and is active
    const existingClient = await db.client.findUnique({
      where: { id },
      select: { 
        id: true, 
        companyName: true, 
        isActive: true,
        assignedUserId: true
      }
    })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    if (!existingClient.isActive) {
      return NextResponse.json(
        { success: false, error: 'Client is already resigned' },
        { status: 400 }
      )
    }

    // Update client to inactive status and remove assignment
    const updatedClient = await db.client.update({
      where: { id },
      data: {
        isActive: false,
        assignedUserId: null, // Remove assignment when resigning
      },
      include: {
        assignedUser: true
      }
    })

    // Log the resignation activity
    await db.activityLog.create({
      data: {
        clientId: id,
        userId: session.user.id,
        action: 'CLIENT_RESIGNED',
        details: JSON.stringify({
          companyName: existingClient.companyName,
          oldValues: {
            isActive: true,
            assignedUserId: existingClient.assignedUserId,
          },
          newValues: {
            isActive: false,
            assignedUserId: null,
          },
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Client resigned successfully',
      client: updatedClient
    })

  } catch (error) {
    console.error('Error resigning client:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 