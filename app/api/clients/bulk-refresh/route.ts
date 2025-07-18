import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logActivityEnhanced } from '@/lib/activity-middleware'
import { z } from 'zod'

const BulkRefreshSchema = z.object({
  clientIds: z.array(z.string()).min(1, 'At least one client ID is required').max(1000, 'Maximum 1000 clients can be refreshed at once')
})

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

// Background job tracking
interface BulkRefreshJob {
  id: string
  userId: string
  totalClients: number
  processedClients: number
  successfulClients: number
  failedClients: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  results: {
    successful: string[]
    failed: { clientId: string, error: string }[]
  }
}

// In-memory job tracking (in production, use Redis or database)
declare global {
  var backgroundJobs: Map<string, BulkRefreshJob> | undefined
}

// Initialize global jobs map if it doesn't exist
if (!global.backgroundJobs) {
  global.backgroundJobs = new Map()
}

const backgroundJobs = global.backgroundJobs

// Generate unique job ID
function generateJobId(): string {
  return `bulk-refresh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Process clients in parallel chunks
async function processClientsChunk(
  clientIds: string[], 
  requestOrigin: string, 
  cookieHeader: string,
  chunkSize: number = 10
): Promise<{ successful: string[], failed: { clientId: string, error: string }[] }> {
  const results = {
    successful: [] as string[],
    failed: [] as { clientId: string, error: string }[]
  }
  
  // Process in chunks to avoid overwhelming the server
  for (let i = 0; i < clientIds.length; i += chunkSize) {
    const chunk = clientIds.slice(i, i + chunkSize)
    
    // Process chunk in parallel
    const chunkPromises = chunk.map(async (clientId) => {
      try {
        const refreshResponse = await fetch(`${requestOrigin}/api/clients/${clientId}/refresh-companies-house`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout per request
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
    })
    
    // Wait for chunk to complete
    await Promise.allSettled(chunkPromises)
    
    // Small delay between chunks to avoid overwhelming the API
    if (i + chunkSize < clientIds.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  return results
}

// Background processing function
async function processBackgroundJob(
  jobId: string, 
  clientIds: string[], 
  requestOrigin: string, 
  cookieHeader: string,
  userId: string,
  userEmail: string,
  userRole: string
) {
  const job = backgroundJobs.get(jobId)
  if (!job) return
  
  try {
    job.status = 'processing'
    console.log(`🚀 Starting background bulk refresh for ${clientIds.length} clients (Job: ${jobId})`)
    
    // Determine optimal chunk size based on total clients
    const chunkSize = clientIds.length <= 50 ? 10 : clientIds.length <= 200 ? 15 : 20
    
    const results = await processClientsChunk(clientIds, requestOrigin, cookieHeader, chunkSize)
    
    // Update job with results
    job.processedClients = clientIds.length
    job.successfulClients = results.successful.length
    job.failedClients = results.failed.length
    job.status = 'completed'
    job.completedAt = new Date()
    job.results = results
    
    console.log(`✅ Background job ${jobId} completed: ${results.successful.length}/${clientIds.length} successful`)
    
    // Log activity (create minimal request object for logging)
    const fakeRequest = {
      nextUrl: { origin: requestOrigin },
      headers: new Map([['cookie', cookieHeader]])
    } as any
    
    await logActivityEnhanced(fakeRequest, {
      action: 'BULK_COMPANIES_HOUSE_REFRESH',
      details: {
        message: `Background bulk Companies House refresh: ${results.successful.length}/${clientIds.length} clients updated successfully`,
        jobId: jobId,
        requestedClients: clientIds.length,
        successfulClients: results.successful.length,
        failedClients: results.failed.length,
        successfulClientIds: results.successful,
        failedResults: results.failed,
        operatedBy: userEmail,
        operatedByRole: userRole,
        processingMode: 'background'
      }
    })
    
  } catch (error) {
    console.error(`❌ Background job ${jobId} failed:`, error)
    job.status = 'failed'
    job.completedAt = new Date()
  }
}

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

    console.log(`📋 Bulk Companies House refresh requested for ${clientIds.length} clients by user ${session.user.email}`)

    // For small batches (≤ 20 clients), process immediately for faster response
    if (clientIds.length <= 20) {
      console.log('🏃 Processing small batch immediately')
      
      const results = await processClientsChunk(
        clientIds, 
        request.nextUrl.origin, 
        request.headers.get('Cookie') || '',
        10 // Small chunk size for immediate processing
      )

      // Log activity for immediate processing
      await logActivityEnhanced(request, {
        action: 'BULK_COMPANIES_HOUSE_REFRESH',
        details: {
          message: `Immediate bulk Companies House refresh: ${results.successful.length}/${clientIds.length} clients updated successfully`,
          requestedClients: clientIds.length,
          successfulClients: results.successful.length,
          failedClients: results.failed.length,
          successfulClientIds: results.successful,
          failedResults: results.failed,
          operatedBy: session.user.name || session.user.email || 'Unknown User',
          operatedByRole: session.user.role,
          processingMode: 'immediate'
        }
      })

      return NextResponse.json({
        success: true,
        mode: 'immediate',
        message: `Bulk refresh completed: ${results.successful.length}/${clientIds.length} clients updated successfully`,
        results
      })
    }

    // For large batches (> 20 clients), use background processing
    const jobId = generateJobId()
    const job: BulkRefreshJob = {
      id: jobId,
      userId: session.user.id,
      totalClients: clientIds.length,
      processedClients: 0,
      successfulClients: 0,
      failedClients: 0,
      status: 'pending',
      startedAt: new Date(),
      results: {
        successful: [],
        failed: []
      }
    }

    // Store job
    backgroundJobs.set(jobId, job)

    // Start background processing (don't await)
    setImmediate(() => {
      processBackgroundJob(
        jobId,
        clientIds,
        request.nextUrl.origin,
        request.headers.get('Cookie') || '',
        session.user.id,
        session.user.email || 'Unknown',
        session.user.role
      )
    })

    console.log(`🔄 Background job ${jobId} started for ${clientIds.length} clients`)

    return NextResponse.json({
      success: true,
      mode: 'background',
      jobId: jobId,
      message: `Background refresh started for ${clientIds.length} clients. Use the job ID to check progress.`,
      totalClients: clientIds.length,
      statusEndpoint: `/api/clients/bulk-refresh/status/${jobId}`
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
      error: 'Failed to start bulk refresh'
    }, { status: 500 })
  }
}

// GET endpoint to check job status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const job = backgroundJobs.get(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Only allow the user who started the job to check its status
    if (job.userId !== session.user.id && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        totalClients: job.totalClients,
        processedClients: job.processedClients,
        successfulClients: job.successfulClients,
        failedClients: job.failedClients,
        progress: job.totalClients > 0 ? Math.round((job.processedClients / job.totalClients) * 100) : 0,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        results: job.status === 'completed' ? job.results : undefined
      }
    })

  } catch (error) {
    console.error('Error checking job status:', error)
    return NextResponse.json({ error: 'Failed to check job status' }, { status: 500 })
  }
} 