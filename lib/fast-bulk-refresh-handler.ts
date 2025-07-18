import { showToast } from '@/lib/toast'

export interface FastBulkRefreshResult {
  successful: string[]
  failed: { clientId: string, error: string }[]
}

export interface FastBackgroundJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalClients: number
  processedClients: number
  successfulClients: number
  failedClients: number
  progress: number
  startedAt: string
  completedAt?: string
  estimatedTimeRemaining?: number
  results?: FastBulkRefreshResult
  mode: 'fast'
}

export interface FastBulkRefreshResponse {
  success: boolean
  mode: 'immediate' | 'background'
  message: string
  duration?: number
  results?: FastBulkRefreshResult
  jobId?: string
  totalClients?: number
  statusEndpoint?: string
  expectedDuration?: string
}

class FastBulkRefreshHandler {
  private activeJobs = new Map<string, {
    intervalId: NodeJS.Timeout,
    onProgress?: (job: FastBackgroundJob) => void,
    onComplete?: (job: FastBackgroundJob) => void,
    onError?: (error: string) => void
  }>()

  async performFastBulkRefresh(
    clientIds: string[],
    options?: {
      onProgress?: (job: FastBackgroundJob) => void,
      onComplete?: (job: FastBackgroundJob) => void,
      onError?: (error: string) => void
    }
  ): Promise<FastBulkRefreshResponse> {
    try {
      console.log(`🚀 Starting FAST bulk refresh for ${clientIds.length} clients`)
      
      const response = await fetch('/api/clients/bulk-refresh-fast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start fast bulk refresh')
      }

      const result: FastBulkRefreshResponse = await response.json()

      if (result.mode === 'immediate') {
        // For immediate processing, show results directly
        this.handleImmediateResults(result)
      } else if (result.mode === 'background' && result.jobId) {
        // For background processing, start monitoring the job
        this.startJobMonitoring(result.jobId, options)
        showToast.info(`⚡ FAST background refresh started for ${result.totalClients} clients. Expected completion: ${result.expectedDuration}`)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start fast bulk refresh'
      options?.onError?.(errorMessage)
      showToast.error(errorMessage)
      throw error
    }
  }

  private handleImmediateResults(result: FastBulkRefreshResponse) {
    if (result.results) {
      const { successful, failed } = result.results
      const duration = result.duration ? `in ${(result.duration/1000).toFixed(1)}s` : ''
      
      if (successful.length > 0) {
        showToast.success(`⚡ Fast refresh completed ${duration}! ✅ ${successful.length} clients updated successfully`)
      }
      
      if (failed.length > 0) {
        showToast.error(`❌ ${failed.length} clients failed to refresh`)
        console.warn('Failed fast refreshes:', failed)
      }
    }
  }

  private startJobMonitoring(
    jobId: string, 
    options?: {
      onProgress?: (job: FastBackgroundJob) => void,
      onComplete?: (job: FastBackgroundJob) => void,
      onError?: (error: string) => void
    }
  ) {
    // Clear any existing monitoring for this job
    this.stopJobMonitoring(jobId)

    let consecutiveErrors = 0
    const maxConsecutiveErrors = 5

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/clients/bulk-refresh-fast/status/${jobId}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Fast job not found - may have been completed and cleaned up')
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (!data.success || !data.job) {
          throw new Error('Invalid response format from fast status endpoint')
        }
        
        const job: FastBackgroundJob = data.job

        // Reset error counter on successful response
        consecutiveErrors = 0

        // Call progress callback
        options?.onProgress?.(job)

        // Remove progress toast - progress is now shown in button
        // The component will handle progress display through the onProgress callback

        // Handle completion
        if (job.status === 'completed') {
          this.stopJobMonitoring(jobId)
          this.handleJobCompletion(job)
          options?.onComplete?.(job)
        } else if (job.status === 'failed') {
          this.stopJobMonitoring(jobId)
          const errorMessage = 'Fast background refresh job failed'
          showToast.error(errorMessage)
          options?.onError?.(errorMessage)
        }

      } catch (error) {
        consecutiveErrors++
        console.error(`Error checking fast job status (attempt ${consecutiveErrors}/${maxConsecutiveErrors}):`, error)
        
        // If we've had too many consecutive errors, stop monitoring
        if (consecutiveErrors >= maxConsecutiveErrors) {
          this.stopJobMonitoring(jobId)
          const errorMessage = `Failed to monitor fast job progress after ${maxConsecutiveErrors} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
          showToast.error(errorMessage)
          options?.onError?.(errorMessage)
        }
        // Otherwise, continue trying (the interval will continue)
      }
    }, 2000) // Check every 2 seconds (slightly faster than regular)

    // Store the monitoring details
    this.activeJobs.set(jobId, {
      intervalId,
      onProgress: options?.onProgress,
      onComplete: options?.onComplete,
      onError: options?.onError
    })
  }

  private handleJobCompletion(job: FastBackgroundJob) {
    const { successfulClients, failedClients, totalClients, results } = job
    const duration = job.completedAt ? 
      `in ${((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000).toFixed(1)}s` : ''

    // Show completion message
    showToast.success(
      `🎉 FAST bulk refresh completed ${duration}!\n⚡ ${successfulClients}/${totalClients} clients updated successfully`
    )

    if (failedClients > 0 && results?.failed) {
      showToast.error(`❌ ${failedClients} clients failed to refresh`)
      console.warn('Failed fast refreshes:', results.failed)
    }
  }

  private stopJobMonitoring(jobId: string) {
    const job = this.activeJobs.get(jobId)
    if (job) {
      clearInterval(job.intervalId)
      this.activeJobs.delete(jobId)
    }
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`
    } else {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s`
    }
  }

  // Method to manually check job status
  async checkJobStatus(jobId: string): Promise<FastBackgroundJob | null> {
    try {
      const response = await fetch(`/api/clients/bulk-refresh-fast/status/${jobId}`)
      
      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.job
    } catch (error) {
      console.error('Error checking fast job status:', error)
      return null
    }
  }

  // Clean up all active jobs (useful for component unmounting)
  cleanup() {
    for (const [jobId, job] of this.activeJobs) {
      clearInterval(job.intervalId)
    }
    this.activeJobs.clear()
  }
}

// Export a singleton instance
export const fastBulkRefreshHandler = new FastBulkRefreshHandler()

// Utility hook for React components
export function useFastBulkRefresh() {
  const performFastBulkRefresh = fastBulkRefreshHandler.performFastBulkRefresh.bind(fastBulkRefreshHandler)
  const checkJobStatus = fastBulkRefreshHandler.checkJobStatus.bind(fastBulkRefreshHandler)
  
  return {
    performFastBulkRefresh,
    checkJobStatus,
    cleanup: () => fastBulkRefreshHandler.cleanup()
  }
} 