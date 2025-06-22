'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  FileText,
  Send,
  UserCheck,
  Building,
  RefreshCw,
  Users,
  Phone,
  ArrowUpDown,
  AlertCircle,
  Briefcase,
  Eye,
  MessageSquare
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { ActivityLogViewer } from '@/components/activity/activity-log-viewer'

interface LtdAccountsWorkflow {
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
  // Milestone dates with user attribution
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
}

interface LtdClient {
  id: string
  clientCode: string
  companyNumber?: string
  companyName: string
  companyType?: string
  incorporationDate?: string
  accountingReferenceDate?: string
  nextAccountsDue?: string
  nextCorporationTaxDue?: string
  nextConfirmationDue?: string
  
  // Ltd-specific assignee
  ltdCompanyAssignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  
  // Current Ltd workflow info
  currentLtdAccountsWorkflow?: LtdAccountsWorkflow | null
}

interface WorkflowStage {
  key: string
  label: string
  icon: React.ReactNode
  color: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  { key: 'PAPERWORK_PENDING_CHASE', label: 'Pending to Chase Paperwork', icon: <Clock className="h-4 w-4" />, color: 'bg-amber-100 text-amber-800' },
  { key: 'PAPERWORK_CHASED', label: 'Paperwork Chased', icon: <Phone className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'PAPERWORK_RECEIVED', label: 'Paperwork Received', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'WORK_IN_PROGRESS', label: 'Work in Progress', icon: <Briefcase className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'DISCUSS_WITH_MANAGER', label: 'To Discuss with Manager', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  { key: 'REVIEW_BY_PARTNER', label: 'To Review by Partner', icon: <Eye className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-800' },
  { key: 'REVIEW_DONE_HELLO_SIGN', label: 'Review Done - Hello Sign to Client', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800' },
  { key: 'SENT_TO_CLIENT_HELLO_SIGN', label: 'Sent to client on Hello Sign', icon: <Send className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-800' },
  { key: 'APPROVED_BY_CLIENT', label: 'Approved by Client', icon: <UserCheck className="h-4 w-4" />, color: 'bg-teal-100 text-teal-800' },
  { key: 'SUBMISSION_APPROVED_PARTNER', label: 'Submission Approved by Partner', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'FILED_CH_HMRC', label: 'Filed to CH & HMRC', icon: <Building className="h-4 w-4" />, color: 'bg-green-100 text-green-800' }
]

export function LtdCompaniesDeadlinesTable() {
  const { data: session } = useSession()
  const router = useRouter()
  const [ltdClients, setLtdClients] = useState<LtdClient[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<LtdClient | null>(null)
  const [selectedStage, setSelectedStage] = useState<string | undefined>(undefined)
  const [selectedAssignee, setSelectedAssignee] = useState<string>('unassigned')
  const [updateComments, setUpdateComments] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showClientSelfFilingConfirm, setShowClientSelfFilingConfirm] = useState(false)
  const [showFiledConfirm, setShowFiledConfirm] = useState(false)
  const [showBackwardStageConfirm, setShowBackwardStageConfirm] = useState(false)
  const [filter, setFilter] = useState<'assigned_to_me' | 'all'>('assigned_to_me')
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all')
  const [refreshingCompaniesHouse, setRefreshingCompaniesHouse] = useState(false)
  const [showActivityLogModal, setShowActivityLogModal] = useState(false)
  const [activityLogClient, setActivityLogClient] = useState<LtdClient | null>(null)

  // Get current month for header stats
  const currentMonth = new Date().getMonth() + 1
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' })

  const fetchLtdClients = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      const response = await fetch('/api/clients/ltd-deadlines', {
        // Add timestamp to prevent caching when forcing refresh
        ...(forceRefresh && { cache: 'no-store' })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch Ltd companies')
      }
      
      const data = await response.json()
      setLtdClients(data.clients || [])
    } catch (error) {
      console.error('Error fetching Ltd companies:', error)
      showToast.error('Failed to fetch Ltd companies data')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  useEffect(() => {
    fetchLtdClients()
    fetchUsers()
  }, [fetchLtdClients, fetchUsers])

  // Bulk refresh Companies House data for all filtered clients
  const handleBulkRefreshCompaniesHouse = async () => {
    if (sortedFilteredClients.length === 0) {
      showToast.error('No clients to refresh')
      return
    }

    // Only allow managers and partners
    if (session?.user?.role !== 'MANAGER' && session?.user?.role !== 'PARTNER') {
      showToast.error('Only managers and partners can refresh Companies House data')
      return
    }

    setRefreshingCompaniesHouse(true)
    
    try {
      const clientIds = sortedFilteredClients.map(client => client.id)
      
      showToast.info(`Starting refresh for ${clientIds.length} clients...`)
      
      const response = await fetch('/api/clients/bulk-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to refresh Companies House data')
      }

      const result = await response.json()
      
      // Show detailed results
      if (result.results.successful.length > 0) {
        showToast.success(`Successfully refreshed ${result.results.successful.length} clients`)
      }
      
      if (result.results.failed.length > 0) {
        showToast.error(`Failed to refresh ${result.results.failed.length} clients. Check console for details.`)
        console.warn('Failed refreshes:', result.results.failed)
      }

      // Refresh the table data after Companies House refresh
      await fetchLtdClients(true)
      
    } catch (error) {
      console.error('Error refreshing Companies House data:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to refresh Companies House data')
    } finally {
      setRefreshingCompaniesHouse(false)
    }
  }

  // Filter and sort clients based on assignment and due dates
  const filteredClients = ltdClients
    .filter(client => {
      // First apply the basic assigned filter
      let passesBasicFilter = true
      if (filter === 'assigned_to_me') {
        passesBasicFilter = client.ltdCompanyAssignedUser?.id === session?.user?.id ||
                           client.currentLtdAccountsWorkflow?.assignedUser?.id === session?.user?.id
      }
      
      // Then apply the user-specific filter
      let passesUserFilter = true
      if (selectedUserFilter !== 'all') {
        if (selectedUserFilter === 'unassigned') {
          passesUserFilter = !client.ltdCompanyAssignedUser?.id && !client.currentLtdAccountsWorkflow?.assignedUser?.id
        } else {
          passesUserFilter = client.ltdCompanyAssignedUser?.id === selectedUserFilter ||
                            client.currentLtdAccountsWorkflow?.assignedUser?.id === selectedUserFilter
        }
      }
      
      return passesBasicFilter && passesUserFilter
    })

  // Calculate client counts per user for filter display
  const userClientCounts = users.reduce((acc, user) => {
    const clientCount = ltdClients.filter(client => 
      client.ltdCompanyAssignedUser?.id === user.id ||
      client.currentLtdAccountsWorkflow?.assignedUser?.id === user.id
    ).length
    acc[user.id] = clientCount
    return acc
  }, {} as Record<string, number>)

  // Count unassigned clients
  const unassignedCount = ltdClients.filter(client => 
    !client.ltdCompanyAssignedUser?.id && !client.currentLtdAccountsWorkflow?.assignedUser?.id
  ).length

  const sortedFilteredClients = filteredClients
    .sort((a, b) => {
      // Sort by nextAccountsDue (soonest first)
      if (!a.nextAccountsDue && !b.nextAccountsDue) return 0
      if (!a.nextAccountsDue) return 1  // No due date goes to end
      if (!b.nextAccountsDue) return -1 // No due date goes to end
      
      const dateA = new Date(a.nextAccountsDue).getTime()
      const dateB = new Date(b.nextAccountsDue).getTime()
      return dateA - dateB // Ascending order (soonest first)
    })

  // Calculate header stats for current filing month
  const currentMonthClients = sortedFilteredClients.filter(client => {
    if (!client.nextAccountsDue) return false
    const dueDate = new Date(client.nextAccountsDue)
    return dueDate.getMonth() + 1 === currentMonth
  })

  const next7DaysClients = sortedFilteredClients.filter(client => {
    if (!client.nextAccountsDue) return false
    const dueDate = new Date(client.nextAccountsDue)
    const today = new Date()
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 7 && daysDiff >= 0
  })

  const next14DaysClients = sortedFilteredClients.filter(client => {
    if (!client.nextAccountsDue) return false
    const dueDate = new Date(client.nextAccountsDue)
    const today = new Date()
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 14 && daysDiff >= 0
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getDaysUntilDue = (dueDateString?: string) => {
    if (!dueDateString) return null
    const dueDate = new Date(dueDateString)
    const today = new Date()
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff < 0) {
      return { label: `Overdue by ${Math.abs(daysDiff)} days`, color: 'text-red-600' }
    } else if (daysDiff === 0) {
      return { label: 'Due today', color: 'text-red-600' }
    } else if (daysDiff <= 7) {
      return { label: `Due in ${daysDiff} days`, color: 'text-orange-600' }
    } else if (daysDiff <= 30) {
      return { label: `Due in ${daysDiff} days`, color: 'text-yellow-600' }
    } else {
      return { label: `Due in ${daysDiff} days`, color: 'text-green-600' }
    }
  }

  const isRecentlyFiled = (workflow: LtdAccountsWorkflow | null) => {
    if (!workflow?.filedDate || !workflow.isCompleted) return false
    const filedDate = new Date(workflow.filedDate)
    const today = new Date()
    const daysSinceFiled = Math.ceil((today.getTime() - filedDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceFiled <= 30 // Filed within last 30 days
  }

  const renderLtdWorkflowTimeline = (client: LtdClient) => {
    const workflow = client.currentLtdAccountsWorkflow
    if (!workflow) {
      return <p className="text-sm text-muted-foreground">No workflow started yet</p>
    }

    // Define milestone timeline for Ltd Companies workflow
    const milestones = [
      { 
        id: 'CHASE_STARTED', 
        date: workflow.chaseStartedDate, 
        user: workflow.chaseStartedByUserName,
        label: 'Chase Started',
        icon: <Phone className="h-4 w-4" />
      },
      { 
        id: 'PAPERWORK_RECEIVED', 
        date: workflow.paperworkReceivedDate, 
        user: workflow.paperworkReceivedByUserName,
        label: 'Paperwork Received',
        icon: <FileText className="h-4 w-4" />
      },
      { 
        id: 'WORK_STARTED', 
        date: workflow.workStartedDate, 
        user: workflow.workStartedByUserName,
        label: 'Work Started',
        icon: <Briefcase className="h-4 w-4" />
      },
      { 
        id: 'MANAGER_DISCUSSION', 
        date: workflow.managerDiscussionDate, 
        user: workflow.managerDiscussionByUserName,
        label: 'Manager Discussion',
        icon: <MessageSquare className="h-4 w-4" />
      },
      { 
        id: 'PARTNER_REVIEW', 
        date: workflow.partnerReviewDate, 
        user: workflow.partnerReviewByUserName,
        label: 'Partner Review',
        icon: <Eye className="h-4 w-4" />
      },
      { 
        id: 'REVIEW_COMPLETED', 
        date: workflow.reviewCompletedDate, 
        user: workflow.reviewCompletedByUserName,
        label: 'Review Complete',
        icon: <CheckCircle className="h-4 w-4" />
      },
      { 
        id: 'SENT_TO_CLIENT', 
        date: workflow.sentToClientDate, 
        user: workflow.sentToClientByUserName,
        label: 'Sent to Client',
        icon: <Send className="h-4 w-4" />
      },
      { 
        id: 'CLIENT_APPROVED', 
        date: workflow.clientApprovedDate, 
        user: workflow.clientApprovedByUserName,
        label: 'Client Approved',
        icon: <UserCheck className="h-4 w-4" />
      },
      { 
        id: 'PARTNER_APPROVED', 
        date: workflow.partnerApprovedDate, 
        user: workflow.partnerApprovedByUserName,
        label: 'Partner Approved',
        icon: <CheckCircle className="h-4 w-4" />
      },
      { 
        id: 'FILED', 
        date: workflow.filedDate, 
        user: workflow.filedByUserName,
        label: 'Filed to CH & HMRC',
        icon: <Building className="h-4 w-4" />
      }
    ]

    // Helper function to calculate days between two dates
    const calculateDaysBetween = (startDate: string, endDate: string): number => {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    // Calculate days between consecutive completed milestones
    const milestonesWithDays = milestones.map((milestone, index) => {
      let daysBetween = null
      
      if (milestone.date && index > 0) {
        // Find the previous completed milestone
        const previousMilestones = milestones.slice(0, index).reverse()
        const previousCompletedMilestone = previousMilestones.find(m => m.date)
        
        if (previousCompletedMilestone?.date) {
          daysBetween = calculateDaysBetween(previousCompletedMilestone.date, milestone.date)
        }
      }
      
      return {
        ...milestone,
        daysBetween
      }
    })

    return (
      <div className="relative overflow-x-auto">
        {/* Timeline Items with Connectors */}
        <div className="flex items-center justify-between min-w-full pb-4">
          {milestonesWithDays.map((milestone, index) => {
            const isCompleted = !!milestone.date
            const isLastItem = index === milestonesWithDays.length - 1
            const nextMilestone = milestonesWithDays[index + 1]
            
            return (
              <React.Fragment key={milestone.id}>
                {/* Milestone Node and Label */}
                <div className="flex flex-col items-center text-center flex-shrink-0">
                  {/* Timeline Node */}
                  <div className={`
                    w-12 h-12 rounded-full border-2 flex items-center justify-center mb-3
                    ${isCompleted 
                      ? 'bg-green-100 border-green-500 text-green-700' 
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                  `}>
                    {milestone.icon}
                  </div>
                  
                  {/* Stage Label */}
                  <div className="px-2 w-24">
                    <p className="text-xs font-medium text-gray-900 leading-tight mb-1">
                      {milestone.label}
                    </p>
                    {isCompleted ? (
                      <div>
                        <p className="text-xs text-green-600 font-medium">
                          {formatDate(milestone.date)}
                        </p>
                        {milestone.user && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            by {milestone.user}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Pending</p>
                    )}
                  </div>
                </div>
                
                {/* Connector with Days Count */}
                {!isLastItem && (
                  <div className="flex-1 flex flex-col items-center px-2 min-w-[60px] max-w-[120px]">
                    {/* Days Count Badge - Aligned with timeline nodes */}
                    <div className="h-12 flex items-center mb-3">
                      {nextMilestone?.daysBetween !== null && nextMilestone && (
                        <div className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">
                          {nextMilestone.daysBetween} day{nextMilestone.daysBetween !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                    
                    {/* Connector Line */}
                    <div className={`
                      h-0.5 w-full
                      ${isCompleted && nextMilestone?.date 
                        ? 'bg-green-400' 
                        : 'bg-gray-300'
                      }
                    `}></div>
                    
                    {/* Spacer to match milestone label height */}
                    <div className="flex-1"></div>
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    )
  }

  const getWorkflowStatus = (workflow: LtdAccountsWorkflow | null) => {
    if (!workflow) {
      return { 
        label: 'Not Started', 
        icon: <Clock className="h-4 w-4" />, 
        color: 'bg-gray-100 text-gray-800' 
      }
    }

    if (workflow.isCompleted) {
      return { 
        label: 'Completed', 
        icon: <CheckCircle className="h-4 w-4" />, 
        color: 'bg-green-100 text-green-800' 
      }
    }

    const stage = WORKFLOW_STAGES.find(s => s.key === workflow.currentStage)
    return stage || { 
      label: workflow.currentStage, 
      icon: <Clock className="h-4 w-4" />, 
      color: 'bg-gray-100 text-gray-800' 
    }
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortClients = (clients: LtdClient[]) => {
    if (!sortColumn) return clients

    return [...clients].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''

      switch (sortColumn) {
        case 'clientCode':
          aVal = a.clientCode
          bVal = b.clientCode
          break
        case 'companyNumber':
          aVal = a.companyNumber || ''
          bVal = b.companyNumber || ''
          break
        case 'companyName':
          aVal = a.companyName
          bVal = b.companyName
          break
        case 'yearEnd':
          aVal = a.accountingReferenceDate || ''
          bVal = b.accountingReferenceDate || ''
          break
        case 'accountsDue':
          aVal = new Date(a.nextAccountsDue || 0)
          bVal = new Date(b.nextAccountsDue || 0)
          break
        case 'ctDue':
          aVal = new Date(a.nextCorporationTaxDue || 0)
          bVal = new Date(b.nextCorporationTaxDue || 0)
          break
        case 'csDue':
          aVal = new Date(a.nextConfirmationDue || 0)
          bVal = new Date(b.nextConfirmationDue || 0)
          break
        case 'assignedTo':
          aVal = a.ltdCompanyAssignedUser?.name || ''
          bVal = b.ltdCompanyAssignedUser?.name || ''
          break
        case 'status':
          aVal = getWorkflowStatus(a.currentLtdAccountsWorkflow || null).label
          bVal = getWorkflowStatus(b.currentLtdAccountsWorkflow || null).label
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const SortableHeader = ({ column, children, className = "" }: { 
    column: string, 
    children: React.ReactNode, 
    className?: string 
  }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/50 ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
      </div>
    </TableHead>
  )

  const handleStageChange = (stageKey: string) => {
    if (!selectedClient?.currentLtdAccountsWorkflow?.currentStage) {
      setSelectedStage(stageKey)
      return
    }

    const currentStageIndex = WORKFLOW_STAGES.findIndex(s => s.key === selectedClient.currentLtdAccountsWorkflow?.currentStage)
    const newStageIndex = WORKFLOW_STAGES.findIndex(s => s.key === stageKey)
    
    // If trying to move backwards, show confirmation
    if (currentStageIndex !== -1 && newStageIndex < currentStageIndex) {
      setSelectedStage(stageKey)
      setShowBackwardStageConfirm(true)
    } else {
      setSelectedStage(stageKey)
    }
  }

  const handleSubmitUpdate = async () => {
    if (!selectedClient || (!selectedStage && selectedAssignee === (selectedClient?.ltdCompanyAssignedUser?.id || 'unassigned'))) {
      showToast.error('Please select a stage to update or assign a user')
      return
    }

    // If FILED_CH_HMRC is selected, show confirmation dialog
    if (selectedStage === 'FILED_CH_HMRC') {
      setShowFiledConfirm(true)
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/clients/ltd-deadlines/${selectedClient.id}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: selectedStage,
          assignedUserId: selectedAssignee === 'unassigned' ? null : selectedAssignee,
          comments: updateComments
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Workflow updated successfully')
        setUpdateModalOpen(false)
        setSelectedStage(undefined)
        setUpdateComments('')
        await fetchLtdClients(true)
      } else {
        showToast.error(data.error || 'Failed to update workflow')
      }
    } catch (error) {
      console.error('Error updating workflow:', error)
      showToast.error('Failed to update workflow')
    } finally {
      setUpdating(false)
    }
  }

  const handleClientSelfFiling = async () => {
    if (!selectedClient) {
      showToast.error('No client selected')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/clients/ltd-deadlines/${selectedClient.id}/self-filing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comments: 'Client handling their own accounts filing',
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Marked as client self-filing')
        setUpdateModalOpen(false)
        setShowClientSelfFilingConfirm(false)
        await fetchLtdClients(true)
      } else {
        showToast.error(data.error || 'Failed to update workflow')
      }
    } catch (error) {
      console.error('Error marking as self-filing:', error)
      showToast.error('Failed to update workflow')
    } finally {
      setUpdating(false)
    }
  }

  const handleFiledToCompaniesHouse = async () => {
    if (!selectedClient) {
      showToast.error('No client selected')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/clients/ltd-deadlines/${selectedClient.id}/filed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comments: updateComments || 'Filed to Companies House & HMRC'
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('🎉 Filing completed! Companies House data refreshed.')
        setUpdateModalOpen(false)
        setShowFiledConfirm(false)
        setSelectedStage(undefined)
        setUpdateComments('')
        await fetchLtdClients(true)
      } else {
        showToast.error(data.error || 'Failed to complete filing')
      }
    } catch (error) {
      console.error('Error completing filing:', error)
      showToast.error('Failed to complete filing')
    } finally {
      setUpdating(false)
    }
  }

  const handleViewActivityLog = (client: LtdClient) => {
    setActivityLogClient(client)
    setShowActivityLogModal(true)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading Ltd Companies deadlines...
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            {/* Page Header */}
            <div className="page-header">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold">Ltd Companies Deadlines</h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Track and manage filing deadlines for all Limited Company clients
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLtdClients(true)}
                    disabled={loading || refreshingCompaniesHouse}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkRefreshCompaniesHouse}
                    disabled={loading || refreshingCompaniesHouse || sortedFilteredClients.length === 0}
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Building className={`mr-2 h-4 w-4 ${refreshingCompaniesHouse ? 'animate-spin' : ''}`} />
                    {refreshingCompaniesHouse ? 'Refreshing CH...' : `Refresh CH Data (${sortedFilteredClients.length})`}
                  </Button>
                </div>
              </div>
            </div>

            {/* Current Month Summary */}
            <Card className="p-6 border-l-4 border-l-purple-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Current Filing Month - Most Emphasized */}
                <div className="md:col-span-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <Calendar className="h-6 w-6 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Filing Month</p>
                      <h2 className="text-3xl font-bold text-purple-600">{currentMonthName}</h2>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>{currentMonthClients.length}</strong> accounts due
                  </p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 md:col-span-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{next7DaysClients.length}</div>
                    <p className="text-xs text-muted-foreground">Due in 7 days</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{next14DaysClients.length}</div>
                    <p className="text-xs text-muted-foreground">Due in 14 days</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{sortedFilteredClients.length}</div>
                    <p className="text-xs text-muted-foreground">Total clients</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Filter Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-2">
                <Button
                  variant={filter === 'assigned_to_me' ? 'default' : 'outline'}
                  onClick={() => {
                    setFilter('assigned_to_me')
                    setSelectedUserFilter('all')
                  }}
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Assigned to Me
                </Button>
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  onClick={() => {
                    setFilter('all')
                    setSelectedUserFilter('all')
                  }}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  All Clients
                </Button>
              </div>

              {/* User Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Label htmlFor="user-filter" className="text-sm font-medium whitespace-nowrap">
                  Filter by User:
                </Label>
                <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-600" />
                        <span>All Users ({ltdClients.length})</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>Unassigned ({unassignedCount})</span>
                      </div>
                    </SelectItem>
                    {users
                      .filter(user => userClientCounts[user.id] > 0)
                      .sort((a, b) => (userClientCounts[b.id] || 0) - (userClientCounts[a.id] || 0))
                      .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">({userClientCounts[user.id]})</span>
                        </div>
                      </SelectItem>
                    ))}
                    {users
                      .filter(user => userClientCounts[user.id] === 0)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-500">{user.name}</span>
                          <span className="text-xs text-muted-foreground">(0)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="border-b">
                        <SortableHeader column="clientCode" className="w-16 col-ltd-client-code">Code</SortableHeader>
                        <SortableHeader column="companyNumber" className="w-20 col-ltd-company-number">Co. No.</SortableHeader>
                        <SortableHeader column="companyName" className="w-48 col-ltd-company-name">Company Name</SortableHeader>
                        <SortableHeader column="yearEnd" className="w-20 col-ltd-year-end">Year End</SortableHeader>
                        <SortableHeader column="accountsDue" className="w-24 col-ltd-accounts-due">Accounts</SortableHeader>
                        <SortableHeader column="ctDue" className="w-20 col-ltd-ct-due">CT</SortableHeader>
                        <SortableHeader column="csDue" className="w-20 col-ltd-cs-due">CS</SortableHeader>
                        <SortableHeader column="assignedTo" className="w-24 col-ltd-assigned">Assigned To</SortableHeader>
                        <SortableHeader column="status" className="w-32 col-ltd-status">Status</SortableHeader>
                        <TableHead className="w-20 col-ltd-update">Update</TableHead>
                        <TableHead className="w-12 col-ltd-action">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody className="table-compact">
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading Ltd companies...
                        </TableCell>
                      </TableRow>
                    ) : sortedFilteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          <div className="space-y-2">
                            <Building className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground">No Ltd companies found</p>
                            <p className="text-xs text-muted-foreground">
                              {filter === 'assigned_to_me' ? 'No Ltd companies assigned to you' : 'No Limited Company clients in the system'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortClients(sortedFilteredClients).map((client) => {
                      const workflowStatus = getWorkflowStatus(client.currentLtdAccountsWorkflow || null)
                      const accountsDue = getDaysUntilDue(client.nextAccountsDue)
                      const ctDue = getDaysUntilDue(client.nextCorporationTaxDue)
                      const csDue = getDaysUntilDue(client.nextConfirmationDue)
                      const rowKey = client.id
                      
                      return (
                        <React.Fragment key={client.id}>
                          {/* Main Row */}
                          <TableRow className="hover:bg-muted/50 h-12">
                            <TableCell className="font-mono text-xs p-2">
                              {client.clientCode}
                            </TableCell>
                            <TableCell className="font-mono text-xs p-2">
                              {client.companyNumber || '—'}
                            </TableCell>
                            <TableCell className="font-medium p-2">
                              <div className="flex items-center gap-2">
                                <div className="max-w-[150px] truncate text-sm" title={client.companyName}>
                                  {client.companyName}
                                </div>
                                <button
                                  onClick={() => handleViewActivityLog(client)}
                                  className="flex items-center gap-1 text-left hover:text-primary transition-colors cursor-pointer group text-xs"
                                  title="View Activity Log"
                                >
                                  <Clock className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs p-2">
                              {client.accountingReferenceDate ? formatDate(client.accountingReferenceDate) : '—'}
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="text-xs">
                                <div className="font-medium">{formatDate(client.nextAccountsDue)}</div>
                                {accountsDue && (
                                  <div className={`text-xs ${accountsDue.color}`}>
                                    {accountsDue.label}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="text-xs">
                                <div className="font-medium">{formatDate(client.nextCorporationTaxDue)}</div>
                                {ctDue && (
                                  <div className={`text-xs ${ctDue.color}`}>
                                    {ctDue.label}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="text-xs">
                                <div className="font-medium">{formatDate(client.nextConfirmationDue)}</div>
                                {csDue && (
                                  <div className={`text-xs ${csDue.color}`}>
                                    {csDue.label}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              <div className="text-xs">
                                {client.ltdCompanyAssignedUser ? (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-blue-600" />
                                    <span className="text-blue-600 font-medium max-w-[80px] truncate" title={client.ltdCompanyAssignedUser.name}>
                                      {client.ltdCompanyAssignedUser.name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Unassigned</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-2">
                              <Badge variant="outline" className={`text-xs px-2 py-1 ${workflowStatus.color}`}>
                                <div className="flex items-center gap-1">
                                  {workflowStatus.icon}
                                  <span className="max-w-[100px] truncate" title={workflowStatus.label}>
                                    {workflowStatus.label}
                                  </span>
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell className="p-2">
                              {client.currentLtdAccountsWorkflow?.isCompleted || 
                               client.currentLtdAccountsWorkflow?.currentStage === 'FILED_CH_HMRC' ? (
                                <span className="text-xs text-green-600 font-medium">Complete</span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedClient(client)
                                    setSelectedStage(undefined)
                                    setSelectedAssignee(client.ltdCompanyAssignedUser?.id || 'unassigned')
                                    setUpdateComments('')
                                    setUpdateModalOpen(true)
                                  }}
                                  className="flex items-center gap-1 h-8 px-2 text-xs"
                                >
                                  <Plus className="h-3 w-3" />
                                  Update
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-muted/50 transition-colors"
                                onClick={() => {
                                  const newExpanded = new Set(expandedRows)
                                  if (expandedRows.has(rowKey)) {
                                    newExpanded.delete(rowKey)
                                  } else {
                                    newExpanded.add(rowKey)
                                  }
                                  setExpandedRows(newExpanded)
                                }}
                                title="Show/Hide Workflow Timeline"
                              >
                                {expandedRows.has(rowKey) ? (
                                  <ChevronDown className="h-3 w-3 text-foreground" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-foreground" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Row - Workflow Timeline */}
                          {expandedRows.has(rowKey) && (
                            <TableRow>
                              <TableCell colSpan={11} className="p-0">
                                <div className="bg-muted/20 p-4 border-t">
                                  <h4 className="font-medium mb-3 flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" />
                                    Workflow Timeline
                                  </h4>
{renderLtdWorkflowTimeline(client)}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                        )
                      })
                    )}
                  </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
          </div>
        </div>
      </div>

      {/* Update Modal - Full Workflow Functionality */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Ltd Company Workflow</DialogTitle>
            <DialogDescription>
              Update workflow stage and assignment for {selectedClient?.companyName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Status Display */}
            {selectedClient?.currentLtdAccountsWorkflow && (
              <div className="bg-muted/20 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Current Status</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getWorkflowStatus(selectedClient.currentLtdAccountsWorkflow).color}>
                      {getWorkflowStatus(selectedClient.currentLtdAccountsWorkflow).label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Assigned to: {selectedClient.currentLtdAccountsWorkflow.assignedUser?.name || 
                                  selectedClient.ltdCompanyAssignedUser?.name || 'Unassigned'}
                  </p>
                </div>
              </div>
            )}

            {/* Workflow Stage Selection */}
            <div className="space-y-2">
              <Label htmlFor="stage-select">Update Workflow Stage</Label>
              <Select value={selectedStage || ''} onValueChange={handleStageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage to update to..." />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_STAGES.map((stage) => {
                    const currentStageIndex = WORKFLOW_STAGES.findIndex(s => s.key === selectedClient?.currentLtdAccountsWorkflow?.currentStage)
                    const stageIndex = WORKFLOW_STAGES.findIndex(s => s.key === stage.key)
                    const isCompletedStage = currentStageIndex !== -1 && stageIndex < currentStageIndex
                    
                    return (
                      <SelectItem key={stage.key} value={stage.key}>
                        <div className={`flex items-center gap-2 ${isCompletedStage ? 'opacity-50' : ''}`}>
                          {stage.icon}
                          <span>{stage.label}</span>
                          {isCompletedStage && <span className="text-xs text-muted-foreground ml-1">(Completed)</span>}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Assignment Selection */}
            <div className="space-y-2">
              <Label htmlFor="assignee-select">Assign to User</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-gray-400" />
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {session?.user?.id && (
                    <SelectItem value={session.user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-blue-600" />
                        <span className="font-medium text-blue-600">Assign to Me</span>
                        <span className="text-xs text-blue-500">({session.user.role})</span>
                      </div>
                    </SelectItem>
                  )}
                  {users
                    .filter(user => user.id !== session?.user?.id)
                    .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-gray-600" />
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground">({user.role})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                value={updateComments}
                onChange={(e) => setUpdateComments(e.target.value)}
                placeholder="Add any notes about this update..."
                rows={3}
              />
            </div>

            {/* Client Self-Filing Option */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setShowClientSelfFilingConfirm(true)}
                className="w-full flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Client will do self filing
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setUpdateModalOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitUpdate}
              disabled={updating || (!selectedStage && selectedAssignee === (selectedClient?.ltdCompanyAssignedUser?.id || 'unassigned'))}
            >
              {updating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Workflow'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Are you sure you want to mark this workflow as "Client self-filing"?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800">Important Notice</p>
                  <p className="text-xs text-amber-700">
                    This will mark the workflow as completed and indicate that the client 
                    handles their own accounts filing. This action cannot be easily undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowClientSelfFilingConfirm(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleClientSelfFiling}
              disabled={updating}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {updating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Self-Filing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filed to CH & HMRC Confirmation Dialog */}
      <Dialog open={showFiledConfirm} onOpenChange={setShowFiledConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-600" />
              Confirm Filing to CH & HMRC
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to mark this workflow as "Filed to CH & HMRC"?
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-800">Filing Confirmation</p>
                  <p className="text-xs text-green-700">
                    This will mark the workflow as completed and automatically refresh 
                    the client's Companies House data to update the next filing deadlines.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFiledConfirm(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFiledToCompaniesHouse}
              disabled={updating}
              className="bg-green-600 hover:bg-green-700"
            >
              {updating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Filing & Refreshing...
                </>
              ) : (
                'Confirm Filing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backward Stage Movement Confirmation Dialog */}
      <Dialog open={showBackwardStageConfirm} onOpenChange={setShowBackwardStageConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Confirm Backward Stage Movement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You are trying to move back to a previous stage. This is not typically recommended as it reverses progress.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800">Stage Change Warning</p>
                  <p className="text-xs text-amber-700">
                    Current: {WORKFLOW_STAGES.find(s => s.key === selectedClient?.currentLtdAccountsWorkflow?.currentStage)?.label}
                    <br />
                    Moving to: {WORKFLOW_STAGES.find(s => s.key === selectedStage)?.label}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBackwardStageConfirm(false)
                setSelectedStage(selectedClient?.currentLtdAccountsWorkflow?.currentStage || '')
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowBackwardStageConfirm(false)
                // Stage change already set, user can now proceed with normal update
              }}
              disabled={updating}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Log Modal */}
      <Dialog open={showActivityLogModal} onOpenChange={setShowActivityLogModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Log - {activityLogClient?.companyName}</DialogTitle>
          </DialogHeader>
          {activityLogClient && (
            <ActivityLogViewer
              clientId={activityLogClient.id}
              title=""
              showFilters={true}
              showExport={true}
              limit={50}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
} 