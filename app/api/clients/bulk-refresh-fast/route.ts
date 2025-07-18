import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logActivityEnhanced } from '@/lib/activity-middleware'
import { db } from '@/lib/db'
import { getComprehensiveCompanyData } from '@/lib/companies-house'
import { z } from 'zod'

const BulkRefreshFastSchema = z.object({
  clientIds: z.array(z.string()).min(1, 'At least one client ID is required').max(2000, 'Maximum 2000 clients can be refreshed at once')
})

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

// Background job tracking
interface FastBulkRefreshJob {
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

// Global job tracking with improved performance
declare global {
  var fastBulkJobs: Map<string, FastBulkRefreshJob> | undefined
}

if (!global.fastBulkJobs) {
  global.fastBulkJobs = new Map()
}

const fastBulkJobs = global.fastBulkJobs

// Generate unique job ID
function generateJobId(): string {
  return `fast-bulk-refresh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// High-performance direct Companies House refresh
async function refreshClientDirect(clientId: string): Promise<{ success: boolean, clientId: string, error?: string }> {
  try {
    // Get client data efficiently
    const client = await db.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyNumber: true,
        companyName: true,
        clientCode: true,
        lastAccountsMadeUpTo: true,
        incorporationDate: true
      }
    })

    if (!client || !client.companyNumber) {
      return { success: false, clientId, error: 'No company number' }
    }

    // Fetch Companies House data directly (no internal HTTP calls)
    const { company: companyData, officers, psc } = await getComprehensiveCompanyData(client.companyNumber)

    if (!companyData) {
      return { success: false, clientId, error: 'Companies House data not found' }
    }

    // Prepare update data efficiently
    const updateData: any = {}
    
    if (companyData.company_name && companyData.company_name !== client.companyName) {
      updateData.companyName = companyData.company_name
    }
    
    if (companyData.company_status) updateData.companyStatus = companyData.company_status
    if (companyData.company_status_detail) updateData.companyStatusDetail = companyData.company_status_detail
    
    if (companyData.date_of_creation) {
      updateData.incorporationDate = new Date(companyData.date_of_creation)
    }
    
    if (companyData.date_of_cessation) {
      updateData.cessationDate = new Date(companyData.date_of_cessation)
    }
    
    if (companyData.registered_office_address) {
      updateData.registeredOfficeAddress = JSON.stringify(companyData.registered_office_address)
    }
    
    if (companyData.sic_codes) {
      updateData.sicCodes = JSON.stringify(companyData.sic_codes)
    }
    
    // Official Companies House dates
    if (companyData.accounts?.next_due) {
      updateData.nextAccountsDue = new Date(companyData.accounts.next_due)
    }
    
    if (companyData.accounts?.next_made_up_to) {
      updateData.nextYearEnd = new Date(companyData.accounts.next_made_up_to)
    }
    
    if (companyData.accounts?.last_accounts?.made_up_to) {
      updateData.lastAccountsMadeUpTo = new Date(companyData.accounts.last_accounts.made_up_to)
    }
    
    if (companyData.confirmation_statement?.next_due) {
      updateData.nextConfirmationDue = new Date(companyData.confirmation_statement.next_due)
    }
    
    if (companyData.confirmation_statement?.last_made_up_to) {
      updateData.lastConfirmationMadeUpTo = new Date(companyData.confirmation_statement.last_made_up_to)
    }
    
    // Company status flags
    if (companyData.jurisdiction !== undefined) updateData.jurisdiction = companyData.jurisdiction
    if (companyData.has_been_liquidated !== undefined) updateData.hasBeenLiquidated = companyData.has_been_liquidated
    if (companyData.has_charges !== undefined) updateData.hasCharges = companyData.has_charges
    if (companyData.has_insolvency_history !== undefined) updateData.hasInsolvencyHistory = companyData.has_insolvency_history
    
    // Officers and PSC data
    if (officers) updateData.officers = JSON.stringify(officers)
    if (psc) updateData.personsWithSignificantControl = JSON.stringify(psc)

    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      await db.client.update({
        where: { id: clientId },
        data: updateData
      })
    }

    return { success: true, clientId }
    
  } catch (error) {
    console.error(`Error refreshing client ${clientId}:`, error)
    return { 
      success: false, 
      clientId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// High-performance batch processing with maximum optimizations
async function processClientsBatch(
  clientIds: string[], 
  batchSize: number, 
  jobId?: string
): Promise<{
  successful: string[]
  failed: { clientId: string, error: string }[]
}> {
  const results = {
    successful: [] as string[],
    failed: [] as { clientId: string, error: string }[]
  }

  // Process in parallel chunks with optimized batch sizes
  for (let i = 0; i < clientIds.length; i += batchSize) {
    const chunk = clientIds.slice(i, i + batchSize)
    
    // Process chunk in parallel with optimized timeout
    const chunkPromises = chunk.map(async (clientId) => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 6000) // Reduced from 8s to 6s
      )
      
      try {
        const result = await Promise.race([
          refreshClientDirect(clientId),
          timeoutPromise
        ]) as { success: boolean, clientId: string, error?: string }
        
        if (result.success) {
          results.successful.push(clientId)
        } else {
          results.failed.push({ clientId, error: result.error || 'Unknown error' })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.failed.push({ clientId, error: errorMessage })
      }
    })

    await Promise.allSettled(chunkPromises)
    
    // Update progress if this is a background job
    if (jobId) {
      const job = fastBulkJobs.get(jobId)
      if (job) {
        job.processedClients = Math.min(i + batchSize, clientIds.length)
        job.successfulClients = results.successful.length
        job.failedClients = results.failed.length
        console.log(`📊 Progress update: ${job.processedClients}/${job.totalClients} processed (${Math.round((job.processedClients / job.totalClients) * 100)}%)`)
      }
    }
    
    // Shorter delay between batches (only for very large operations)
    if (i + batchSize < clientIds.length && clientIds.length > 150) {
      await new Promise(resolve => setTimeout(resolve, 50)) // Reduced from 100ms to 50ms
    }
  }
  
  return results
}

// Background processing function with maximum optimizations
async function processBackgroundJobFast(
  jobId: string, 
  clientIds: string[],
  userId: string,
  userEmail: string,
  userRole: string
) {
  const job = fastBulkJobs.get(jobId)
  if (!job) return
  
  try {
    job.status = 'processing'
    console.log(`🚀 Starting ULTRA-FAST background bulk refresh for ${clientIds.length} clients (Job: ${jobId})`)
    
    // Determine optimal batch size based on total clients (more aggressive)
    let batchSize: number
    if (clientIds.length <= 75) {
      batchSize = 50  // Increased from 25 to 50
    } else if (clientIds.length <= 300) {
      batchSize = 75  // Increased from 50 to 75
    } else {
      batchSize = 100 // Increased from 75 to 100
    }
    
    const results = await processClientsBatch(clientIds, batchSize, jobId)
    
    // Update job with results
    job.processedClients = clientIds.length
    job.successfulClients = results.successful.length
    job.failedClients = results.failed.length
    job.status = 'completed'
    job.completedAt = new Date()
    job.results = results
    
    console.log(`✅ ULTRA-FAST background job ${jobId} completed: ${results.successful.length}/${clientIds.length} successful`)
    
    // Batch activity logging (much more efficient)
    try {
      await db.activityLog.create({
        data: {
          userId: userId,
          action: 'BULK_COMPANIES_HOUSE_REFRESH_ULTRA_FAST',
          details: JSON.stringify({
            message: `Ultra-fast bulk Companies House refresh: ${results.successful.length}/${clientIds.length} clients updated successfully`,
            jobId: jobId,
            requestedClients: clientIds.length,
            successfulClients: results.successful.length,
            failedClients: results.failed.length,
            operatedBy: userEmail,
            operatedByRole: userRole,
            processingMode: 'ultra-fast-background',
            batchSize: batchSize,
            duration: job.completedAt ? job.completedAt.getTime() - job.startedAt.getTime() : 0
          })
        }
      })
    } catch (logError) {
      console.error('Error logging ultra-fast bulk refresh activity:', logError)
      // Don't fail the job if logging fails
    }
    
  } catch (error) {
    console.error(`❌ ULTRA-FAST background job ${jobId} failed:`, error)
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
    const { clientIds } = BulkRefreshFastSchema.parse(body)

    console.log(`🚀 FAST bulk Companies House refresh requested for ${clientIds.length} clients by user ${session.user.email}`)

    // For small batches (≤ 50 clients), process immediately for fastest response
    if (clientIds.length <= 50) {
      console.log('⚡ Processing small-medium batch immediately with ultra-high performance')
      
      const startTime = Date.now()
      const results = await processClientsBatch(clientIds, Math.min(clientIds.length, 50))
      const duration = Date.now() - startTime
      
      console.log(`⚡ Immediate processing completed in ${duration}ms`)

      // Log activity for immediate processing
      await db.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'BULK_COMPANIES_HOUSE_REFRESH_FAST',
          details: JSON.stringify({
            message: `Immediate fast bulk Companies House refresh: ${results.successful.length}/${clientIds.length} clients updated successfully`,
            requestedClients: clientIds.length,
            successfulClients: results.successful.length,
            failedClients: results.failed.length,
            operatedBy: session.user.name || session.user.email || 'Unknown User',
            operatedByRole: session.user.role,
            processingMode: 'fast-immediate',
            duration: duration
          })
        }
      })

      return NextResponse.json({
        success: true,
        mode: 'immediate',
        message: `Fast bulk refresh completed in ${(duration/1000).toFixed(1)}s: ${results.successful.length}/${clientIds.length} clients updated successfully`,
        duration: duration,
        results
      })
    }

    // For large batches (> 50 clients), use ultra-optimized background processing
    const jobId = generateJobId()
    const job: FastBulkRefreshJob = {
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
    fastBulkJobs.set(jobId, job)

    // Start optimized background processing (don't await)
    setImmediate(() => {
      processBackgroundJobFast(
        jobId,
        clientIds,
        session.user.id,
        session.user.email || 'Unknown',
        session.user.role
      )
    })

    console.log(`🚀 FAST background job ${jobId} started for ${clientIds.length} clients`)

    return NextResponse.json({
      success: true,
      mode: 'background',
      jobId: jobId,
      message: `Ultra-fast background refresh started for ${clientIds.length} clients. This should complete much faster!`,
      totalClients: clientIds.length,
      statusEndpoint: `/api/clients/bulk-refresh-fast/status/${jobId}`,
      expectedDuration: `~${Math.ceil(clientIds.length / 75 * 0.4)} minutes` // Even faster estimate with new optimizations
    })

  } catch (error) {
    console.error('Error in fast bulk Companies House refresh:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Failed to start fast bulk refresh'
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

    const job = fastBulkJobs.get(jobId)
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
    console.error('Error checking fast job status:', error)
    return NextResponse.json({ error: 'Failed to check job status' }, { status: 500 })
  }
} 