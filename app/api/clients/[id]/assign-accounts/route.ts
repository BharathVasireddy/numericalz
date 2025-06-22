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
      await logActivityEnhanced(request, {
        action: 'CLIENT_ACCOUNTS_ASSIGNED',
        clientId: params.id,
        details: {
          companyName: updatedClient.companyName,
          clientCode: updatedClient.clientCode,
          assigneeId: userId,
          assigneeName: newAssignee,
          previousAssignee: previousAssignee,
          assignmentType: assignmentType,
          companyType: currentClient.companyType
        }
      })
    } else {
      await logActivityEnhanced(request, {
        action: 'CLIENT_ACCOUNTS_UNASSIGNED',
        clientId: params.id,
        details: {
          companyName: updatedClient.companyName,
          clientCode: updatedClient.clientCode,
          previousAssignee: previousAssignee,
          assignmentType: assignmentType,
          companyType: currentClient.companyType
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