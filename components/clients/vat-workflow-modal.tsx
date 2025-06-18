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
  Building2
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { VAT_WORKFLOW_STAGE_NAMES } from '@/lib/vat-workflow'

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
    }
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

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setSelectedStage(vatQuarter.currentStage)
      setSelectedAssignee(vatQuarter.assignedUser?.id || '')
      setComments('')
      setShowHistory(false)
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
      'CLIENT_BOOKKEEPING': { icon: <FileText className="h-4 w-4" />, color: 'text-gray-600' },
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
              <div className="flex items-center gap-3">
                {getStageInfo(vatQuarter.currentStage).icon}
                <div>
                  <p className="font-medium">{VAT_WORKFLOW_STAGE_NAMES[vatQuarter.currentStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]}</p>
                  {vatQuarter.assignedUser && (
                    <p className="text-sm text-muted-foreground">
                      Assigned to: {vatQuarter.assignedUser.name}
                    </p>
                  )}
                </div>
                {vatQuarter.isCompleted && (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    Completed
                  </Badge>
                )}
              </div>
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
                        {Object.entries(VAT_WORKFLOW_STAGE_NAMES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              {getStageInfo(key).icon}
                              {label}
                            </div>
                          </SelectItem>
                        ))}
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
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {user.name} ({user.role})
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
              </CardContent>
            </Card>
          )}

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