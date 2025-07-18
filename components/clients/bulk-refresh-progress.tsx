'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle, XCircle, Clock, Eye, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type BackgroundJob } from '@/lib/bulk-refresh-handler'
import { Label } from '@/components/ui/label'

interface BulkRefreshProgressProps {
  jobId: string
  onComplete?: () => void
  onClose?: () => void
  autoClose?: boolean
}

export function BulkRefreshProgress({ 
  jobId, 
  onComplete, 
  onClose,
  autoClose = true 
}: BulkRefreshProgressProps) {
  const [job, setJob] = useState<BackgroundJob | null>(null)
  const [isPolling, setIsPolling] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJobStatus = async () => {
    try {
      const response = await fetch(`/api/clients/bulk-refresh/status/${jobId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch job status')
      }

      const data = await response.json()
      setJob(data.job)
      setError(null)

      // Stop polling if job is completed or failed
      if (data.job.status === 'completed' || data.job.status === 'failed') {
        setIsPolling(false)
        
        if (data.job.status === 'completed' && onComplete) {
          onComplete()
        }

        // Auto close after a delay if enabled
        if (autoClose && data.job.status === 'completed') {
          setTimeout(() => {
            onClose?.()
          }, 3000)
        }
      }
    } catch (err) {
      console.error('Error fetching job status:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsPolling(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchJobStatus()

    // Set up polling
    let intervalId: NodeJS.Timeout
    
    if (isPolling) {
      intervalId = setInterval(fetchJobStatus, 2000) // Poll every 2 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isPolling, jobId])

  const getStatusIcon = () => {
    if (!job) return <RefreshCw className="h-4 w-4 animate-spin" />
    
    switch (job.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <RefreshCw className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    if (!job) return 'default'
    
    switch (job.status) {
      case 'pending':
        return 'secondary'
      case 'processing':
        return 'default'
      case 'completed':
        return 'default'
      case 'failed':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.round((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) {
      return `${duration}s`
    } else {
      const minutes = Math.floor(duration / 60)
      const seconds = duration % 60
      return `${minutes}m ${seconds}s`
    }
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-semibold text-red-700">Error monitoring job</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!job) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <p>Loading job status...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {getStatusIcon()}
              Bulk Companies House Refresh
              <Badge variant={getStatusColor()} className="ml-2">
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(true)}
                className="text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Details
              </Button>
              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{job.progress}% ({job.processedClients}/{job.totalClients})</span>
            </div>
            <Progress value={job.progress} className="h-2" />
          </div>

          {/* Status Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Duration</p>
              <p className="font-semibold">
                {formatDuration(job.startedAt, job.completedAt)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-semibold">
                {job.status === 'processing' && job.estimatedTimeRemaining
                  ? `ETA: ${Math.round(job.estimatedTimeRemaining)}s`
                  : job.status}
              </p>
            </div>
          </div>

          {/* Results Summary */}
          {job.status === 'completed' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Successful</p>
                <p className="font-semibold text-green-600">{job.successfulClients}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Failed</p>
                <p className="font-semibold text-red-600">{job.failedClients}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Refresh Job Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Job ID</Label>
                <p className="text-sm text-muted-foreground font-mono">{job.id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <p className="text-sm">{job.status}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Total Clients</Label>
                <p className="text-sm">{job.totalClients}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Progress</Label>
                <p className="text-sm">{job.processedClients}/{job.totalClients} ({job.progress}%)</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Started</Label>
                <p className="text-sm">{new Date(job.startedAt).toLocaleString()}</p>
              </div>
              {job.completedAt && (
                <div>
                  <Label className="text-sm font-medium">Completed</Label>
                  <p className="text-sm">{new Date(job.completedAt).toLocaleString()}</p>
                </div>
              )}
            </div>

            {job.status === 'completed' && job.results && (
              <div className="space-y-3">
                <h4 className="font-medium">Results Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-green-600">Successful ({job.results.successful.length})</Label>
                    {job.results.successful.length > 0 && (
                      <div className="max-h-32 overflow-y-auto mt-1">
                        {job.results.successful.map((clientId, index) => (
                          <p key={index} className="text-xs text-muted-foreground font-mono">
                            {clientId}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-red-600">Failed ({job.results.failed.length})</Label>
                    {job.results.failed.length > 0 && (
                      <div className="max-h-32 overflow-y-auto mt-1">
                        {job.results.failed.map((failure, index) => (
                          <div key={index} className="text-xs">
                            <p className="font-mono text-muted-foreground">{failure.clientId}</p>
                            <p className="text-red-600">{failure.error}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 