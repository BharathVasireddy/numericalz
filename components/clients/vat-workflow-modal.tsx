'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Target, 
  Mail, 
  CheckCircle, 
  Loader2,
  ChevronRight,
  History,
  Save,
  ArrowRight,
  Building2,
  AlertCircle
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { VAT_WORKFLOW_STAGE_NAMES, SELECTABLE_VAT_WORKFLOW_STAGES, calculateTotalFilingDays, calculateStageDurations, getVATWorkflowProgressSummary } from '@/lib/vat-workflow'

interface VATWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedQuarter: any) => void
  vatQuarter: {
    id: string
    quarterPeriod: string
    quarterStartDate: string
    quarterEndDate: string
    filingDueDate: string
    currentStage: string
    isCompleted: boolean
    assignedUser?: {
      id: string
      name: string
      email: string
    }
    client: {
      id: string
      companyName: string
      vatQuarterGroup: string
      assignedUser?: {
        id: string
        name: string
        email: string
      }
      vatAssignedUser?: {
        id: string
        name: string
        email: string
      }
    }
    // Milestone dates
    chaseStartedDate?: string
    chaseStartedByUserName?: string
    paperworkReceivedDate?: string
    paperworkReceivedByUserName?: string
    workStartedDate?: string
    workStartedByUserName?: string
    workFinishedDate?: string
    workFinishedByUserName?: string
    sentToClientDate?: string
    sentToClientByUserName?: string
    clientApprovedDate?: string
    clientApprovedByUserName?: string
    filedToHMRCDate?: string
    filedToHMRCByUserName?: string
    workflowHistory?: Array<{
      id: string
      fromStage?: string
      toStage: string
      stageChangedAt: string
      daysInPreviousStage?: number
      userName: string
      userEmail: string
      userRole: string
      notes?: string
    }>
  }
  availableUsers: Array<{
    id: string
    name: string
    email: string
    role: string
  }>
}

export function VATWorkflowModal({ 
  isOpen, 
  onClose, 
  onUpdate, 
  vatQuarter, 
  availableUsers 
}: VATWorkflowModalProps) {
  const { data: session } = useSession()
  const [selectedStage, setSelectedStage] = useState(vatQuarter.currentStage)
  const [selectedAssignee, setSelectedAssignee] = useState(vatQuarter.assignedUser?.id || '')
  const [comments, setComments] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showClientSelfFilingConfirm, setShowClientSelfFilingConfirm] = useState(false)
  const [showFilingConfirm, setShowFilingConfirm] = useState(false)

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setSelectedStage(vatQuarter.currentStage)
      setSelectedAssignee(vatQuarter.assignedUser?.id || '')
      setComments('')
      setShowHistory(false)
      setShowClientSelfFilingConfirm(false)
      setShowFilingConfirm(false)
    }
  }, [isOpen, vatQuarter])

  // Format quarter period for display
  const formatQuarterPeriod = (quarterPeriod: string) => {
    const parts = quarterPeriod.split('_to_')
    if (parts.length !== 2) return quarterPeriod
    
    const [startDate, endDate] = parts
    if (!startDate || !endDate) return quarterPeriod
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    const startMonth = start.toLocaleDateString('en-GB', { month: 'short' })
    const startYear = start.getFullYear()
    const endMonth = end.toLocaleDateString('en-GB', { month: 'short' })
    const endYear = end.getFullYear()
    
    if (startYear === endYear) {
      return `${startMonth} - ${endMonth} ${endYear}`
    } else {
      return `${startMonth} ${startYear} - ${endMonth} ${endYear}`
    }
  }

  // Get stage icon and color
  const getStageInfo = (stage: string) => {
    const stageMap: { [key: string]: { icon: React.ReactNode; color: string } } = {
      'PAPERWORK_PENDING_CHASE': { icon: <AlertCircle className="h-4 w-4" />, color: 'text-amber-600' },
      'PAPERWORK_CHASED': { icon: <AlertCircle className="h-4 w-4" />, color: 'text-yellow-600' },
      'PAPERWORK_RECEIVED': { icon: <CheckCircle className="h-4 w-4" />, color: 'text-blue-600' },
      'WORK_IN_PROGRESS': { icon: <TrendingUp className="h-4 w-4" />, color: 'text-blue-600' },
      'QUERIES_PENDING': { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-amber-600' },
      'REVIEW_PENDING_MANAGER': { icon: <Users className="h-4 w-4" />, color: 'text-purple-600' },
      'REVIEW_PENDING_PARTNER': { icon: <Target className="h-4 w-4" />, color: 'text-indigo-600' },
      'EMAILED_TO_PARTNER': { icon: <Mail className="h-4 w-4" />, color: 'text-indigo-600' },
      'EMAILED_TO_CLIENT': { icon: <Mail className="h-4 w-4" />, color: 'text-orange-600' },
      'CLIENT_APPROVED': { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
      'FILED_TO_HMRC': { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' }
    }
    
    return stageMap[stage] || { icon: <Clock className="h-4 w-4" />, color: 'text-gray-600' }
  }

  // Calculate days until deadlines
  const calculateDaysUntil = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysUntilQuarterEnd = calculateDaysUntil(vatQuarter.quarterEndDate)
  const daysUntilFiling = calculateDaysUntil(vatQuarter.filingDueDate)

  // Handle workflow update
  const handleUpdateWorkflow = async () => {
    if (!session?.user) {
      showToast.error('Please log in to update workflow')
      return
    }

    // Check if updating to FILED_TO_HMRC - show confirmation popup
    if (selectedStage === 'FILED_TO_HMRC' && vatQuarter.currentStage !== 'FILED_TO_HMRC') {
      setShowFilingConfirm(true)
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/vat-quarters/${vatQuarter.id}/workflow`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: selectedStage,
          assignedUserId: selectedAssignee || null,
          comments: comments.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success(data.message || 'Workflow updated successfully')
        onUpdate(data.data.vatQuarter)
        onClose()
      } else {
        showToast.error(data.error || 'Failed to update workflow')
      }
    } catch (error) {
      console.error('Error updating workflow:', error)
      showToast.error('Failed to update workflow')
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle filing confirmation
  const handleFilingConfirm = async () => {
    if (!session?.user) {
      showToast.error('Please log in to update workflow')
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/vat-quarters/${vatQuarter.id}/workflow`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: 'FILED_TO_HMRC',
          assignedUserId: selectedAssignee || null,
          comments: comments.trim() || 'Quarter filing completed',
          completeFiling: true, // Special flag for filing completion
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Quarter filing completed successfully!')
        onUpdate(data.data.vatQuarter)
        onClose()
      } else {
        showToast.error(data.error || 'Failed to complete filing')
      }
    } catch (error) {
      console.error('Error completing filing:', error)
      showToast.error('Failed to complete filing')
    } finally {
      setIsUpdating(false)
      setShowFilingConfirm(false)
    }
  }

  // Handle client self-filing - now sets FILED_TO_HMRC as completed
  const handleClientSelfFiling = async () => {
    if (!session?.user) {
      showToast.error('Please log in to update workflow')
      return
    }

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/vat-quarters/${vatQuarter.id}/client-self-filing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comments: 'Client handling their own VAT filing',
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Quarter marked as client self-filing')
        onUpdate(data.data.vatQuarter)
        onClose()
      } else {
        showToast.error(data.error || 'Failed to update workflow')
      }
    } catch (error) {
      console.error('Error updating workflow:', error)
      showToast.error('Failed to update workflow')
    } finally {
      setIsUpdating(false)
      setShowClientSelfFilingConfirm(false)
    }
  }

  // Check if changes were made
  const hasChanges = selectedStage !== vatQuarter.currentStage || 
                    selectedAssignee !== (vatQuarter.assignedUser?.id || '') ||
                    comments.trim() !== ''

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            VAT Workflow Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quarter Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {vatQuarter.client.companyName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quarter Period</Label>
                  <p className="font-medium">{formatQuarterPeriod(vatQuarter.quarterPeriod)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quarter Group</Label>
                  <p className="font-medium">{vatQuarter.client.vatQuarterGroup}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quarter Ends</Label>
                  <p className="font-medium">
                    {daysUntilQuarterEnd > 0 ? `${daysUntilQuarterEnd} days` : 'Ended'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Filing Due</Label>
                  <p className={`font-medium ${daysUntilFiling < 0 ? 'text-red-600' : daysUntilFiling < 7 ? 'text-amber-600' : 'text-green-600'}`}>
                    {daysUntilFiling > 0 ? `${daysUntilFiling} days` : `${Math.abs(daysUntilFiling)} days overdue`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Current Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {getStageInfo(vatQuarter.currentStage).icon}
                  <div>
                    <p className="font-medium">{VAT_WORKFLOW_STAGE_NAMES[vatQuarter.currentStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]}</p>
                    {vatQuarter.assignedUser && (
                      <p className="text-sm text-muted-foreground">
                        Workflow assigned to: {vatQuarter.assignedUser.name}
                      </p>
                    )}
                  </div>
                  {vatQuarter.isCompleted && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      Completed
                    </Badge>
                  )}
                </div>
                
                {/* Current Client Assignee */}
                <div className="pt-2 border-t">
                  <Label className="text-sm font-medium text-muted-foreground">Current Client Assignee</Label>
                  <p className="font-medium">
                    {(() => {
                      const currentAssignee = vatQuarter.client.vatAssignedUser || vatQuarter.client.assignedUser
                      return currentAssignee ? currentAssignee.name : 'Unassigned'
                    })()}
                  </p>
                  {(() => {
                    const currentAssignee = vatQuarter.client.vatAssignedUser || vatQuarter.client.assignedUser
                    return currentAssignee && (
                      <p className="text-sm text-muted-foreground">{currentAssignee.email}</p>
                    )
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duration Tracking Summary */}
          {(() => {
            const progressSummary = getVATWorkflowProgressSummary(vatQuarter)
            const stageDurations = calculateStageDurations(vatQuarter, vatQuarter.workflowHistory)
            const totalDays = calculateTotalFilingDays(vatQuarter)

            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Duration Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Total Time */}
                    <div className="text-center p-4 bg-blue-50 rounded-lg border">
                      <div className="text-2xl font-bold text-blue-600">
                        {totalDays !== null ? `${totalDays}` : '—'}
                      </div>
                      <div className="text-sm text-blue-700 font-medium">
                        {vatQuarter.isCompleted ? 'Total Days to Complete' : 'Days in Progress'}
                      </div>
                    </div>

                    {/* Progress Percentage */}
                    <div className="text-center p-4 bg-green-50 rounded-lg border">
                      <div className="text-2xl font-bold text-green-600">
                        {progressSummary.progressPercentage}%
                      </div>
                      <div className="text-sm text-green-700 font-medium">
                        Workflow Progress
                      </div>
                    </div>

                    {/* Current Stage Time */}
                    <div className="text-center p-4 bg-amber-50 rounded-lg border">
                      <div className="text-2xl font-bold text-amber-600">
                        {vatQuarter.workflowHistory?.[0]?.daysInPreviousStage !== undefined 
                          ? vatQuarter.workflowHistory[0].daysInPreviousStage 
                          : '—'}
                      </div>
                      <div className="text-sm text-amber-700 font-medium">
                        Days in Current Stage
                      </div>
                    </div>
                  </div>

                  {/* Stage Duration Breakdown */}
                  {vatQuarter.workflowHistory && vatQuarter.workflowHistory.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Stage Duration History
                      </h4>
                      <div className="space-y-2">
                        {vatQuarter.workflowHistory
                          .slice()
                          .reverse()
                          .map((entry, index) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              <div>
                                <p className="font-medium text-sm">
                                  {VAT_WORKFLOW_STAGE_NAMES[entry.toStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES] || entry.toStage}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(entry.stageChangedAt).toLocaleDateString('en-GB')} by {entry.userName}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">
                                {entry.daysInPreviousStage !== null && entry.daysInPreviousStage !== undefined
                                  ? `${entry.daysInPreviousStage} days`
                                  : '—'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {index === 0 ? 'Current' : 'Previous stage'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })()}

          {/* Milestone Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Key Milestone Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Chase Started */}
                {vatQuarter.chaseStartedDate && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Chase Started</Label>
                    <p className="font-medium">{new Date(vatQuarter.chaseStartedDate).toLocaleDateString('en-GB')}</p>
                    {vatQuarter.chaseStartedByUserName && (
                      <p className="text-xs text-muted-foreground">by {vatQuarter.chaseStartedByUserName}</p>
                    )}
                  </div>
                )}

                {/* Paperwork Received */}
                {vatQuarter.paperworkReceivedDate && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Paperwork Received</Label>
                    <p className="font-medium">{new Date(vatQuarter.paperworkReceivedDate).toLocaleDateString('en-GB')}</p>
                    {vatQuarter.paperworkReceivedByUserName && (
                      <p className="text-xs text-muted-foreground">by {vatQuarter.paperworkReceivedByUserName}</p>
                    )}
                  </div>
                )}

                {/* Work in progress */}
                {vatQuarter.workStartedDate && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Work in progress</Label>
                    <p className="font-medium">{new Date(vatQuarter.workStartedDate).toLocaleDateString('en-GB')}</p>
                    {vatQuarter.workStartedByUserName && (
                      <p className="text-xs text-muted-foreground">by {vatQuarter.workStartedByUserName}</p>
                    )}
                  </div>
                )}

                {/* Work Finished */}
                {vatQuarter.workFinishedDate && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Work Finished</Label>
                    <p className="font-medium">{new Date(vatQuarter.workFinishedDate).toLocaleDateString('en-GB')}</p>
                    {vatQuarter.workFinishedByUserName && (
                      <p className="text-xs text-muted-foreground">by {vatQuarter.workFinishedByUserName}</p>
                    )}
                  </div>
                )}

                {/* Sent to Client */}
                {vatQuarter.sentToClientDate && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Sent to Client</Label>
                    <p className="font-medium">{new Date(vatQuarter.sentToClientDate).toLocaleDateString('en-GB')}</p>
                    {vatQuarter.sentToClientByUserName && (
                      <p className="text-xs text-muted-foreground">by {vatQuarter.sentToClientByUserName}</p>
                    )}
                  </div>
                )}

                {/* Client Approved */}
                {vatQuarter.clientApprovedDate && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Client Approved</Label>
                    <p className="font-medium">{new Date(vatQuarter.clientApprovedDate).toLocaleDateString('en-GB')}</p>
                    {vatQuarter.clientApprovedByUserName && (
                      <p className="text-xs text-muted-foreground">by {vatQuarter.clientApprovedByUserName}</p>
                    )}
                  </div>
                )}

                {/* Filed to HMRC */}
                {vatQuarter.filedToHMRCDate && (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">Filed to HMRC</Label>
                    <p className="font-medium">{new Date(vatQuarter.filedToHMRCDate).toLocaleDateString('en-GB')}</p>
                    {vatQuarter.filedToHMRCByUserName && (
                      <p className="text-xs text-muted-foreground">by {vatQuarter.filedToHMRCByUserName}</p>
                    )}
                  </div>
                )}
              </div>
              
                {/* Show message if no milestones yet */}
                {!vatQuarter.chaseStartedDate && !vatQuarter.paperworkReceivedDate && !vatQuarter.workStartedDate && !vatQuarter.filedToHMRCDate && (
                  <div className="text-center py-4 text-muted-foreground col-span-full">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No milestone dates recorded yet</p>
                    <p className="text-sm">Dates will appear as workflow progresses</p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Workflow Update Form */}
          {!vatQuarter.isCompleted && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Update Workflow
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Stage Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="stage">Workflow Stage</Label>
                    <Select value={selectedStage} onValueChange={setSelectedStage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SELECTABLE_VAT_WORKFLOW_STAGES).map(([key, label]) => {
                          const isCurrentStage = key === vatQuarter.currentStage
                          const isCompletedStage = vatQuarter.isCompleted && key === 'FILED_TO_HMRC'
                          
                          // Determine if stage is "completed" based on workflow progression
                          const stageOrder = Object.keys(VAT_WORKFLOW_STAGE_NAMES)
                          const currentStageIndex = stageOrder.indexOf(vatQuarter.currentStage)
                          const thisStageIndex = stageOrder.indexOf(key)
                          const isPastStage = currentStageIndex > thisStageIndex
                          
                          return (
                            <SelectItem 
                              key={key} 
                              value={key}
                              className={`
                                ${isCurrentStage ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
                                ${isPastStage || isCompletedStage ? 'opacity-60 text-muted-foreground' : ''}
                              `}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className={`${getStageInfo(key).color}`}>
                                  {getStageInfo(key).icon}
                                </div>
                                <span className={`${isCurrentStage ? 'font-semibold text-blue-700' : ''}`}>
                                  {label}
                                </span>
                                {isCurrentStage && (
                                  <Badge variant="secondary" className="ml-auto text-xs bg-blue-100 text-blue-700">
                                    Current
                                  </Badge>
                                )}
                                {(isPastStage || isCompletedStage) && !isCurrentStage && (
                                  <Badge variant="outline" className="ml-auto text-xs text-muted-foreground border-muted-foreground/30">
                                    Completed
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assignee Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assigned To</Label>
                    <Select value={selectedAssignee || 'unassigned'} onValueChange={(value) => setSelectedAssignee(value === 'unassigned' ? '' : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>Unassigned</span>
                          </div>
                        </SelectItem>
                        {session?.user?.id && (
                          <SelectItem value={session.user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-blue-600">Assign to Me</span>
                              <span className="text-xs text-blue-500">({session.user.role})</span>
                            </div>
                          </SelectItem>
                        )}
                        {availableUsers
                          .filter(user => user.id !== session?.user?.id)
                          .map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-600" />
                              <span>{user.name}</span>
                              <span className="text-xs text-muted-foreground">({user.role})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-2">
                  <Label htmlFor="comments">Comments (Optional)</Label>
                  <Textarea
                    id="comments"
                    placeholder="Add any comments about this workflow update..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Client Self-Filing Section */}
                <div className="pt-4 border-t">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <Label className="text-sm font-medium">Alternative Action</Label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowClientSelfFilingConfirm(true)}
                      className="w-full flex items-center gap-2 text-gray-700 hover:text-gray-900"
                      disabled={isUpdating}
                    >
                      <FileText className="h-4 w-4" />
                      Client to do bookkeeping
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Use this if the client will handle their own VAT filing for this quarter
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client Self-Filing Confirmation Dialog */}
          <Dialog open={showClientSelfFilingConfirm} onOpenChange={setShowClientSelfFilingConfirm}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Confirm Client Self-Filing
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to mark this quarter as "Client to do bookkeeping"?
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">Important:</p>
                      <p>Once confirmed, this quarter filing will be marked as completed and cannot be edited.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowClientSelfFilingConfirm(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleClientSelfFiling}
                  disabled={isUpdating}
                  className="flex items-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Filing Completion Confirmation Dialog */}
          <Dialog open={showFilingConfirm} onOpenChange={setShowFilingConfirm}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Complete Quarter Filing
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to complete the filing for this VAT quarter?
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-800">
                      <p className="font-medium">This will:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Mark the quarter as filed to HMRC</li>
                        <li>Set the completion status to completed</li>
                        <li>Record the filing date and user</li>
                        <li>Prevent further workflow changes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFilingConfirm(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFilingConfirm}
                  disabled={isUpdating}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Complete Filing
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Workflow History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Workflow History
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? 'Hide' : 'Show'} History
                </Button>
              </CardTitle>
            </CardHeader>
            {showHistory && vatQuarter.workflowHistory && (
              <CardContent>
                <div className="space-y-4">
                  {vatQuarter.workflowHistory.map((entry, index) => (
                    <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                      <div className="flex-shrink-0">
                        {getStageInfo(entry.toStage).icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {VAT_WORKFLOW_STAGE_NAMES[entry.toStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]}
                          </span>
                          {entry.fromStage && (
                            <span className="text-sm text-muted-foreground">
                              (from {VAT_WORKFLOW_STAGE_NAMES[entry.fromStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]})
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>{entry.userName} • {new Date(entry.stageChangedAt).toLocaleString('en-GB')}</p>
                          {entry.daysInPreviousStage && (
                            <p>{entry.daysInPreviousStage} days in previous stage</p>
                          )}
                          {entry.notes && (
                            <p className="mt-1 italic">"{entry.notes}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          {!vatQuarter.isCompleted && (
            <Button 
              onClick={handleUpdateWorkflow}
              disabled={!hasChanges || isUpdating}
              className="flex items-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Update Workflow
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 