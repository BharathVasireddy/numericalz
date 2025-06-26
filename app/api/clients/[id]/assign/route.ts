import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced, ActivityHelpers } from '@/lib/activity-middleware'
import { AssignmentNotificationService } from '@/lib/assignment-notifications'

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
 * Assign a client to a user
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
      include: { assignedUser: true }
    })

    // Update the client assignment
    const updatedClient = await db.client.update({
      where: { id: params.id },
      data: { assignedUserId: userId },
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

    // Log assignment activity
    if (userId) {
      await logActivityEnhanced(request, {
        action: 'CLIENT_ASSIGNED',
        clientId: params.id,
        details: {
          companyName: updatedClient.companyName,
          clientCode: updatedClient.clientCode,
          assigneeId: userId,
          assigneeName: updatedClient.assignedUser?.name,
          previousAssignee: currentClient?.assignedUser?.name || 'Unassigned'
        }
      })

      // 📧 Send enhanced general client assignment notification email
      AssignmentNotificationService.sendGeneralClientAssignmentNotification(
        params.id,
        userId,
        {
          assignedBy: {
            id: session.user.id,
            name: session.user.name || session.user.email || 'Unknown',
            email: session.user.email || '',
            role: session.user.role || 'USER'
          },
          request
        },
        currentClient?.assignedUser?.name || undefined
      ).catch(emailError => {
        console.error('❌ Failed to send general client assignment notification email:', emailError)
        // Don't fail the main request if email fails
      })
    } else {
      await logActivityEnhanced(request, {
        action: 'CLIENT_UNASSIGNED',
        clientId: params.id,
        details: {
          companyName: updatedClient.companyName,
          clientCode: updatedClient.clientCode,
          previousAssignee: currentClient?.assignedUser?.name || 'Unassigned'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: userId 
        ? `Client assigned to ${updatedClient.assignedUser?.name}` 
        : 'Client unassigned successfully',
    })

  } catch (error) {
    console.error('Error assigning client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign client' },
      { status: 500 }
    )
  }
} 