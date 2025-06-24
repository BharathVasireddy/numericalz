'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { 
  FileCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  MessageSquare,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Building,
  Crown,
  Shield,
  User,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface WorkflowReviewItem {
  id: string
  type: 'vat' | 'ltd'
  clientId: string
  clientName: string
  clientCode: string
  workflowId: string
  currentStage: string
  stageLabel: string
  assignedUser: {
    id: string
    name: string
    role: string
  }
  submittedDate: Date | string
  daysWaiting: number
  priority: 'high' | 'medium' | 'low'
  quarterPeriod?: string
  filingPeriod?: string
}

interface WorkflowReviewNotificationWidgetProps {
  items: WorkflowReviewItem[]
  userRole: 'PARTNER' | 'MANAGER'
  onReviewComplete?: () => void
}

export function WorkflowReviewNotificationWidget({ 
  items, 
  userRole,
  onReviewComplete
}: WorkflowReviewNotificationWidgetProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [processing, setProcessing] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [selectedItem, setSelectedItem] = useState<WorkflowReviewItem | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'rework' | null>(null)
  const [comments, setComments] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  
  // Filter items based on user role
  const filteredItems = items.filter(item => {
    if (userRole === 'MANAGER') {
      return item.currentStage === 'REVIEW_PENDING_MANAGER' || 
             item.currentStage === 'DISCUSS_WITH_MANAGER'
    }
    if (userRole === 'PARTNER') {
      return item.currentStage === 'REVIEW_PENDING_PARTNER' || 
             item.currentStage === 'REVIEW_BY_PARTNER' ||
             item.currentStage === 'EMAILED_TO_PARTNER'
    }
    return false
  })

  // Show only first 5 items by default, expand to show all
  const displayItems = expanded ? filteredItems : filteredItems.slice(0, 5)
  const hasMore = filteredItems.length > 5

  if (filteredItems.length === 0) {
    return null
  }

  const getWorkflowIcon = (type: string) => {
    return type === 'vat' 
      ? <FileCheck className="h-3 w-3 text-blue-500" />
      : <Building className="h-3 w-3 text-green-500" />
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PARTNER': return <Crown className="h-3 w-3 text-purple-500" />
      case 'MANAGER': return <Shield className="h-3 w-3 text-blue-500" />
      default: return <User className="h-3 w-3 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string, daysWaiting: number) => {
    if (daysWaiting > 3 || priority === 'high') return 'bg-red-50 border-red-200'
    if (daysWaiting > 1 || priority === 'medium') return 'bg-amber-50 border-amber-200'
    return 'bg-blue-50 border-blue-200'
  }

  const handleViewWorkflow = (item: WorkflowReviewItem) => {
    const baseUrl = item.type === 'vat' 
      ? '/dashboard/clients/vat-dt'
      : '/dashboard/clients/ltd-companies'
    
    // Navigate with client focus parameter
    router.push(`${baseUrl}?focus=${item.clientId}&workflow=${item.workflowId}`)
  }

  const openReviewDialog = (item: WorkflowReviewItem, action: 'approve' | 'rework') => {
    setSelectedItem(item)
    setReviewAction(action)
    setComments('')
    setDialogOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedItem || !reviewAction) return

    setProcessing(selectedItem.id)

    try {
      const nextStage = reviewAction === 'approve' 
        ? getNextStage(selectedItem.currentStage, selectedItem.type)
        : getPreviousStage(selectedItem.currentStage, selectedItem.type)

      const endpoint = selectedItem.type === 'vat' 
        ? `/api/vat-quarters/${selectedItem.workflowId}/workflow`
        : `/api/clients/ltd-deadlines/${selectedItem.clientId}/workflow`

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: nextStage,
          comments: comments || (reviewAction === 'approve' 
            ? `Reviewed and approved by ${userRole.toLowerCase()}`
            : `Sent back for rework by ${userRole.toLowerCase()}`)
        })
      })

      const data = await response.json()

      if (data.success) {
        // Send notification to assigned user
        await fetch('/api/notifications/workflow-review-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: selectedItem.clientId,
            clientName: selectedItem.clientName,
            clientCode: selectedItem.clientCode,
            workflowType: selectedItem.type,
            reviewedBy: userRole,
            nextStage,
            assignedUserId: selectedItem.assignedUser.id,
            action: reviewAction,
            comments
          })
        })

        toast({
          title: reviewAction === 'approve' ? "Review Approved" : "Sent for Rework",
          description: `${selectedItem.clientName} - ${reviewAction === 'approve' ? 'Approved to proceed' : 'Sent back for corrections'}`,
        })
        
        setDialogOpen(false)
        onReviewComplete?.()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process review. Please try again.",
        variant: "destructive"
      })
    } finally {
      setProcessing(null)
    }
  }

  const getNextStage = (currentStage: string, type: string) => {
    if (type === 'vat') {
      switch (currentStage) {
        case 'REVIEW_PENDING_MANAGER': return 'REVIEWED_BY_MANAGER'
        case 'REVIEW_PENDING_PARTNER': return 'REVIEWED_BY_PARTNER'
        case 'EMAILED_TO_PARTNER': return 'REVIEWED_BY_PARTNER'
        default: return null
      }
    } else {
      switch (currentStage) {
        case 'DISCUSS_WITH_MANAGER': return 'REVIEWED_BY_MANAGER'
        case 'REVIEW_BY_PARTNER': return 'REVIEWED_BY_PARTNER'
        default: return null
      }
    }
  }

  const getPreviousStage = (currentStage: string, type: string) => {
    // Send back to work stage for rework
    if (type === 'vat') {
      return 'WORK_IN_PROGRESS'
    } else {
      return 'WORK_IN_PROGRESS'
    }
  }

  return (
    <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-orange-900">
            🔔 {userRole === 'MANAGER' ? 'Manager' : 'Partner'} Reviews
            <Badge className="ml-2 bg-orange-100 text-orange-800 border-orange-200">
              {filteredItems.length}
            </Badge>
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          {displayItems.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border ${getPriorityColor(item.priority, item.daysWaiting)} transition-colors`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getWorkflowIcon(item.type)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {item.clientCode} - {item.clientName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {item.type.toUpperCase()}
                      </Badge>
                      {item.daysWaiting > 2 && (
                        <Badge className="bg-red-100 text-red-700 text-xs">
                          {item.daysWaiting}d waiting
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleIcon(item.assignedUser.role)}
                      <span className="text-xs text-muted-foreground truncate">
                        {item.assignedUser.name}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewWorkflow(item)}
                    className="h-7 px-2 text-xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openReviewDialog(item, 'approve')}
                    disabled={processing === item.id}
                    className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-200"
                  >
                    {processing === item.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openReviewDialog(item, 'rework')}
                    disabled={processing === item.id}
                    className="h-7 px-2 text-xs bg-amber-50 hover:bg-amber-100 border-amber-200"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 text-xs"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show {filteredItems.length - 5} More
              </>
            )}
          </Button>
        )}

        {/* Review Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {reviewAction === 'approve' ? 'Approve Review' : 'Request Rework'}
              </DialogTitle>
            </DialogHeader>
            
            {selectedItem && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-sm">
                    {selectedItem.clientCode} - {selectedItem.clientName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedItem.type.toUpperCase()} • Assigned to {selectedItem.assignedUser.name}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="comments" className="text-sm font-medium">
                    {reviewAction === 'approve' ? 'Review Comments (Optional)' : 'Rework Instructions (Required)'}
                  </Label>
                  <Textarea
                    id="comments"
                    placeholder={reviewAction === 'approve' 
                      ? "Add any comments about the review..."
                      : "Explain what needs to be corrected or improved..."
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={processing === selectedItem.id}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={
                      processing === selectedItem.id || 
                      (reviewAction === 'rework' && !comments.trim())
                    }
                    className={reviewAction === 'approve' 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-amber-600 hover:bg-amber-700"
                    }
                  >
                    {processing === selectedItem.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : reviewAction === 'approve' ? (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" />
                    )}
                    {reviewAction === 'approve' ? 'Approve' : 'Send for Rework'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
} 