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
  ACCOUNTS_WORKFLOW_STAGE_NAMES, 
  formatAccountsPeriod, 
  formatAccountsPeriodForDisplay,
  calculateAccountsFilingDays,
  getAccountsWorkflowProgress,
  getAccountsWorkflowStageColor,
  type AccountsWorkflowStage
} from '@/lib/accounts-workflow'

interface AccountsWorkflow {
  id: string
  filingPeriodStart: string
  filingPeriodEnd: string
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
  filedToCompaniesHouseDate?: string
  filedToCompaniesHouseByUserName?: string
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

interface AccountsFilingHistoryProps {
  clientId: string
  clientCode: string
  companyName: string
  companyNumber: string
  yearEndDate: string
  accountsFilingDeadline: string
  confirmationStatementDeadline: string
}

export function AccountsFilingHistory({
  clientId,
  clientCode,
  companyName,
  companyNumber,
  yearEndDate,
  accountsFilingDeadline,
  confirmationStatementDeadline
}: AccountsFilingHistoryProps) {
  const [loading, setLoading] = useState(true)
  const [accountsWorkflows, setAccountsWorkflows] = useState<AccountsWorkflow[]>([])
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState({
    totalWorkflows: 0,
    completedWorkflows: 0,
    activeWorkflows: 0
  })

  useEffect(() => {
    fetchAccountsFilingHistory()
  }, [clientId])

  const fetchAccountsFilingHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}/accounts-filing-history`)
      const data = await response.json()

      if (data.success) {
        setAccountsWorkflows(data.data.accountsWorkflows || [])
        setSummary({
          totalWorkflows: data.data.totalWorkflows || 0,
          completedWorkflows: data.data.completedWorkflows || 0,
          activeWorkflows: data.data.activeWorkflows || 0
        })
      } else {
        showToast.error('Failed to fetch accounts filing history')
      }
    } catch (error) {
      console.error('Error fetching accounts filing history:', error)
      showToast.error('Failed to fetch accounts filing history')
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

  const getStatusBadge = (workflow: AccountsWorkflow) => {
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
    const stageName = ACCOUNTS_WORKFLOW_STAGE_NAMES[stage as AccountsWorkflowStage] || stage
    const color = getAccountsWorkflowStageColor(stage as AccountsWorkflowStage)
    
    return (
      <Badge variant="outline" className={`text-xs ${color}`}>
        {stageName}
      </Badge>
    )
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

  const renderMilestones = (workflow: AccountsWorkflow) => {
    const milestones = [
      { 
        id: 'CHASE_STARTED', 
        date: workflow.chaseStartedDate, 
        user: workflow.chaseStartedByUserName,
        label: 'Chase Started',
        icon: <Phone className="h-3 w-3" />
      },
      { 
        id: 'PAPERWORK_RECEIVED', 
        date: workflow.paperworkReceivedDate, 
        user: workflow.paperworkReceivedByUserName,
        label: 'Records Received',
        icon: <FileText className="h-3 w-3" />
      },
      { 
        id: 'WORK_STARTED', 
        date: workflow.workStartedDate, 
        user: workflow.workStartedByUserName,
        label: 'Work Started',
        icon: <TrendingUp className="h-3 w-3" />
      },
      { 
        id: 'MANAGER_DISCUSSION', 
        date: workflow.managerDiscussionDate, 
        user: workflow.managerDiscussionByUserName,
        label: 'Manager Discussion',
        icon: <User className="h-3 w-3" />
      },
      { 
        id: 'PARTNER_REVIEW', 
        date: workflow.partnerReviewDate, 
        user: workflow.partnerReviewByUserName,
        label: 'Partner Review',
        icon: <UserCheck className="h-3 w-3" />
      },
      { 
        id: 'REVIEW_COMPLETED', 
        date: workflow.reviewCompletedDate, 
        user: workflow.reviewCompletedByUserName,
        label: 'Review Completed',
        icon: <CheckCircle className="h-3 w-3" />
      },
      { 
        id: 'SENT_TO_CLIENT', 
        date: workflow.sentToClientDate, 
        user: workflow.sentToClientByUserName,
        label: 'Sent to Client',
        icon: <Send className="h-3 w-3" />
      },
      { 
        id: 'CLIENT_APPROVED', 
        date: workflow.clientApprovedDate, 
        user: workflow.clientApprovedByUserName,
        label: 'Client Approved',
        icon: <CheckCircle className="h-3 w-3" />
      },
      { 
        id: 'PARTNER_APPROVED', 
        date: workflow.partnerApprovedDate, 
        user: workflow.partnerApprovedByUserName,
        label: 'Partner Approved',
        icon: <UserCheck className="h-3 w-3" />
      },
      { 
        id: 'FILED_TO_COMPANIES_HOUSE', 
        date: workflow.filedToCompaniesHouseDate, 
        user: workflow.filedToCompaniesHouseByUserName,
        label: 'Filed to Companies House',
        icon: <Building className="h-3 w-3" />
      },
      { 
        id: 'FILED_TO_HMRC', 
        date: workflow.filedToHMRCDate, 
        user: workflow.filedToHMRCByUserName,
        label: 'Filed to HMRC',
        icon: <CheckCircle className="h-3 w-3" />
      }
    ]

    const completedMilestones = milestones.filter(m => m.date)
    
    if (completedMilestones.length === 0) {
      return <p className="text-sm text-muted-foreground">No milestones completed yet</p>
    }

    return (
      <div className="space-y-2">
        {completedMilestones.map((milestone) => (
          <div key={milestone.id} className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              {milestone.icon}
              <span>{milestone.label}:</span>
            </div>
            <span className="font-medium">{formatDate(milestone.date)}</span>
            {milestone.user && (
              <span className="text-muted-foreground">by {milestone.user}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderWorkflowHistory = (workflow: AccountsWorkflow) => {
    if (!workflow.workflowHistory || workflow.workflowHistory.length === 0) {
      return <p className="text-sm text-muted-foreground">No workflow history available</p>
    }

    return (
      <div className="space-y-3">
        {workflow.workflowHistory.map((entry, index) => (
          <div key={entry.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {ACCOUNTS_WORKFLOW_STAGE_NAMES[entry.toStage as AccountsWorkflowStage] || entry.toStage}
                </span>
                {entry.daysInPreviousStage && (
                  <Badge variant="outline" className="text-xs">
                    {entry.daysInPreviousStage} days
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDateTime(entry.stageChangedAt)}</span>
                <span>•</span>
                <span>{entry.userName}</span>
                <span>•</span>
                <Badge variant="outline" className="text-xs">
                  {entry.userRole}
                </Badge>
              </div>
              {entry.notes && (
                <p className="text-sm mt-1 text-muted-foreground">{entry.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Calculate next deadlines for current period
  const getNextDeadlines = () => {
    const today = new Date()
    const accountsDeadline = accountsFilingDeadline ? new Date(accountsFilingDeadline) : null
    const csDeadline = confirmationStatementDeadline ? new Date(confirmationStatementDeadline) : null

    const accountsDaysLeft = accountsDeadline 
      ? Math.ceil((accountsDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const csDaysLeft = csDeadline
      ? Math.ceil((csDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return { accountsDaysLeft, csDaysLeft }
  }

  const { accountsDaysLeft, csDaysLeft } = getNextDeadlines()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Filing Period Information */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Year End</p>
                <p className="text-lg font-bold">{formatDate(yearEndDate)}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accounts Due</p>
                <p className="text-lg font-bold">{formatDate(accountsFilingDeadline)}</p>
                {accountsDaysLeft !== null && (
                  <p className={`text-xs ${
                    accountsDaysLeft < 0 ? 'text-red-600' : 
                    accountsDaysLeft <= 30 ? 'text-amber-600' : 
                    'text-green-600'
                  }`}>
                    {accountsDaysLeft < 0 
                      ? `${Math.abs(accountsDaysLeft)} days overdue`
                      : `${accountsDaysLeft} days remaining`
                    }
                  </p>
                )}
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmation Statement</p>
                <p className="text-lg font-bold">{formatDate(confirmationStatementDeadline)}</p>
                {csDaysLeft !== null && (
                  <p className={`text-xs ${
                    csDaysLeft < 0 ? 'text-red-600' : 
                    csDaysLeft <= 30 ? 'text-amber-600' : 
                    'text-green-600'
                  }`}>
                    {csDaysLeft < 0 
                      ? `${Math.abs(csDaysLeft)} days overdue`
                      : `${csDaysLeft} days remaining`
                    }
                  </p>
                )}
              </div>
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Filings</p>
                <p className="text-lg font-bold">{summary.totalWorkflows}</p>
                <p className="text-xs text-muted-foreground">
                  {summary.completedWorkflows} completed
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Filing Data */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Annual Accounts Filing History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAccountsFilingHistory}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accountsWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No Filing History</p>
              <p className="text-sm text-muted-foreground">
                No annual accounts workflows found for this client yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {accountsWorkflows.map((workflow) => {
                const isExpanded = expandedWorkflows.has(workflow.id)
                const progress = getAccountsWorkflowProgress(workflow.currentStage as AccountsWorkflowStage)
                const { totalDays } = calculateAccountsFilingDays(workflow)
                
                return (
                  <Card key={workflow.id} className="border-l-4 border-l-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium">
                              Year ending {formatAccountsPeriodForDisplay(workflow.filingPeriodStart, workflow.filingPeriodEnd)}
                            </h3>
                            {getStatusBadge(workflow)}
                            {getStageBadge(workflow.currentStage)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Accounts Due</p>
                              <p className="font-medium">{formatDate(workflow.accountsDueDate)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">CT Due</p>
                              <p className="font-medium">{formatDate(workflow.ctDueDate)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Assigned To</p>
                              <p className="font-medium">{workflow.assignedUser?.name || 'Unassigned'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Duration</p>
                              <p className="font-medium">{totalDays > 0 ? `${totalDays} days` : '-'}</p>
                            </div>
                          </div>

                          {!workflow.isCompleted && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span>Progress</span>
                                <span>{Math.round(progress.progressPercentage)}%</span>
                              </div>
                              <Progress value={progress.progressPercentage} className="h-2" />
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleWorkflowExpansion(workflow.id)}
                          className="ml-4"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Milestones</h4>
                            {renderMilestones(workflow)}
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Workflow History</h4>
                            {renderWorkflowHistory(workflow)}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={accountsWorkflows.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export Accounts History
        </Button>
      </div>
    </div>
  )
} 