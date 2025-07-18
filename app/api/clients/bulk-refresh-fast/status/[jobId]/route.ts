import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Force dynamic rendering for this route since it uses session
export const dynamic = 'force-dynamic'

// Fast bulk refresh job interface
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

// Import the fast background jobs map
declare global {
  var fastBulkJobs: Map<string, FastBulkRefreshJob> | undefined
}

// Initialize global jobs map if it doesn't exist
if (!global.fastBulkJobs) {
  global.fastBulkJobs = new Map()
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

    const job = global.fastBulkJobs!.get(jobId)
    if (!job) {
      return NextResponse.json({ 
        error: 'Fast job not found. It may have been completed and cleaned up.' 
      }, { status: 404 })
    }

    // Only allow the user who started the job or partners to check its status
    if (job.userId !== session.user.id && session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Calculate progress percentage
    const progress = job.totalClients > 0 ? Math.round((job.processedClients / job.totalClients) * 100) : 0

    // Calculate estimated time remaining for processing jobs (faster estimates)
    let estimatedTimeRemaining: number | null = null
    if (job.status === 'processing' && job.processedClients > 0) {
      const elapsedTime = Date.now() - job.startedAt.getTime()
      const avgTimePerClient = elapsedTime / job.processedClients
      const remainingClients = job.totalClients - job.processedClients
      // Fast processing should be much quicker
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
        results: job.status === 'completed' ? job.results : undefined,
        mode: 'fast' // Indicate this is the fast processing mode
      }
    })

  } catch (error) {
    console.error('Error checking fast job status:', error)
    return NextResponse.json({ 
      error: 'Failed to check fast job status' 
    }, { status: 500 })
  }
} 