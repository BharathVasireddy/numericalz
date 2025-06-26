import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity-logger'
import { AssignmentNotificationService } from '@/lib/assignment-notifications'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * POST /api/clients/[id]/assign-accounts
 * 
 * Assign a client to a user specifically for Accounts work (Ltd or Non-Ltd)
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

    // Get current client for activity logging and to determine assignment type
    const currentClient = await db.client.findUnique({
      where: { id: params.id },
      include: { 
        ltdCompanyAssignedUser: true,
        nonLtdCompanyAssignedUser: true,
        assignedUser: true
      }
    })

    if (!currentClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      )
    }

    // Determine if this is Ltd or Non-Ltd company
    const isLtdCompany = currentClient.companyType === 'LIMITED_COMPANY' || currentClient.companyType === 'LIMITED'
    
    let updateData: any = {}
    let assignmentType = ''
    let previousAssignee = ''
    let newAssignee = ''

    if (isLtdCompany) {
      updateData = { ltdCompanyAssignedUserId: userId }
      assignmentType = 'Ltd Accounts'
      previousAssignee = currentClient.ltdCompanyAssignedUser?.name || 'Unassigned'
    } else {
      updateData = { nonLtdCompanyAssignedUserId: userId }
      assignmentType = 'Non-Ltd Accounts'
      previousAssignee = currentClient.nonLtdCompanyAssignedUser?.name || 'Unassigned'
    }

    // Update the client accounts assignment
    const updatedClient = await db.client.update({
      where: { id: params.id },
      data: updateData,
      include: {
        ltdCompanyAssignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          },
        },
        nonLtdCompanyAssignedUser: {
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

    // Get the new assignee name
    if (isLtdCompany) {
      newAssignee = updatedClient.ltdCompanyAssignedUser?.name || 'Unassigned'
    } else {
      newAssignee = updatedClient.nonLtdCompanyAssignedUser?.name || 'Unassigned'
    }

    // Log assignment activity
    if (userId) {
      await logActivity({
        userId: session.user.id,
        action: 'CLIENT_ACCOUNTS_ASSIGNED',
        clientId: params.id,
        details: {
          companyName: updatedClient.companyName,
          clientCode: updatedClient.clientCode,
          assigneeId: userId,
          assigneeName: newAssignee,
          previousAssignee: previousAssignee,
          assignmentType: assignmentType,
          companyType: currentClient.companyType,
          message: `${assignmentType} work assigned to ${newAssignee}`
        }
      })

      // 📧 Send enhanced accounts assignment notification email
      if (isLtdCompany) {
        // Send Ltd company assignment notification
        AssignmentNotificationService.sendLtdAssignmentNotification(
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
          previousAssignee !== 'Unassigned' ? previousAssignee : undefined
        ).catch(emailError => {
          console.error('❌ Failed to send Ltd assignment notification email:', emailError)
          // Don't fail the main request if email fails
        })
      }
      // Note: Non-Ltd companies don't have detailed workflow notifications yet
      // Could be extended in the future if needed
    } else {
      await logActivity({
        userId: session.user.id,
        action: 'CLIENT_ACCOUNTS_UNASSIGNED',
        clientId: params.id,
        details: {
          companyName: updatedClient.companyName,
          clientCode: updatedClient.clientCode,
          previousAssignee: previousAssignee,
          assignmentType: assignmentType,
          companyType: currentClient.companyType,
          message: `${assignmentType} work unassigned`
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: userId 
        ? `${assignmentType} work assigned to ${newAssignee}` 
        : `${assignmentType} work unassigned successfully`,
    })

  } catch (error) {
    console.error('Error assigning accounts client:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to assign accounts client' },
      { status: 500 }
    )
  }
}