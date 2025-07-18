import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

// This would normally be in a shared module, but for now we'll duplicate the interface
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

// Import the background jobs map from the main route
// In production, this would be a shared Redis/database store
declare global {
  var backgroundJobs: Map<string, BulkRefreshJob> | undefined
}

// Initialize global jobs map if it doesn't exist
if (!global.backgroundJobs) {
  global.backgroundJobs = new Map()
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = params
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    const job = global.backgroundJobs!.get(jobId)
    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found. It may have been completed and cleaned up.' 
      }, { status: 404 })
    }

    // Only allow the user who started the job or partners to check its status
    if (job.userId !== session.user.id && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Calculate progress percentage
    const progress = job.totalClients > 0 ? Math.round((job.processedClients / job.totalClients) * 100) : 0

    // Calculate estimated time remaining for processing jobs
    let estimatedTimeRemaining: number | null = null
    if (job.status === 'processing' && job.processedClients > 0) {
      const elapsedTime = Date.now() - job.startedAt.getTime()
      const avgTimePerClient = elapsedTime / job.processedClients
      const remainingClients = job.totalClients - job.processedClients
      estimatedTimeRemaining = Math.round((avgTimePerClient * remainingClients) / 1000) // in seconds
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
        progress: progress,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        estimatedTimeRemaining: estimatedTimeRemaining,
        results: job.status === 'completed' ? job.results : undefined
      }
    })

  } catch (error) {
    console.error('Error checking job status:', error)
    return NextResponse.json({ 
      error: 'Failed to check job status' 
    }, { status: 500 })
  }
} 