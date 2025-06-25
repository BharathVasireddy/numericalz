'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, Clock, FileCheck, AlertTriangle, Eye, MessageSquare, CheckCircle2, Loader2, XCircle } from 'lucide-react'

interface ReviewItem {
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
  submittedDate: string
  daysWaiting: number
  priority: 'high' | 'medium' | 'low'
  quarterPeriod?: string
  filingPeriod?: string
}

interface ReviewWidgetProps {
  userRole: 'PARTNER' | 'MANAGER'
  compact?: boolean
}

export function ReviewWidget({ userRole, compact = false }: ReviewWidgetProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processingItems, setProcessingItems] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    vat: 0,
    ltd: 0
  })

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)
  const [reviewComments, setReviewComments] = useState('')
  const [reviewAction, setReviewAction] = useState<'approve' | 'rework' | null>(null)

  console.log(`🔍 ReviewWidget rendering for role: ${userRole}`)

  const fetchReviewData = async () => {
    try {
      setLoading(true)
      console.log(`📡 Fetching review data for role: ${userRole}`)
      const response = await fetch(`/api/notifications/workflow-reviews?role=${userRole}`, {
        cache: 'no-store'
      })
      const result = await response.json()
      
      console.log(`📊 Review API response:`, result)
      
      if (result.success) {
        setReviewItems(result.data.reviewItems)
        setSummary(result.data.summary)
        console.log(`✅ Review data loaded: ${result.data.reviewItems.length} items`)
      } else {
        console.error('❌ Failed to fetch review data:', result.error)
      }
    } catch (error) {
      console.error('❌ Error fetching review data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviewData()
  }, [userRole])

  const handleReviewDone = async (item: ReviewItem, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the item click
    
    if (item.type !== 'ltd' || item.currentStage !== 'REVIEW_BY_PARTNER') {
      toast({
        title: "Cannot complete review",
        description: "Only Ltd company workflows at 'Review by Partner' stage can be marked as done.",
        variant: "destructive"
      })
      return
    }

    // Open the review modal instead of directly updating
    setSelectedItem(item)
    setReviewComments('')
    setReviewAction(null)
    setReviewModalOpen(true)
  }

  const handleReviewSubmit = async () => {
    if (!selectedItem || !reviewAction) {
      toast({
        title: "Missing information",
        description: "Please select an action (Approve or Rework).",
        variant: "destructive"
      })
      return
    }

    if (!reviewComments.trim()) {
      toast({
        title: "Comments required",
        description: "Please add comments for your review decision.",
        variant: "destructive"
      })
      return
    }

    setProcessingItems(prev => new Set(prev).add(selectedItem.id))

    try {
      console.log(`🔄 Processing review for ${selectedItem.clientName} (${selectedItem.clientCode}) - Action: ${reviewAction}`)
      
      const nextStage = reviewAction === 'approve' ? 'REVIEW_DONE_HELLO_SIGN' : 'WORK_IN_PROGRESS'
      const actionText = reviewAction === 'approve' ? 'approved' : 'sent back for rework'
      
      const response = await fetch(`/api/clients/ltd-deadlines/${selectedItem.clientId}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: nextStage,
          comments: `Review ${actionText} by ${userRole.toLowerCase()}: ${reviewComments.trim()}`
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: `Review ${reviewAction === 'approve' ? 'Approved' : 'Sent for Rework'}`,
          description: `${selectedItem.clientName} ${reviewAction === 'approve' ? 'approved - Ready for HelloSign' : 'sent back for rework'}`,
        })
        
        // Close modal and refresh data
        setReviewModalOpen(false)
        setSelectedItem(null)
        setReviewComments('')
        setReviewAction(null)
        await fetchReviewData()
      } else {
        throw new Error(result.error || 'Failed to update workflow')
      }
    } catch (error) {
      console.error('❌ Error processing review:', error)
      toast({
        title: "Error",
        description: "Failed to process review. Please try again.",
        variant: "destructive"
      })
    } finally {
      setProcessingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(selectedItem.id)
        return newSet
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vat':
        return 'VAT Return'
      case 'ltd':
        return 'Annual Accounts'
      default:
        return type.toUpperCase()
    }
  }

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'DISCUSS_WITH_MANAGER':
        return <MessageSquare className="h-3 w-3" />
      case 'REVIEW_BY_PARTNER':
        return <Eye className="h-3 w-3" />
      default:
        return <FileCheck className="h-3 w-3" />
    }
  }

  const handleItemClick = (item: ReviewItem) => {
    if (item.type === 'vat') {
      router.push(`/dashboard/clients/vat-dt?client=${item.clientId}`)
    } else {
      router.push(`/dashboard/clients/ltd-companies?client=${item.clientId}`)
    }
  }

  const handleViewAll = () => {
    if (userRole === 'PARTNER') {
      router.push('/dashboard/partner?tab=reviews')
    } else {
      router.push('/dashboard/manager?tab=reviews')
    }
  }

  const canMarkReviewDone = (item: ReviewItem) => {
    return userRole === 'PARTNER' && item.type === 'ltd' && item.currentStage === 'REVIEW_BY_PARTNER'
  }

  const displayItems = compact ? reviewItems.slice(0, 3) : reviewItems.slice(0, 5)

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            {userRole === 'PARTNER' ? 'Partner Reviews' : 'Manager Reviews'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading reviews...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {userRole === 'PARTNER' ? 'Partner Reviews' : 'Manager Reviews'}
            </CardTitle>
            <div className="flex items-center gap-2">
              {summary.high > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {summary.high} urgent
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                VAT: {summary.vat} | Accounts: {summary.ltd}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reviewItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No items pending review</p>
              <p className="text-xs text-muted-foreground mt-1">All workflows are up to date</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {displayItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => handleItemClick(item)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">{item.clientName}</p>
                          <span className="text-xs text-muted-foreground">({item.clientCode})</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(item.type)}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {getStageIcon(item.currentStage)}
                            <span>{item.stageLabel}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          by {item.assignedUser.name}
                          {item.quarterPeriod && ` • ${item.quarterPeriod}`}
                          {item.filingPeriod && ` • ${item.filingPeriod}`}
                        </div>
                      </button>
                      
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {item.daysWaiting}d
                          </div>
                        </div>
                        
                        {canMarkReviewDone(item) && (
                          <Button
                            size="sm"
                            onClick={(e) => handleReviewDone(item, e)}
                            disabled={processingItems.has(item.id)}
                            className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                          >
                            {processingItems.has(item.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            {processingItems.has(item.id) ? 'Processing...' : 'Review Done'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {reviewItems.length > displayItems.length && (
                <div className="mt-4 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full text-xs"
                    onClick={handleViewAll}
                  >
                    View all {reviewItems.length} items
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Review Decision Modal */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Review Decision
            </DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-medium text-sm">{selectedItem.clientName}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedItem.clientCode} • {getTypeLabel(selectedItem.type)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-comments">Review Comments *</Label>
                <Textarea
                  id="review-comments"
                  placeholder="Add your review comments here..."
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              <div className="space-y-3">
                <Label>Review Decision *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={reviewAction === 'approve' ? 'default' : 'outline'}
                    onClick={() => setReviewAction('approve')}
                    className="flex flex-col items-center justify-center h-16 p-2"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Approve</span>
                    </div>
                    <span className="text-xs text-center leading-tight opacity-75">
                      Ready for HelloSign
                    </span>
                  </Button>
                  
                  <Button
                    variant={reviewAction === 'rework' ? 'default' : 'outline'}
                    onClick={() => setReviewAction('rework')}
                    className="flex flex-col items-center justify-center h-16 p-2"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <XCircle className="h-4 w-4" />
                      <span className="font-medium">Rework</span>
                    </div>
                    <span className="text-xs text-center leading-tight opacity-75">
                      Back to Work in Progress
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReviewModalOpen(false)
                setSelectedItem(null)
                setReviewComments('')
                setReviewAction(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReviewSubmit}
              disabled={!reviewAction || !reviewComments.trim() || (selectedItem && processingItems.has(selectedItem.id))}
            >
              {selectedItem && processingItems.has(selectedItem.id) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 