'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Calendar,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  FileText,
  Users,
  Building
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { getNextNonLtdStages, getNonLtdStageDisplayName } from '@/lib/non-ltd-workflow-utils'
import { NonLtdAccountsWorkflowStage } from '@prisma/client'
import { format } from 'date-fns'

interface NonLtdWorkflowModalProps {
  workflow: {
    id: string
    yearEndDate: string
    filingDueDate: string
    currentStage: string
    stageDisplayName: string
    status: string
    isCompleted: boolean
    assignedUser?: {
      id: string
      name: string
      email: string
      role: string
    }
    chaseStartedDate?: string
    paperworkReceivedDate?: string
    workStartedDate?: string
    managerDiscussionDate?: string
    partnerReviewDate?: string
    reviewCompletedDate?: string
    sentToClientDate?: string
    clientApprovedDate?: string
    partnerApprovedDate?: string
    filedToHMRCDate?: string
  }
  client: {
    id: string
    clientCode: string
    companyName: string
    contactEmail: string
    contactPhone?: string
  }
  isOpen: boolean
  onClose: () => void
  onUpdate: (workflowId: string, updates: any) => Promise<void>
}

export function NonLtdWorkflowModal({
  workflow,
  client,
  isOpen,
  onClose,
  onUpdate
}: NonLtdWorkflowModalProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [selectedStage, setSelectedStage] = useState<NonLtdAccountsWorkflowStage | ''>('')
  const [notes, setNotes] = useState('')
  const [workflowHistory, setWorkflowHistory] = useState<any[]>([])

  // Get next available stages
  const nextStages = getNextNonLtdStages(workflow.currentStage as NonLtdAccountsWorkflowStage)

  // Load workflow history
  useEffect(() => {
    if (isOpen && workflow.id) {
      loadWorkflowHistory()
    }
  }, [isOpen, workflow.id])

  const loadWorkflowHistory = async () => {
    try {
      const response = await fetch(`/api/clients/non-ltd-deadlines/${workflow.id}/workflow`)
      const data = await response.json()
      
      if (data.success && data.data.workflowHistory) {
        setWorkflowHistory(data.data.workflowHistory)
      }
    } catch (error) {
      console.error('Error loading workflow history:', error)
    }
  }

  const handleStageUpdate = async () => {
    if (!selectedStage) {
      showToast.error('Please select a stage')
      return
    }

    setLoading(true)
    try {
      await onUpdate(workflow.id, {
        currentStage: selectedStage,
        notes: notes.trim() || undefined
      })
      
      // Reset form
      setSelectedStage('')
      setNotes('')
      
      // Reload history
      await loadWorkflowHistory()
      
    } catch (error) {
      console.error('Error updating workflow:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    try {
      return format(new Date(dateString), 'dd MMM yyyy HH:mm')
    } catch {
      return 'Invalid date'
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === 'Overdue') return <AlertTriangle className="h-4 w-4 text-destructive" />
    if (status === 'Completed') return <CheckCircle className="h-4 w-4 text-green-600" />
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }

  const getStatusBadgeVariant = (status: string) => {
    if (status === 'Overdue') return 'destructive'
    if (status.includes('Due in')) return 'default'
    if (status === 'Completed') return 'secondary'
    return 'outline'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Non-Ltd Workflow: {client.companyName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Client Code</label>
                  <p className="font-mono">{client.clientCode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                  <p>{client.companyName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Email</label>
                  <p>{client.contactEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contact Phone</label>
                  <p>{client.contactPhone || 'Not provided'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workflow Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Year End</label>
                  <p className="text-sm">{formatDate(workflow.yearEndDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Filing Due</label>
                  <p className="text-sm">{formatDate(workflow.filingDueDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge variant={getStatusBadgeVariant(workflow.status)}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(workflow.status)}
                      <span>{workflow.status}</span>
                    </div>
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Stage</label>
                  <p className="text-sm">{workflow.stageDisplayName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestone Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Milestone Timeline</CardTitle>
              <CardDescription>Key dates and progress tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-muted-foreground">Chase Started</label>
                    <p>{formatDate(workflow.chaseStartedDate)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Paperwork Received</label>
                    <p>{formatDate(workflow.paperworkReceivedDate)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Work Started</label>
                    <p>{formatDate(workflow.workStartedDate)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Manager Discussion</label>
                    <p>{formatDate(workflow.managerDiscussionDate)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Partner Review</label>
                    <p>{formatDate(workflow.partnerReviewDate)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Review Completed</label>
                    <p>{formatDate(workflow.reviewCompletedDate)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Sent to Client</label>
                    <p>{formatDate(workflow.sentToClientDate)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Client Approved</label>
                    <p>{formatDate(workflow.clientApprovedDate)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Partner Approved</label>
                    <p>{formatDate(workflow.partnerApprovedDate)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-muted-foreground">Filed to HMRC</label>
                    <p>{formatDate(workflow.filedToHMRCDate)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stage Update */}
          {session?.user.role === 'MANAGER' || session?.user.role === 'PARTNER' ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Update Workflow Stage</CardTitle>
                <CardDescription>Move workflow to next stage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Next Stage</label>
                  <Select value={selectedStage} onValueChange={(value) => setSelectedStage(value as NonLtdAccountsWorkflowStage)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select next stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {nextStages.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {getNonLtdStageDisplayName(stage)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Notes (Optional)</label>
                  <Textarea
                    placeholder="Add notes about this stage change..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={handleStageUpdate}
                  disabled={loading || !selectedStage}
                  className="w-full"
                >
                  {loading ? 'Updating...' : 'Update Stage'}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* Workflow History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workflow History</CardTitle>
              <CardDescription>Recent stage changes and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workflowHistory.map((entry, index) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{entry.userName}</span>
                        <Badge variant="outline" className="text-xs">
                          {entry.userRole}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(entry.stageChangedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {entry.fromStage && (
                          <>
                            <span className="text-sm text-muted-foreground">
                              {getNonLtdStageDisplayName(entry.fromStage)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </>
                        )}
                        <span className="text-sm font-medium">
                          {getNonLtdStageDisplayName(entry.toStage)}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground">{entry.notes}</p>
                      )}
                      {entry.daysInPreviousStage && (
                        <p className="text-xs text-muted-foreground">
                          Spent {entry.daysInPreviousStage} days in previous stage
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {workflowHistory.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No workflow history available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 