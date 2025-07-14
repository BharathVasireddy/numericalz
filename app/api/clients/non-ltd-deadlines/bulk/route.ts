import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivityEnhanced } from '@/lib/activity-middleware'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to perform bulk operations
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { clientIds, operation, assignedUserId } = body

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: 'No client IDs provided' }, { status: 400 })
    }

    if (operation === 'assign') {
      if (!assignedUserId) {
        return NextResponse.json({ error: 'No user ID provided for assignment' }, { status: 400 })
      }

      // Verify the user exists
      const user = await db.user.findUnique({
        where: { id: assignedUserId }
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Log the bulk operation
      await logActivityEnhanced(request, {
        action: 'BULK_NON_LTD_OPERATION',
        details: {
          operation,
          clientCount: clientIds.length,
          assignedUserId: operation === 'assign' ? assignedUserId : null,
          assignedBy: session.user.name || session.user.email || 'Unknown',
          userRole: session.user.role,
          timestamp: new Date().toISOString()
        }
      })

      // Update all non-Ltd workflows for the selected clients
      const updateResults = await Promise.all(
        clientIds.map(async (clientId) => {
          try {
            // Find the active workflow for this client
            const workflow = await db.nonLtdAccountsWorkflow.findFirst({
              where: {
                clientId: clientId,
                isCompleted: false
              }
            })

            if (workflow) {
              // Update the workflow assignment
              await db.nonLtdAccountsWorkflow.update({
                where: { id: workflow.id },
                data: { assignedUserId: assignedUserId }
              })

              // Also update the client's non-Ltd assignment
              await db.client.update({
                where: { id: clientId },
                data: { nonLtdCompanyAssignedUserId: assignedUserId }
              })

              return { clientId, success: true, workflowId: workflow.id }
            } else {
              // No active workflow found, just update client assignment
              await db.client.update({
                where: { id: clientId },
                data: { nonLtdCompanyAssignedUserId: assignedUserId }
              })

              return { clientId, success: true, workflowId: null }
            }
          } catch (error) {
            console.error(`Error updating client ${clientId}:`, error)
            return { clientId, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }
        })
      )

      const successfulUpdates = updateResults.filter(result => result.success)
      const failedUpdates = updateResults.filter(result => !result.success)

      if (failedUpdates.length > 0) {
        console.error('Some bulk assignments failed:', failedUpdates)
      }

      return NextResponse.json({
        success: true,
        message: `Successfully assigned ${successfulUpdates.length} non-Ltd workflows to ${user.name}`,
        results: {
          successful: successfulUpdates.length,
          failed: failedUpdates.length,
          details: updateResults
        }
      })

    } else {
      return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 })
    }

  } catch (error) {
    console.error('Non-Ltd bulk operations error:', error)
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
} 