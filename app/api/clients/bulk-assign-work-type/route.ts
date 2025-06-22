import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'
import { z } from 'zod'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

const BulkAssignSchema = z.object({
  clientIds: z.array(z.string()).min(1, 'At least one client must be selected'),
  userId: z.string().nullable(),
  workType: z.enum(['VAT', 'ACCOUNTS'], {
    required_error: 'Work type must be specified'
  })
})

/**
 * POST /api/clients/bulk-assign-work-type
 * 
 * Bulk assign multiple clients to a user for specific work type (VAT or Accounts)
 * Only accessible to partners and managers
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const validatedData = BulkAssignSchema.parse(body)
    const { clientIds, userId, workType } = validatedData

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

    // Get current clients for activity logging
    const currentClients = await db.client.findMany({
      where: { id: { in: clientIds } },
      include: {
        vatAssignedUser: true,
        ltdCompanyAssignedUser: true,
        nonLtdCompanyAssignedUser: true,
        assignedUser: true
      }
    })

    const results = {
      successful: [] as string[],
      failed: [] as string[]
    }

    // Process each client
    for (const client of currentClients) {
      try {
        let updateData: any = {}
        let assignmentType = ''
        let previousAssignee = ''

        if (workType === 'VAT') {
          updateData = { vatAssignedUserId: userId }
          assignmentType = 'VAT'
          previousAssignee = client.vatAssignedUser?.name || 'Unassigned'
        } else if (workType === 'ACCOUNTS') {
          const isLtdCompany = client.companyType === 'LIMITED_COMPANY' || client.companyType === 'LIMITED'
          
          if (isLtdCompany) {
            updateData = { ltdCompanyAssignedUserId: userId }
            assignmentType = 'Ltd Accounts'
            previousAssignee = client.ltdCompanyAssignedUser?.name || 'Unassigned'
          } else {
            updateData = { nonLtdCompanyAssignedUserId: userId }
            assignmentType = 'Non-Ltd Accounts'
            previousAssignee = client.nonLtdCompanyAssignedUser?.name || 'Unassigned'
          }
        }

        // Update the client
        const updatedClient = await db.client.update({
          where: { id: client.id },
          data: updateData,
          include: {
            vatAssignedUser: {
              select: { id: true, name: true, email: true, role: true }
            },
            ltdCompanyAssignedUser: {
              select: { id: true, name: true, email: true, role: true }
            },
            nonLtdCompanyAssignedUser: {
              select: { id: true, name: true, email: true, role: true }
            }
          }
        })

        // Get new assignee name
        let newAssignee = 'Unassigned'
        if (userId) {
          if (workType === 'VAT') {
            newAssignee = updatedClient.vatAssignedUser?.name || 'Unassigned'
          } else if (workType === 'ACCOUNTS') {
            const isLtdCompany = client.companyType === 'LIMITED_COMPANY' || client.companyType === 'LIMITED'
            if (isLtdCompany) {
              newAssignee = updatedClient.ltdCompanyAssignedUser?.name || 'Unassigned'
            } else {
              newAssignee = updatedClient.nonLtdCompanyAssignedUser?.name || 'Unassigned'
            }
          }
        }

        // Log assignment activity
        if (userId) {
          await logActivityEnhanced(request, {
            action: workType === 'VAT' ? 'CLIENT_VAT_ASSIGNED' : 'CLIENT_ACCOUNTS_ASSIGNED',
            clientId: client.id,
            details: {
              companyName: client.companyName,
              clientCode: client.clientCode,
              assigneeId: userId,
              assigneeName: newAssignee,
              previousAssignee: previousAssignee,
              assignmentType: assignmentType,
              bulkOperation: true
            }
          })
        } else {
          await logActivityEnhanced(request, {
            action: workType === 'VAT' ? 'CLIENT_VAT_UNASSIGNED' : 'CLIENT_ACCOUNTS_UNASSIGNED',
            clientId: client.id,
            details: {
              companyName: client.companyName,
              clientCode: client.clientCode,
              previousAssignee: previousAssignee,
              assignmentType: assignmentType,
              bulkOperation: true
            }
          })
        }

        results.successful.push(client.clientCode)

      } catch (error) {
        console.error(`Error assigning client ${client.clientCode}:`, error)
        results.failed.push(client.clientCode)
      }
    }

    const assigneeName = userId ? 
      currentClients[0]?.vatAssignedUser?.name || 
      currentClients[0]?.ltdCompanyAssignedUser?.name || 
      currentClients[0]?.nonLtdCompanyAssignedUser?.name || 
      'Unknown User' : 'Unassigned'

    return NextResponse.json({
      success: true,
      results,
      message: userId 
        ? `Successfully assigned ${results.successful.length} clients to ${assigneeName} for ${workType} work`
        : `Successfully unassigned ${results.successful.length} clients from ${workType} work`,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error in bulk assignment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to bulk assign clients' },
      { status: 500 }
    )
  }
}