import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logActivityEnhanced } from '@/lib/activity-middleware'
import { z } from 'zod'

const BulkRefreshSchema = z.object({
  clientIds: z.array(z.string()).min(1, 'At least one client ID is required').max(50, 'Maximum 50 clients can be refreshed at once')
})

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get session for authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow MANAGER and PARTNER roles to bulk refresh
    if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
      return NextResponse.json({ 
        error: 'Insufficient permissions. Only managers and partners can bulk refresh Companies House data.' 
      }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { clientIds } = BulkRefreshSchema.parse(body)

    console.log(`Starting bulk Companies House refresh for ${clientIds.length} clients by user ${session.user.email}`)

    // Track results
    const results = {
      successful: [] as string[],
      failed: [] as { clientId: string, error: string }[],
      total: clientIds.length
    }

    // Process each client with a small delay to respect API rate limits
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i] as string  // Safe because array is validated by Zod
      
      try {
        console.log(`Refreshing Companies House data for client ${clientId} (${i + 1}/${clientIds.length})`)
        
        // Call the individual refresh endpoint
        const refreshResponse = await fetch(`${request.nextUrl.origin}/api/clients/${clientId}/refresh-companies-house`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || ''
          }
        })

        if (refreshResponse.ok) {
          results.successful.push(clientId)
          console.log(`✅ Successfully refreshed client ${clientId}`)
        } else {
          const errorData = await refreshResponse.json().catch(() => ({ error: 'Unknown error' }))
          results.failed.push({ 
            clientId, 
            error: errorData.error || `HTTP ${refreshResponse.status}` 
          })
          console.log(`❌ Failed to refresh client ${clientId}: ${errorData.error}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.failed.push({ clientId, error: errorMessage })
        console.log(`❌ Failed to refresh client ${clientId}: ${errorMessage}`)
      }

      // Add a small delay between requests to respect API rate limits (100ms)
      if (i < clientIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`Bulk refresh completed: ${results.successful.length} successful, ${results.failed.length} failed`)

    // Log bulk Companies House refresh activity
    await logActivityEnhanced(request, {
      action: 'BULK_COMPANIES_HOUSE_REFRESH',
      details: {
        message: `Bulk Companies House refresh: ${results.successful.length}/${results.total} clients updated successfully`,
        requestedClients: results.total,
        successfulClients: results.successful.length,
        failedClients: results.failed.length,
        successfulClientIds: results.successful,
        failedResults: results.failed,
        operatedBy: session.user.name || session.user.email || 'Unknown User',
        operatedByRole: session.user.role
      }
    })

    // Return results
    return NextResponse.json({
      success: true,
      message: `Bulk refresh completed: ${results.successful.length}/${results.total} clients updated successfully`,
      results
    })

  } catch (error) {
    console.error('Error in bulk Companies House refresh:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Failed to perform bulk refresh'
    }, { status: 500 })
  }
} 