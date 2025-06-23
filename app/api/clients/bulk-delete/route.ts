import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { logActivity, ActivityTypes } from '@/lib/activity-logger'

/**
 * POST /api/clients/bulk-delete
 * 
 * OPTIMIZED: Bulk delete multiple clients efficiently
 * Only accessible to partners and managers
 * Uses database transactions for consistency
 * Handles cascading deletes properly
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners and managers can perform bulk deletions
    if (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ 
        error: 'Access denied. Partner or Manager role required.' 
      }, { status: 403 })
    }

    const { clientIds } = await request.json()

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ 
        error: 'Client IDs are required' 
      }, { status: 400 })
    }

    // Validate client IDs array
    if (clientIds.length > 100) {
      return NextResponse.json({ 
        error: 'Maximum 100 clients can be deleted at once' 
      }, { status: 400 })
    }

    // Fetch clients to verify they exist and get their details
    const existingClients = await db.client.findMany({
      where: {
        id: { in: clientIds }
      },
      include: {
        ltdAccountsWorkflows: true,
        vatQuartersWorkflow: true,
        activityLogs: true
      }
    })

    if (existingClients.length === 0) {
      return NextResponse.json({ 
        error: 'No clients found to delete' 
      }, { status: 404 })
    }

    let deletedCount = 0
    let failedCount = 0
    const deletedClients: Array<{ id: string; companyName: string; clientCode: string }> = []
    const failedClients: Array<{ id: string; companyName: string; error: string }> = []

    // Process deletions in batches to avoid memory issues
    const batchSize = 10
    
    for (let i = 0; i < existingClients.length; i += batchSize) {
      const batch = existingClients.slice(i, i + batchSize)
      
      await db.$transaction(async (tx) => {
        console.log(`🗑️ Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} clients)...`)
        
        for (const client of batch) {
          try {
            console.log(`   Deleting client: ${client.companyName} (${client.id})`)
            
            // 1. Delete VAT workflow history
            if (client.vatQuartersWorkflow.length > 0) {
              for (const vatQuarter of client.vatQuartersWorkflow) {
                await tx.vATWorkflowHistory.deleteMany({
                  where: { vatQuarterId: vatQuarter.id }
                })
              }
              
              await tx.vATQuarter.deleteMany({
                where: { clientId: client.id }
              })
            }
            
            // 2. Delete Ltd Accounts workflow history
            if (client.ltdAccountsWorkflows.length > 0) {
              for (const workflow of client.ltdAccountsWorkflows) {
                await tx.ltdAccountsWorkflowHistory.deleteMany({
                  where: { ltdAccountsWorkflowId: workflow.id }
                })
              }
              
              await tx.ltdAccountsWorkflow.deleteMany({
                where: { clientId: client.id }
              })
            }
            
            // 3. Delete activity logs
            if (client.activityLogs.length > 0) {
              await tx.activityLog.deleteMany({
                where: { clientId: client.id }
              })
            }
            
            // 4. Delete communications
            await tx.communication.deleteMany({
              where: { clientId: client.id }
            })
            
            // 5. Delete the client
            await tx.client.delete({
              where: { id: client.id }
            })
            
            deletedCount++
            deletedClients.push({
              id: client.id,
              companyName: client.companyName,
              clientCode: client.clientCode
            })
            
            console.log(`   ✅ Deleted: ${client.companyName}`)
            
          } catch (error) {
            console.error(`   ❌ Failed to delete ${client.companyName}:`, error)
            failedCount++
            failedClients.push({
              id: client.id,
              companyName: client.companyName,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      })
    }

    // Log bulk deletion activity
    await logActivity({
      userId: session.user.id,
      action: 'BULK_CLIENT_DELETE',
      details: {
        message: `Bulk deleted ${deletedCount} clients. Failed: ${failedCount}`,
        requested: clientIds.length,
        deleted: deletedCount,
        failed: failedCount,
        deletedClients: deletedClients.map(c => c.companyName)
      }
    })

    // Return comprehensive results
    if (deletedCount > 0 && failedCount === 0) {
      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deletedCount} client${deletedCount > 1 ? 's' : ''}`,
        deletedCount,
        deletedClients
      })
    } else if (deletedCount > 0 && failedCount > 0) {
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} client${deletedCount > 1 ? 's' : ''}, ${failedCount} failed`,
        deletedCount,
        failedCount,
        deletedClients,
        failedClients
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `Failed to delete any clients. ${failedCount} errors occurred.`,
        failedCount,
        failedClients
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error in bulk delete:', error)
    
    return NextResponse.json({
      error: 'Internal server error during bulk deletion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed. Use POST to bulk delete clients.' 
  }, { status: 405 })
} 