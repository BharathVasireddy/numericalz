'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { 
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Building,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  User,
  Phone,
  Send,
  UserCheck,
  RefreshCw
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { 
  NON_LTD_WORKFLOW_STAGE_NAMES, 
  formatNonLtdPeriod, 
  formatNonLtdPeriodForDisplay,
  calculateNonLtdFilingDays,
  getNonLtdWorkflowProgress,
  getNonLtdWorkflowStageColor
} from '@/lib/non-ltd-workflow-utils-client'
import type { NonLtdAccountsWorkflowStage } from '@prisma/client'

interface NonLtdWorkflow {
  id: string
  yearEndDate: string
  accountsDueDate: string
  ctDueDate: string
  csDueDate: string
  currentStage: string
  isCompleted: boolean
  assignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  createdAt: string
  updatedAt: string
  
  // Milestone dates
  chaseStartedDate?: string
  chaseStartedByUserName?: string
  paperworkReceivedDate?: string
  paperworkReceivedByUserName?: string
  workStartedDate?: string
  workStartedByUserName?: string
  managerDiscussionDate?: string
  managerDiscussionByUserName?: string
  partnerReviewDate?: string
  partnerReviewByUserName?: string
  reviewCompletedDate?: string
  reviewCompletedByUserName?: string
  sentToClientDate?: string
  sentToClientByUserName?: string
  clientApprovedDate?: string
  clientApprovedByUserName?: string
  partnerApprovedDate?: string
  partnerApprovedByUserName?: string
  filedDate?: string
  filedByUserName?: string
  filedToHMRCDate?: string
  filedToHMRCByUserName?: string
  clientSelfFilingDate?: string
  clientSelfFilingByUserName?: string
  
  // Workflow history
  workflowHistory?: {
    id: string
    fromStage?: string
    toStage: string
    stageChangedAt: string
    daysInPreviousStage?: number
    userName: string
    userEmail: string
    userRole: string
    notes?: string
    user: {
      id: string
      name: string
      email: string
      role: string
    }
  }[]
}

interface NonLtdFilingHistoryProps {
  clientId: string
  clientCode: string
  companyName: string
  companyType: string
  yearEndDate: string
  accountsFilingDeadline: string
  confirmationStatementDeadline: string
  corporationTaxDue: string
}

export function NonLtdFilingHistory({
  clientId,
  clientCode,
  companyName,
  companyType,
  yearEndDate,
  accountsFilingDeadline,
  confirmationStatementDeadline,
  corporationTaxDue
}: NonLtdFilingHistoryProps) {
  const [loading, setLoading] = useState(true)
  const [nonLtdWorkflows, setNonLtdWorkflows] = useState<NonLtdWorkflow[]>([])
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState({
    totalWorkflows: 0,
    completedWorkflows: 0,
    activeWorkflows: 0
  })

  useEffect(() => {
    fetchNonLtdFilingHistory()
  }, [clientId])

  const fetchNonLtdFilingHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}/non-ltd-filing-history`)
      const data = await response.json()

      if (data.success) {
        setNonLtdWorkflows(data.data.nonLtdWorkflows || [])
        setSummary({
          totalWorkflows: data.data.totalWorkflows || 0,
          completedWorkflows: data.data.completedWorkflows || 0,
          activeWorkflows: data.data.activeWorkflows || 0
        })
      } else {
        showToast.error('Failed to fetch non-Ltd filing history')
      }
    } catch (error) {
      console.error('Error fetching non-Ltd filing history:', error)
      showToast.error('Failed to fetch non-Ltd filing history')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '-'
    }
  }

  const getStatusBadge = (workflow: NonLtdWorkflow) => {
    const today = new Date()
    const filingDueDate = new Date(workflow.accountsDueDate)

    if (workflow.isCompleted) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    }

    if (today > filingDueDate) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
    }

    const daysUntilDue = Math.ceil((filingDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilDue <= 30) {
      return <Badge className="bg-amber-100 text-amber-800">Due Soon</Badge>
    }

    return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
  }

  const getStageBadge = (stage: string) => {
    const stageName = NON_LTD_WORKFLOW_STAGE_NAMES[stage as NonLtdAccountsWorkflowStage] || stage
    const color = getNonLtdWorkflowStageColor(stage as NonLtdAccountsWorkflowStage)
    return <Badge className={color}>{stageName}</Badge>
  }

  const toggleWorkflowExpansion = (workflowId: string) => {
    const newExpanded = new Set(expandedWorkflows)
    if (newExpanded.has(workflowId)) {
      newExpanded.delete(workflowId)
    } else {
      newExpanded.add(workflowId)
    }
    setExpandedWorkflows(newExpanded)
  }

  const renderMilestones = (workflow: NonLtdWorkflow) => {
    const milestones = [
      { label: 'Chase Started', date: workflow.chaseStartedDate, user: workflow.chaseStartedByUserName },
      { label: 'Paperwork Received', date: workflow.paperworkReceivedDate, user: workflow.paperworkReceivedByUserName },
      { label: 'Work Started', date: workflow.workStartedDate, user: workflow.workStartedByUserName },
      { label: 'Manager Discussion', date: workflow.managerDiscussionDate, user: workflow.managerDiscussionByUserName },
      { label: 'Partner Review', date: workflow.partnerReviewDate, user: workflow.partnerReviewByUserName },
      { label: 'Review Completed', date: workflow.reviewCompletedDate, user: workflow.reviewCompletedByUserName },
      { label: 'Sent to Client', date: workflow.sentToClientDate, user: workflow.sentToClientByUserName },
      { label: 'Client Approved', date: workflow.clientApprovedDate, user: workflow.clientApprovedByUserName },
      { label: 'Partner Approved', date: workflow.partnerApprovedDate, user: workflow.partnerApprovedByUserName },
      { label: 'Filed', date: workflow.filedDate, user: workflow.filedByUserName },
      { label: 'Filed to HMRC', date: workflow.filedToHMRCDate, user: workflow.filedToHMRCByUserName },
      { label: 'Client Self-Filing', date: workflow.clientSelfFilingDate, user: workflow.clientSelfFilingByUserName }
    ]

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Milestone Timeline</h4>
        <div className="space-y-2">
          {milestones.map((milestone, index) => (
            milestone.date && (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span className="font-medium">{milestone.label}</span>
                  <span className="text-muted-foreground">by {milestone.user || 'Unknown'}</span>
                </div>
                <span className="text-muted-foreground flex-shrink-0">
                  {formatDateTime(milestone.date)}
                </span>
              </div>
            )
          ))}
        </div>
      </div>
    )
  }

  const renderWorkflowHistory = (workflow: NonLtdWorkflow) => {
    if (!workflow.workflowHistory || workflow.workflowHistory.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          No workflow history available
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-muted-foreground">Workflow History</h4>
        <div className="space-y-2">
          {workflow.workflowHistory.map((history, index) => (
            <div key={history.id} className="border-l-2 border-muted pl-4 py-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {history.fromStage ? `${NON_LTD_WORKFLOW_STAGE_NAMES[history.fromStage as NonLtdAccountsWorkflowStage] || history.fromStage} → ` : ''}
                      {NON_LTD_WORKFLOW_STAGE_NAMES[history.toStage as NonLtdAccountsWorkflowStage] || history.toStage}
                    </span>
                    {history.daysInPreviousStage && (
                      <Badge variant="outline" className="text-xs">
                        {history.daysInPreviousStage} days
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    by {history.userName} ({history.userRole})
                  </div>
                  {history.notes && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {history.notes}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDateTime(history.stageChangedAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getNextDeadlines = () => {
    const today = new Date()
    const yearEnd = yearEndDate ? new Date(yearEndDate) : null
    const accountsDue = accountsFilingDeadline ? new Date(accountsFilingDeadline) : null
    const ctDue = corporationTaxDue ? new Date(corporationTaxDue) : null
    const csDue = confirmationStatementDeadline ? new Date(confirmationStatementDeadline) : null

    return {
      yearEnd: yearEnd && yearEnd > today ? Math.ceil((yearEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null,
      accountsDue: accountsDue && accountsDue > today ? Math.ceil((accountsDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null,
      ctDue: ctDue && ctDue > today ? Math.ceil((ctDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null,
      csDue: csDue && csDue > today ? Math.ceil((csDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const nextDeadlines = getNextDeadlines()

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Workflows</span>
            </div>
            <div className="text-2xl font-bold">{summary.totalWorkflows}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{summary.completedWorkflows}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{summary.activeWorkflows}</div>
          </CardContent>
        </Card>
      </div>

      {/* Next Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Next Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Year End</p>
              <p className="font-medium">
                {nextDeadlines.yearEnd 
                  ? `Due in ${nextDeadlines.yearEnd} days`
                  : yearEndDate 
                    ? formatDate(yearEndDate)
                    : 'Not set'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accounts Due</p>
              <p className="font-medium">
                {nextDeadlines.accountsDue 
                  ? `Due in ${nextDeadlines.accountsDue} days`
                  : accountsFilingDeadline 
                    ? formatDate(accountsFilingDeadline)
                    : 'Not set'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Corporation Tax</p>
              <p className="font-medium">
                {nextDeadlines.ctDue 
                  ? `Due in ${nextDeadlines.ctDue} days`
                  : corporationTaxDue 
                    ? formatDate(corporationTaxDue)
                    : 'Not set'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Confirmation Statement</p>
              <p className="font-medium">
                {nextDeadlines.csDue 
                  ? `Due in ${nextDeadlines.csDue} days`
                  : confirmationStatementDeadline 
                    ? formatDate(confirmationStatementDeadline)
                    : 'Not set'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflows List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Non-Ltd Accounts Workflows
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchNonLtdFilingHistory}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nonLtdWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No non-Ltd workflows found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {nonLtdWorkflows.map((workflow) => (
                <Card key={workflow.id} className="border">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">
                            {formatNonLtdPeriodForDisplay(workflow.yearEndDate)}
                          </h3>
                          {getStatusBadge(workflow)}
                          {getStageBadge(workflow.currentStage)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Year End:</span>
                            <span className="ml-2 font-medium">{formatDate(workflow.yearEndDate)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Accounts Due:</span>
                            <span className="ml-2 font-medium">{formatDate(workflow.accountsDueDate)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Assigned:</span>
                            <span className="ml-2 font-medium">
                              {workflow.assignedUser ? workflow.assignedUser.name : 'Unassigned'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWorkflowExpansion(workflow.id)}
                      >
                        {expandedWorkflows.has(workflow.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{getNonLtdWorkflowProgress(workflow.currentStage as NonLtdAccountsWorkflowStage)}%</span>
                      </div>
                      <Progress value={getNonLtdWorkflowProgress(workflow.currentStage as NonLtdAccountsWorkflowStage)} className="h-2" />
                    </div>

                    {/* Expanded Content */}
                    {expandedWorkflows.has(workflow.id) && (
                      <div className="space-y-6 pt-4 border-t">
                        {renderMilestones(workflow)}
                        {renderWorkflowHistory(workflow)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 