import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

/**
 * POST /api/clients/[id]/reassign
 * Reassign (reactivate) an inactive client - Partner and Manager access
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

    // Only partners and managers can reassign clients
    if (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Partner or Manager role required.' },
        { status: 403 }
      )
    }

    const clientId = params.id

    // Check if client exists and is inactive
    const existingClient = await db.client.findUnique({
      where: { id: clientId },
      select: { 
        id: true, 
        companyName: true,
        clientCode: true,
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

    if (existingClient.isActive) {
      return NextResponse.json(
        { success: false, error: 'Client is already active' },
        { status: 400 }
      )
    }

    // Reactivate the client
    const updatedClient = await db.client.update({
      where: { id: clientId },
      data: {
        isActive: true,
        updatedAt: new Date()
      },
      include: {
        assignedUser: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Log client reassignment (reactivation) activity
    await logActivityEnhanced(request, {
      action: 'CLIENT_REASSIGNED',
      clientId: clientId,
      details: {
        companyName: existingClient.companyName,
        clientCode: existingClient.clientCode,
        message: `Client reactivated from inactive status`,
        previousStatus: 'INACTIVE',
        newStatus: 'ACTIVE',
        reactivatedBy: session.user.name || session.user.email || 'Unknown User'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Client reassigned successfully',
      data: updatedClient
    })

  } catch (error) {
    console.error('Error reassigning client:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 