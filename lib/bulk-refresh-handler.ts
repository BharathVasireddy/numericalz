import { showToast } from '@/lib/toast'

export interface BulkRefreshResult {
  successful: string[]
  failed: { clientId: string, error: string }[]
}

export interface BackgroundJob {
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
  results?: BulkRefreshResult
}

export interface BulkRefreshResponse {
  success: boolean
  mode: 'immediate' | 'background'
  message: string
  results?: BulkRefreshResult
  jobId?: string
  totalClients?: number
  statusEndpoint?: string
}

class BulkRefreshHandler {
  private activeJobs = new Map<string, {
    intervalId: NodeJS.Timeout,
    onProgress?: (job: BackgroundJob) => void,
    onComplete?: (job: BackgroundJob) => void,
    onError?: (error: string) => void
  }>()

  async performBulkRefresh(
    clientIds: string[],
    options?: {
      onProgress?: (job: BackgroundJob) => void,
      onComplete?: (job: BackgroundJob) => void,
      onError?: (error: string) => void
    }
  ): Promise<BulkRefreshResponse> {
    try {
      const response = await fetch('/api/clients/bulk-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start bulk refresh')
      }

      const result: BulkRefreshResponse = await response.json()

      if (result.mode === 'immediate') {
        // For immediate processing, show results directly and call completion callback
        this.handleImmediateResults(result, options)
      } else if (result.mode === 'background' && result.jobId) {
        // For background processing, start monitoring the job
        this.startJobMonitoring(result.jobId, options)
        showToast.info(`Background refresh started for ${result.totalClients} clients. Monitoring progress...`)
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start bulk refresh'
      options?.onError?.(errorMessage)
      showToast.error(errorMessage)
      throw error
    }
  }

  private handleImmediateResults(
    result: BulkRefreshResponse, 
    options?: {
      onProgress?: (job: BackgroundJob) => void,
      onComplete?: (job: BackgroundJob) => void,
      onError?: (error: string) => void
    }
  ) {
    if (result.results) {
      const { successful, failed } = result.results
      
      if (successful.length > 0) {
        showToast.success(`✅ Successfully refreshed ${successful.length} clients`)
      }
      
      if (failed.length > 0) {
        showToast.error(`❌ Failed to refresh ${failed.length} clients`)
        console.warn('Failed refreshes:', failed)
      }

      // Call the completion callback with mock job data for immediate processing
      if (options?.onComplete) {
        const mockJob: BackgroundJob = {
          id: 'immediate-' + Date.now(),
          status: 'completed',
          totalClients: successful.length + failed.length,
          processedClients: successful.length + failed.length,
          successfulClients: successful.length,
          failedClients: failed.length,
          progress: 100,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          results: result.results
        }
        options.onComplete(mockJob)
      }
    }
  }

  private startJobMonitoring(
    jobId: string, 
    options?: {
      onProgress?: (job: BackgroundJob) => void,
      onComplete?: (job: BackgroundJob) => void,
      onError?: (error: string) => void
    }
  ) {
    // Clear any existing monitoring for this job
    this.stopJobMonitoring(jobId)

    let consecutiveErrors = 0
    const maxConsecutiveErrors = 5

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`/api/clients/bulk-refresh/status/${jobId}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Job not found - may have been completed and cleaned up')
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (!data.success || !data.job) {
          throw new Error('Invalid response format from status endpoint')
        }
        
        const job: BackgroundJob = data.job

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
          const errorMessage = 'Background refresh job failed'
          showToast.error(errorMessage)
          options?.onError?.(errorMessage)
        }

      } catch (error) {
        consecutiveErrors++
        console.error(`Error checking job status (attempt ${consecutiveErrors}/${maxConsecutiveErrors}):`, error)
        
        // If we've had too many consecutive errors, stop monitoring
        if (consecutiveErrors >= maxConsecutiveErrors) {
          this.stopJobMonitoring(jobId)
          const errorMessage = `Failed to monitor job progress after ${maxConsecutiveErrors} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
          showToast.error(errorMessage)
          options?.onError?.(errorMessage)
        }
        // Otherwise, continue trying (the interval will continue)
      }
    }, 3000) // Check every 3 seconds

    // Store the monitoring details
    this.activeJobs.set(jobId, {
      intervalId,
      onProgress: options?.onProgress,
      onComplete: options?.onComplete,
      onError: options?.onError
    })
  }

  private handleJobCompletion(job: BackgroundJob) {
    const { successfulClients, failedClients, totalClients, results } = job

    // Show completion message
    showToast.success(
      `🎉 Bulk refresh completed!\n✅ ${successfulClients}/${totalClients} clients updated successfully`
    )

    if (failedClients > 0 && results?.failed) {
      showToast.error(`❌ ${failedClients} clients failed to refresh`)
      console.warn('Failed refreshes:', results.failed)
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
  async checkJobStatus(jobId: string): Promise<BackgroundJob | null> {
    try {
      const response = await fetch(`/api/clients/bulk-refresh/status/${jobId}`)
      
      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.job
    } catch (error) {
      console.error('Error checking job status:', error)
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
export const bulkRefreshHandler = new BulkRefreshHandler()

// Utility hook for React components
export function useBulkRefresh() {
  const performBulkRefresh = bulkRefreshHandler.performBulkRefresh.bind(bulkRefreshHandler)
  const checkJobStatus = bulkRefreshHandler.checkJobStatus.bind(bulkRefreshHandler)
  
  return {
    performBulkRefresh,
    checkJobStatus,
    cleanup: () => bulkRefreshHandler.cleanup()
  }
} 