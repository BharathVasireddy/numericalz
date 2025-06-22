import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/clients/[id]/assign-vat
 * 
 * Assign a client to a user specifically for VAT work
 * Only accessible to partners and managers
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

    // Only partners and managers can assign clients
    if (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Partner or Manager role required.' },
        { status: 403 }
      )
    }

    const { userId } = await request.json()

    // Validate userId parameter
    if (userId !== null && typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid userId parameter' },
        { status: 400 }
      )
    }

    // If userId is provided, verify the user exists
    if (userId) {
      const user = await db.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }
    }

    // Get current client for activity logging
    const currentClient = await db.client.findUnique({
      where: { id: params.id },
      include: { 
        vatAssignedUser: true,
        assignedUser: true // For fallback in activity logging
      }
    })

    if (!currentClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Update the client VAT assignment
    const updatedClient = await db.client.update({
      where: { id: params.id },
      data: { vatAssignedUserId: userId },
      include: {
        vatAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          },
        },
      },
    })

    // Log assignment activity
    if (userId) {
      await logActivityEnhanced(request, {
        action: 'CLIENT_VAT_ASSIGNED',
        clientId: params.id,
        details: {
          companyName: updatedClient.companyName,
          clientCode: updatedClient.clientCode,
          assigneeId: userId,
          assigneeName: updatedClient.vatAssignedUser?.name,
          previousAssignee: currentClient.vatAssignedUser?.name || 'Unassigned',
          assignmentType: 'VAT'
        }
      })
    } else {
      await logActivityEnhanced(request, {
        action: 'CLIENT_VAT_UNASSIGNED',
        clientId: params.id,
        details: {
          companyName: updatedClient.companyName,
          clientCode: updatedClient.clientCode,
          previousAssignee: currentClient.vatAssignedUser?.name || 'Unassigned',
          assignmentType: 'VAT'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: userId 
        ? `VAT work assigned to ${updatedClient.vatAssignedUser?.name}` 
        : 'VAT work unassigned successfully',
    })

  } catch (error) {
    console.error('Error assigning VAT client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign VAT client' },
      { status: 500 }
    )
  }
}