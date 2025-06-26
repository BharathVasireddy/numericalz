'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUsers, type User as UserType } from '@/lib/hooks/useUsers'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
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
  ChevronUp,
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
  XCircle,
  Briefcase,
  Eye,
  MessageSquare,
  Settings,
  Edit,
  UserPlus,
  Filter,
  Undo2,
  X,
  AlertTriangle
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { ActivityLogViewer } from '@/components/activity/activity-log-viewer'
import { AdvancedFilterModal } from './advanced-filter-modal'
import { WorkflowSkipWarningDialog } from '@/components/ui/workflow-skip-warning-dialog'
import { validateStageTransition, getSelectableStages } from '@/lib/workflow-validation'


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
  filedToCompaniesHouseDate?: string
  filedToCompaniesHouseByUserName?: string
  filedToHMRCDate?: string
  filedToHMRCByUserName?: string
}

interface LtdClient {
  id: string
  clientCode: string
  companyNumber?: string
  companyName: string
  companyType?: string
  incorporationDate?: string
  accountingReferenceDate?: string
  nextYearEnd?: string  // Companies House official year end date
  nextAccountsDue?: string
  lastAccountsMadeUpTo?: string
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



// All workflow stages for display purposes
const ALL_WORKFLOW_STAGES: WorkflowStage[] = [
  { key: 'WAITING_FOR_YEAR_END', label: 'Waiting for Year End', icon: <Calendar className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' },
  { key: 'PAPERWORK_PENDING_CHASE', label: 'Pending to Chase Paperwork', icon: <Clock className="h-4 w-4" />, color: 'bg-amber-100 text-amber-800' },
  { key: 'PAPERWORK_CHASED', label: 'Paperwork Chased', icon: <Phone className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'PAPERWORK_RECEIVED', label: 'Paperwork Received', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'WORK_IN_PROGRESS', label: 'Work in Progress', icon: <Briefcase className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'DISCUSS_WITH_MANAGER', label: 'To Discuss with Manager', icon: <MessageSquare className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  { key: 'REVIEWED_BY_MANAGER', label: 'Reviewed by Manager', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'REVIEW_BY_PARTNER', label: 'To Review by Partner', icon: <Eye className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-800' },
  { key: 'REVIEWED_BY_PARTNER', label: 'Reviewed by Partner', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'REVIEW_DONE_HELLO_SIGN', label: 'Review Done - Hello Sign to Client', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800' },
  { key: 'SENT_TO_CLIENT_HELLO_SIGN', label: 'Sent to client on Hello Sign', icon: <Send className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-800' },
  { key: 'APPROVED_BY_CLIENT', label: 'Approved by Client', icon: <UserCheck className="h-4 w-4" />, color: 'bg-teal-100 text-teal-800' },
  { key: 'SUBMISSION_APPROVED_PARTNER', label: 'Submission Approved by Partner', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'FILED_TO_COMPANIES_HOUSE', label: 'Filed to Companies House', icon: <Building className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'FILED_TO_HMRC', label: 'Filed to HMRC', icon: <Building className="h-4 w-4" />, color: 'bg-green-100 text-green-800' }
]

// User-selectable workflow stages (excluding auto-set stages)
const WORKFLOW_STAGES = ALL_WORKFLOW_STAGES.filter(stage => 
  !['REVIEWED_BY_MANAGER', 'REVIEWED_BY_PARTNER'].includes(stage.key)
)

// Filter interfaces to match the main clients page
interface FilterCondition {
  id: string
  field: string
  operator: string
  value: string | string[] | boolean | null
  value2?: string
}

interface FilterGroup {
  id: string
  operator: 'AND' | 'OR'
  conditions: FilterCondition[]
}

interface AdvancedFilter {
  id: string
  name: string
  groups: FilterGroup[]
  groupOperator: 'AND' | 'OR'
}

interface LtdCompaniesDeadlinesTableProps {
  focusClientId?: string
  focusWorkflowId?: string
}

export function LtdCompaniesDeadlinesTable({ 
  focusClientId, 
  focusWorkflowId 
}: LtdCompaniesDeadlinesTableProps = {}) {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize filter state from URL parameters
  const getInitialFilter = () => {
    const filterParam = searchParams.get('filter')
    if (filterParam === 'unassigned') {
      return { filter: 'all' as const, userFilter: 'unassigned' }
    }
    return { filter: 'all' as const, userFilter: 'all' }
  }
  
  const initialFilterState = getInitialFilter()
  
  const [ltdClients, setLtdClients] = useState<LtdClient[]>([])
  const [loading, setLoading] = useState(true)
  
  // Use centralized user fetching hook
  const { users, loading: usersLoading, error: usersError } = useUsers()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<LtdClient | null>(null)
  const [selectedStage, setSelectedStage] = useState<string | undefined>(undefined)
  const [selectedAssignee, setSelectedAssignee] = useState<string>('unassigned')
  const [updateComments, setUpdateComments] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [sortField, setSortField] = useState<string>('companyName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showClientSelfFilingConfirm, setShowClientSelfFilingConfirm] = useState(false)
  const [showFiledConfirm, setShowFiledConfirm] = useState(false)
  const [showFiledCompaniesHouseConfirm, setShowFiledCompaniesHouseConfirm] = useState(false)
  const [showFiledHMRCConfirm, setShowFiledHMRCConfirm] = useState(false)
  const [companiesHouseWarning, setCompaniesHouseWarning] = useState<any>(null)
  const [showBackwardStageConfirm, setShowBackwardStageConfirm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'assigned_to_me'>(initialFilterState.filter)
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(initialFilterState.userFilter)
  const [selectedWorkflowStageFilter, setSelectedWorkflowStageFilter] = useState<string>('all')
  const [refreshingCompaniesHouse, setRefreshingCompaniesHouse] = useState(false)
  const [refreshingClientId, setRefreshingClientId] = useState<string | null>(null)
  const [undoingClientId, setUndoingClientId] = useState<string | null>(null)
  const [showActivityLogModal, setShowActivityLogModal] = useState(false)
  const [activityLogClient, setActivityLogClient] = useState<LtdClient | null>(null)
  
  // Advanced filter state
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter | null>(null)
  
  // Workflow skip validation states
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const [pendingStageChange, setPendingStageChange] = useState<{
    client: LtdClient
    targetStage: string
    skippedStages: string[]
  } | null>(null)

  // State for rollover information display
  const [rolloverInfo, setRolloverInfo] = useState<{
    newWorkflow: {
      id: string
      filingPeriodStart: string
      filingPeriodEnd: string
      currentStage: string
      assignedUserId: string | null
    }
    updatedDates: {
      yearEnd: string
      accountsDue: string
      ctDue: string
      confirmationDue: string
    }
  } | null>(null)
  const [showRolloverModal, setShowRolloverModal] = useState(false)

  // Get current month for header stats
  const currentMonth = new Date().getMonth() + 1
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' })

  const fetchLtdClients = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      // Add timestamp to prevent caching when forcing refresh
      const url = forceRefresh 
        ? `/api/clients/ltd-deadlines?_t=${Date.now()}`
        : '/api/clients/ltd-deadlines'
      
      const response = await fetch(url, {
        ...(forceRefresh && { 
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
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

  useEffect(() => {
    fetchLtdClients()
  }, [fetchLtdClients])

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

  // Advanced filter handlers
  const handleApplyAdvancedFilters = (filter: AdvancedFilter | null) => {
    setAdvancedFilter(filter)
    setShowAdvancedFilter(false)
  }

  const hasActiveAdvancedFilters = () => {
    return advancedFilter !== null
  }

  const clearAdvancedFilter = () => {
    setAdvancedFilter(null)
  }

  // Enhanced filter function with advanced filters
  const filteredClients = useMemo(() => {
    return ltdClients.filter(client => {
      // Basic assigned filter
      let passesBasicFilter = true
      if (filter === 'assigned_to_me') {
        passesBasicFilter = client.ltdCompanyAssignedUser?.id === session?.user?.id
      }
      
      // User filter
      let passesUserFilter = true
      if (selectedUserFilter !== 'all') {
        if (selectedUserFilter === 'unassigned') {
          passesUserFilter = !client.ltdCompanyAssignedUser?.id
        } else {
          passesUserFilter = client.ltdCompanyAssignedUser?.id === selectedUserFilter
        }
      }
      
      // Workflow stage filter
      let passesWorkflowFilter = true
      if (selectedWorkflowStageFilter !== 'all') {
        passesWorkflowFilter = client.currentLtdAccountsWorkflow?.currentStage === selectedWorkflowStageFilter
      }

      // Advanced filter
      let passesAdvancedFilter = true
      if (advancedFilter) {
        // This would be processed by the API in a real implementation
        // For now, we'll show all results when advanced filter is active
        // The actual filtering would happen server-side
        passesAdvancedFilter = true
      }

      return passesBasicFilter && passesUserFilter && passesWorkflowFilter && passesAdvancedFilter
    })
  }, [ltdClients, filter, selectedUserFilter, selectedWorkflowStageFilter, advancedFilter, session?.user?.id])

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

  // Fix date range calculations to be mutually exclusive
  const next30DaysClients = sortedFilteredClients.filter(client => {
    if (!client.nextAccountsDue) return false
    const dueDate = new Date(client.nextAccountsDue)
    const today = new Date()
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 30 && daysDiff >= 0
  })

  const next60DaysClients = sortedFilteredClients.filter(client => {
    if (!client.nextAccountsDue) return false
    const dueDate = new Date(client.nextAccountsDue)
    const today = new Date()
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 60 && daysDiff > 30 // 31-60 days range
  })

  const next90DaysClients = sortedFilteredClients.filter(client => {
    if (!client.nextAccountsDue) return false
    const dueDate = new Date(client.nextAccountsDue)
    const today = new Date()
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 90 && daysDiff > 60 // 61-90 days range
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Use direct Companies House year end date (next_made_up_to)
  const getYearEndFromAccountingRef = (client: LtdClient) => {
    if (client.nextYearEnd) {
      return new Date(client.nextYearEnd).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short',
        year: 'numeric'
      })
    }
    // This should never happen as Companies House always provides next_made_up_to
    return 'Not available'
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
        id: 'FILED_TO_COMPANIES_HOUSE', 
        date: workflow.filedToCompaniesHouseDate, 
        user: workflow.filedToCompaniesHouseByUserName,
        label: 'Filed to Companies House',
        icon: <Building className="h-4 w-4" />
      },
      { 
        id: 'FILED_TO_HMRC', 
        date: workflow.filedToHMRCDate, 
        user: workflow.filedToHMRCByUserName,
        label: 'Filed to HMRC',
        icon: <FileText className="h-4 w-4" />
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
    if (sortField === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(column)
      setSortOrder('asc')
    }
  }

  const sortClients = (clients: LtdClient[]) => {
    if (!sortField) return clients

    return [...clients].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''

      switch (sortField) {
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

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
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
        {sortField === column ? (
          sortOrder === 'asc' ? 
            <ChevronUp className="h-3 w-3" /> : 
            <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        )}
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
    if (!selectedClient) {
      showToast.error('No client selected')
      return
    }

    // Allow update if either stage is changed OR assignee is changed
    const currentAssigneeId = selectedClient?.ltdCompanyAssignedUser?.id || 'unassigned'
    const hasStageChange = selectedStage && selectedStage !== selectedClient?.currentLtdAccountsWorkflow?.currentStage
    const hasAssigneeChange = selectedAssignee !== currentAssigneeId

    if (!hasStageChange && !hasAssigneeChange) {
      showToast.error('Please select a stage to update or change the assignment')
      return
    }

    // Validate stage transition if there's a stage change
    if (hasStageChange && selectedStage) {
      const currentStage = selectedClient?.currentLtdAccountsWorkflow?.currentStage || null
      const validation = validateStageTransition(currentStage, selectedStage, 'LTD')
      
      if (!validation.isValid) {
        if (validation.isSkipping) {
          // Show skip warning dialog
          setPendingStageChange({
            client: selectedClient,
            targetStage: selectedStage,
            skippedStages: validation.skippedStages
          })
          setShowSkipWarning(true)
          return
        } else {
          showToast.error(validation.message)
          return
        }
      }
    }

    // If FILED_TO_COMPANIES_HOUSE is selected, handle Companies House filing
    if (selectedStage === 'FILED_TO_COMPANIES_HOUSE') {
      setShowFiledCompaniesHouseConfirm(true)
      return
    }

    // If FILED_TO_HMRC is selected, show confirmation dialog
    if (selectedStage === 'FILED_TO_HMRC') {
      setShowFiledHMRCConfirm(true)
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

  // Handle skip warning dialog actions
  const handleSkipWarningClose = () => {
    setShowSkipWarning(false)
    setPendingStageChange(null)
  }

  const handleSkipWarningConfirm = async () => {
    if (!pendingStageChange) return
    
    // Close the skip warning dialog
    setShowSkipWarning(false)
    
    // Proceed with the stage change (bypassing validation)
    await proceedWithStageUpdate()
    
    // Clear pending change
    setPendingStageChange(null)
  }

  // Extracted function to perform the actual stage update
  const proceedWithStageUpdate = async () => {
    if (!selectedClient) return

    // If FILED_TO_COMPANIES_HOUSE is selected, handle Companies House filing
    if (selectedStage === 'FILED_TO_COMPANIES_HOUSE') {
      setShowFiledCompaniesHouseConfirm(true)
      return
    }

    // If FILED_TO_HMRC is selected, show confirmation dialog
    if (selectedStage === 'FILED_TO_HMRC') {
      setShowFiledHMRCConfirm(true)
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

  const handleFiledToCompaniesHouse = async (ignoreWarning: boolean = false) => {
    if (!selectedClient?.currentLtdAccountsWorkflow) {
      showToast.error('No workflow selected')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/clients/ltd-deadlines/${selectedClient.id}/filed-companies-house`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: selectedClient.currentLtdAccountsWorkflow.id,
          confirmFiling: true,
          ignoreCompaniesHouseWarning: ignoreWarning
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Successfully filed to Companies House!')
        setUpdateModalOpen(false)
        setShowFiledCompaniesHouseConfirm(false)
        setCompaniesHouseWarning(null)
        setSelectedStage(undefined)
        setUpdateComments('')
        await fetchLtdClients(true)
      } else if (data.requiresConfirmation && data.warning) {
        // Show Companies House warning
        setCompaniesHouseWarning(data.warning)
      } else {
        showToast.error(data.error || 'Failed to file to Companies House')
      }
    } catch (error) {
      console.error('Error filing to Companies House:', error)
      showToast.error('Failed to file to Companies House')
    } finally {
      setUpdating(false)
    }
  }

  const handleFiledToHMRC = async () => {
    if (!selectedClient?.currentLtdAccountsWorkflow) {
      showToast.error('No workflow selected')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/clients/ltd-deadlines/${selectedClient.id}/filed-hmrc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: selectedClient.currentLtdAccountsWorkflow.id,
          confirmFiling: true
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Check if rollover occurred
        if (data.rollover) {
          // Store rollover info and show modal
          setRolloverInfo(data.rollover)
          setShowRolloverModal(true)
          
          showToast.success('🎉 Filing completed! New workflow created for next year and client dates updated.')
          
          // Log rollover details for debugging
          console.log('🔄 Automatic rollover completed:', {
            newWorkflow: data.rollover.newWorkflow,
            updatedDates: data.rollover.updatedDates
          })
        } else {
          showToast.success('🎉 Filing completed! Workflow marked as completed.')
        }
        
        setUpdateModalOpen(false)
        setShowFiledHMRCConfirm(false)
        setSelectedStage(undefined)
        setUpdateComments('')
        await fetchLtdClients(true)
      } else {
        showToast.error(data.error || 'Failed to file to HMRC')
      }
    } catch (error) {
      console.error('Error filing to HMRC:', error)
      showToast.error('Failed to file to HMRC')
    } finally {
      setUpdating(false)
    }
  }

  const handleViewActivityLog = (client: LtdClient) => {
    setActivityLogClient(client)
    setShowActivityLogModal(true)
  }

  const handleUndoLtdFiling = async (client: LtdClient) => {
    if (!client.currentLtdAccountsWorkflow) return
    
    try {
      setUndoingClientId(client.id)
      
      // Use client ID, not workflow ID
      const response = await fetch(`/api/clients/ltd-deadlines/${client.id}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'SUBMISSION_APPROVED_PARTNER', // Reset to previous stage
          comments: 'Filing undone - workflow reopened for corrections',
          assignedUserId: client.ltdCompanyAssignedUser?.id || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to undo filing')
      }

      const data = await response.json()
      
      if (data.success) {
        showToast.success('Filing undone successfully - workflow reopened')
        await fetchLtdClients(true)
      } else {
        throw new Error(data.error || 'Failed to undo filing')
      }
      
    } catch (error) {
      console.error('Error undoing filing:', error)
      showToast.error('Failed to undo filing. Please try again.')
    } finally {
      setUndoingClientId(null)
    }
  }

  // Handle individual client Companies House refresh
  const handleRefreshCompaniesHouse = async (client: LtdClient) => {
    if (!client.companyNumber) {
      showToast.error('Client has no company number to refresh')
      return
    }

    // Only allow managers and partners
    if (session?.user?.role !== 'MANAGER' && session?.user?.role !== 'PARTNER') {
      showToast.error('Only managers and partners can refresh Companies House data')
      return
    }

    // Set loading state for this specific client
    setRefreshingClientId(client.id)
    
    try {
      showToast.info(`Refreshing Companies House data for ${client.companyName}...`)
      
      const response = await fetch(`/api/clients/${client.id}/refresh-companies-house`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to refresh Companies House data')
      }

      const result = await response.json()
      
      if (result.success) {
        showToast.success(`Successfully refreshed Companies House data for ${client.companyName}`)
        // Refresh the table data to show updated information
        await fetchLtdClients(true)
      } else {
        throw new Error(result.error || 'Failed to refresh Companies House data')
      }
      
    } catch (error) {
      console.error('Error refreshing Companies House data:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to refresh Companies House data')
    } finally {
      setRefreshingClientId(null)
    }
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
      <PageLayout maxWidth="xl">
        <PageHeader 
          title="Ltd Companies Deadlines"
          description="Track and manage filing deadlines for all Limited Company clients"
        >
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
        </PageHeader>
        
        <PageContent>

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
                    <div className="text-2xl font-bold text-red-600">{next30DaysClients.length}</div>
                    <p className="text-xs text-muted-foreground">Due in 0-30 days</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{next60DaysClients.length}</div>
                    <p className="text-xs text-muted-foreground">Due in 31-60 days</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{next90DaysClients.length}</div>
                    <p className="text-xs text-muted-foreground">Due in 61-90 days</p>
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
                      .filter(user => (userClientCounts?.[user.id] || 0) > 0)
                      .sort((a, b) => (userClientCounts?.[b.id] || 0) - (userClientCounts?.[a.id] || 0))
                      .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">({userClientCounts?.[user.id] || 0})</span>
                        </div>
                      </SelectItem>
                    ))}
                    {users
                      .filter(user => (userClientCounts?.[user.id] || 0) === 0)
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

              {/* Workflow Stage Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Label htmlFor="stage-filter" className="text-sm font-medium whitespace-nowrap">
                  Filter by Stage:
                </Label>
                <Select value={selectedWorkflowStageFilter} onValueChange={setSelectedWorkflowStageFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-gray-600" />
                        <span>All Stages</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="not_started">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>Not Started</span>
                      </div>
                    </SelectItem>
                    {WORKFLOW_STAGES.map((stage) => (
                      <SelectItem key={stage.key} value={stage.key}>
                        <div className="flex items-center gap-2">
                          {stage.icon}
                          <span>{stage.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="completed">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Completed</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Advanced Filter Button */}
              <Button
                variant={hasActiveAdvancedFilters() ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAdvancedFilter(true)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Advanced Filters
                {hasActiveAdvancedFilters() && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Active
                  </Badge>
                )}
              </Button>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="border-b">
                        <SortableHeader column="clientCode" className="w-14 col-ltd-client-code text-center">Code</SortableHeader>
                        <SortableHeader column="companyNumber" className="w-16 col-ltd-company-number text-center">Co. No.</SortableHeader>
                        <SortableHeader column="companyName" className="w-40 col-ltd-company-name">Company Name</SortableHeader>
                        <SortableHeader column="yearEnd" className="w-16 col-ltd-year-end text-center">Year End</SortableHeader>
                        <SortableHeader column="accountsDue" className="w-20 col-ltd-accounts-due text-center">Accounts</SortableHeader>
                        <SortableHeader column="ctDue" className="w-16 col-ltd-ct-due text-center">CT600</SortableHeader>
                        <SortableHeader column="csDue" className="w-16 col-ltd-cs-due text-center">CS</SortableHeader>
                        <SortableHeader column="assignedTo" className="w-20 col-ltd-assigned text-center">Assigned</SortableHeader>
                        <SortableHeader column="status" className="w-24 col-ltd-status text-center">Status</SortableHeader>
                        <TableHead className="w-16 col-ltd-update text-center">Update</TableHead>
                        <TableHead className="w-16 col-ltd-action text-center">Actions</TableHead>
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
                          <TableRow className="hover:bg-muted/50 h-10">
                            <TableCell className="font-mono text-xs p-1 text-center">
                              {client.clientCode}
                            </TableCell>
                            <TableCell className="font-mono text-xs p-1 text-center">
                              {client.companyNumber || '—'}
                            </TableCell>
                            <TableCell className="font-medium p-1">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                                  className="max-w-[140px] truncate text-xs hover:text-primary transition-colors cursor-pointer text-left"
                                  title={`View ${client.companyName} details`}
                                >
                                  {client.companyName}
                                </button>
                                <button
                                  onClick={() => handleViewActivityLog(client)}
                                  className="flex items-center gap-1 text-left hover:text-primary transition-colors cursor-pointer group"
                                  title="View Activity Log"
                                >
                                  <Clock className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs p-1 text-center" title="Current accounting year end">
                              {getYearEndFromAccountingRef(client)}
                            </TableCell>
                            <TableCell className="p-1 text-center">
                              <div className="text-xs">
                                <div className="font-medium">{formatDate(client.nextAccountsDue)}</div>
                                {accountsDue && (
                                  <div className={`text-xs ${accountsDue.color}`}>
                                    {accountsDue.label}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-1 text-center">
                              <div className="text-xs">
                                <div className="font-medium">{formatDate(client.nextCorporationTaxDue)}</div>
                                {ctDue && (
                                  <div className={`text-xs ${ctDue.color}`}>
                                    {ctDue.label}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-1 text-center">
                              <div className="text-xs">
                                <div className="font-medium">{formatDate(client.nextConfirmationDue)}</div>
                                {csDue && (
                                  <div className={`text-xs ${csDue.color}`}>
                                    {csDue.label}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-1 text-center">
                              <div className="text-xs">
                                {client.ltdCompanyAssignedUser ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <User className="h-3 w-3 text-blue-600" />
                                    <span className="text-blue-600 font-medium max-w-[60px] truncate" title={client.ltdCompanyAssignedUser.name}>
                                      {client.ltdCompanyAssignedUser.name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">Unassigned</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-1 text-center">
                              <Badge variant="outline" className={`text-xs px-1 py-0 h-5 ${workflowStatus.color}`}>
                                <div className="flex items-center gap-1">
                                  {workflowStatus.icon}
                                  <span className="max-w-[80px] truncate" title={workflowStatus.label}>
                                    {workflowStatus.label.length > 10 ? workflowStatus.label.substring(0, 10) + '...' : workflowStatus.label}
                                  </span>
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell className="p-1 text-center">
                              {client.currentLtdAccountsWorkflow?.isCompleted || 
                               client.currentLtdAccountsWorkflow?.currentStage === 'FILED_TO_HMRC' ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-green-600 font-medium">Complete</span>
                                  <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndoLtdFiling(client)}
                          disabled={undoingClientId === client.id}
                          className="action-trigger-button h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          title="Undo filing (reopen workflow)"
                        >
                          {undoingClientId === client.id ? (
                            <RefreshCw className="action-trigger-icon animate-spin" />
                          ) : (
                            <Undo2 className="action-trigger-icon" />
                          )}
                        </Button>
                                </div>
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
                                  className="flex items-center gap-1 h-6 px-2 text-xs"
                                >
                                  <Plus className="h-3 w-3" />
                                  Update
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="table-actions-cell">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="action-trigger-button">
                                    <Settings className="action-trigger-icon" />
                                    <span className="sr-only">Open menu</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem 
                                    onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleViewActivityLog(client)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Clock className="h-4 w-4" />
                                    View Log
                                  </DropdownMenuItem>
                                  {client.companyNumber && (
                                    <DropdownMenuItem 
                                      onClick={() => handleRefreshCompaniesHouse(client)}
                                      className="flex items-center gap-2 cursor-pointer"
                                      disabled={refreshingClientId === client.id}
                                    >
                                      <RefreshCw className={`h-4 w-4 ${refreshingClientId === client.id ? 'animate-spin' : ''}`} />
                                      {refreshingClientId === client.id ? 'Refreshing...' : 'Refresh CH Data'}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit Client
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const newExpanded = new Set(expandedRows)
                                      if (expandedRows.has(rowKey)) {
                                        newExpanded.delete(rowKey)
                                      } else {
                                        newExpanded.add(rowKey)
                                      }
                                      setExpandedRows(newExpanded)
                                    }}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    {expandedRows.has(rowKey) ? (
                                      <>
                                        <ChevronDown className="h-4 w-4" />
                                        Hide Timeline
                                      </>
                                    ) : (
                                      <>
                                        <ChevronRight className="h-4 w-4" />
                                        Show Timeline
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
        </PageContent>
      </PageLayout>

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
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getWorkflowStatus(selectedClient.currentLtdAccountsWorkflow).color}>
                      {getWorkflowStatus(selectedClient.currentLtdAccountsWorkflow).label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedClient.currentLtdAccountsWorkflow.assignedUser?.name || 
                       selectedClient.ltdCompanyAssignedUser?.name || 'Unassigned'}
                    </span>
                  </div>
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
                    const isCurrentStage = stage.key === selectedClient?.currentLtdAccountsWorkflow?.currentStage
                    
                    return (
                      <SelectItem 
                        key={stage.key} 
                        value={stage.key}
                        className={`
                          ${isCurrentStage ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-l-blue-500 font-medium' : ''}
                          ${isCompletedStage ? 'bg-gray-50 opacity-70 text-gray-500' : ''}
                          ${!isCurrentStage && !isCompletedStage ? 'hover:bg-gray-50' : ''}
                          transition-all duration-200
                        `}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <div className={`
                            ${isCurrentStage ? 'scale-110 text-blue-600' : ''} 
                            ${isCompletedStage ? 'grayscale opacity-60' : ''}
                            transition-all duration-200
                          `}>
                            {stage.icon}
                          </div>
                          <span className={`
                            ${isCurrentStage ? 'font-bold text-blue-800' : ''} 
                            ${isCompletedStage ? 'text-gray-500 line-through' : ''}
                          `}>
                            {stage.label}
                          </span>
                          {isCurrentStage && (
                            <Badge className="ml-auto text-xs bg-blue-600 text-white font-semibold shadow-md animate-pulse">
                              ⚡ CURRENT
                            </Badge>
                          )}
                          {isCompletedStage && !isCurrentStage && (
                            <Badge variant="outline" className="ml-auto text-xs text-gray-400 border-gray-300">
                              ✅ COMPLETED
                            </Badge>
                          )}
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
              disabled={updating}
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
              onClick={() => handleFiledToCompaniesHouse()}
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

      {/* Filed to Companies House Confirmation Dialog */}
      <Dialog open={showFiledCompaniesHouseConfirm} onOpenChange={setShowFiledCompaniesHouseConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Confirm Filing to Companies House
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to mark this workflow as "Filed to Companies House"?
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-800">Companies House Filing</p>
                  <p className="text-xs text-blue-700">
                    This will mark the accounts as filed to Companies House. The system will 
                    check for fresh Companies House data to validate the filing.
                  </p>
                </div>
              </div>
            </div>
            
            {companiesHouseWarning && (
              <div className={`border rounded-lg p-4 ${
                companiesHouseWarning.type === 'FORWARD_DATES' 
                  ? 'bg-green-50 border-green-200' 
                  : companiesHouseWarning.type === 'SAME_DATES'
                  ? 'bg-red-50 border-red-200'
                  : companiesHouseWarning.type === 'BACKWARD_DATES'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-start gap-2">
                  {companiesHouseWarning.type === 'FORWARD_DATES' ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : companiesHouseWarning.type === 'SAME_DATES' ? (
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : companiesHouseWarning.type === 'BACKWARD_DATES' ? (
                    <XCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="space-y-3 flex-1">
                    <div>
                      <p className={`text-sm font-medium ${
                        companiesHouseWarning.type === 'FORWARD_DATES' 
                          ? 'text-green-800' 
                          : companiesHouseWarning.type === 'SAME_DATES'
                          ? 'text-red-800'
                          : companiesHouseWarning.type === 'WORKFLOW_DATES_WRONG'
                          ? 'text-red-800'
                          : companiesHouseWarning.type === 'BACKWARD_DATES'
                          ? 'text-orange-800'
                          : 'text-amber-800'
                      }`}>
                        {companiesHouseWarning.type === 'FORWARD_DATES' 
                          ? '🎉 Filing Successful - New Future Dates Confirmed!' 
                          : companiesHouseWarning.type === 'SAME_DATES'
                          ? '❌ Filing Not Completed - Same Dates'
                          : companiesHouseWarning.type === 'WORKFLOW_DATES_WRONG'
                          ? '❌ Filing Not Completed - Fix Workflow Dates'
                          : companiesHouseWarning.type === 'BACKWARD_DATES'
                          ? '⚠️ Dates Moving Backward - Check Period'
                          : '⚠️ Warning'}
                      </p>
                      <p className={`text-xs mt-1 ${
                        companiesHouseWarning.type === 'FORWARD_DATES' 
                          ? 'text-green-700' 
                          : companiesHouseWarning.type === 'SAME_DATES'
                          ? 'text-red-700'
                          : companiesHouseWarning.type === 'WORKFLOW_DATES_WRONG'
                          ? 'text-red-700'
                          : companiesHouseWarning.type === 'BACKWARD_DATES'
                          ? 'text-orange-700'
                          : 'text-amber-700'
                      }`}>
                        {companiesHouseWarning.message}
                      </p>
                    </div>
                    
                    {/* Enhanced Date Comparison Table */}
                    <div className="bg-white rounded border">
                      <div className="text-xs font-medium text-center py-2 bg-gray-100 border-b">
                        📊 Date Comparison Analysis
                      </div>
                      <div className="grid grid-cols-4 text-xs font-medium border-b bg-gray-50">
                        <div className="p-2 border-r">Field</div>
                        <div className="p-2 border-r">Current Workflow</div>
                        <div className="p-2 border-r">Companies House</div>
                        <div className="p-2">Direction</div>
                      </div>
                      <div className="grid grid-cols-4 text-xs border-b">
                        <div className="p-2 border-r font-medium">Year End</div>
                        <div className="p-2 border-r font-mono">{companiesHouseWarning.currentData.yearEnd}</div>
                        <div className={`p-2 border-r font-mono ${
                          companiesHouseWarning.currentData.yearEnd !== companiesHouseWarning.companiesHouseData.yearEnd
                            ? companiesHouseWarning.type === 'FORWARD_DATES'
                              ? 'font-bold text-green-700 bg-green-50'
                              : companiesHouseWarning.type === 'BACKWARD_DATES'
                              ? 'font-bold text-orange-700 bg-orange-50'
                              : 'font-bold text-blue-700 bg-blue-50'
                            : ''
                        }`}>
                          {companiesHouseWarning.companiesHouseData.yearEnd}
                        </div>
                        <div className="p-2 text-center">
                          {companiesHouseWarning.currentData.yearEnd !== companiesHouseWarning.companiesHouseData.yearEnd ? (
                            companiesHouseWarning.type === 'FORWARD_DATES' ? (
                              <span className="text-green-600 font-bold">📈 Forward</span>
                            ) : companiesHouseWarning.type === 'BACKWARD_DATES' ? (
                              <span className="text-orange-600 font-bold">📉 Backward</span>
                            ) : (
                              <span className="text-blue-600 font-bold">🔄 Changed</span>
                            )
                          ) : (
                            <span className="text-gray-500">➖ Same</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 text-xs">
                        <div className="p-2 border-r font-medium">Accounts Due</div>
                        <div className="p-2 border-r font-mono">{companiesHouseWarning.currentData.accountsDue}</div>
                        <div className={`p-2 border-r font-mono ${
                          companiesHouseWarning.currentData.accountsDue !== companiesHouseWarning.companiesHouseData.accountsDue
                            ? companiesHouseWarning.type === 'FORWARD_DATES'
                              ? 'font-bold text-green-700 bg-green-50'
                              : companiesHouseWarning.type === 'BACKWARD_DATES'
                              ? 'font-bold text-orange-700 bg-orange-50'
                              : 'font-bold text-blue-700 bg-blue-50'
                            : ''
                        }`}>
                          {companiesHouseWarning.companiesHouseData.accountsDue}
                        </div>
                        <div className="p-2 text-center">
                          {companiesHouseWarning.currentData.accountsDue !== companiesHouseWarning.companiesHouseData.accountsDue ? (
                            companiesHouseWarning.type === 'FORWARD_DATES' ? (
                              <span className="text-green-600 font-bold">📈 Forward</span>
                            ) : companiesHouseWarning.type === 'BACKWARD_DATES' ? (
                              <span className="text-orange-600 font-bold">📉 Backward</span>
                            ) : (
                              <span className="text-blue-600 font-bold">🔄 Changed</span>
                            )
                          ) : (
                            <span className="text-gray-500">➖ Same</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Additional context for forward dates */}
                    {companiesHouseWarning.type === 'FORWARD_DATES' && (
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-xs text-green-700">
                          <strong>✅ Confirmed:</strong> The dates have moved forward, indicating that Companies House has processed your filing and assigned new deadlines for the next accounting period.
                        </p>
                      </div>
                    )}
                    
                    {/* Additional context for backward dates */}
                    {companiesHouseWarning.type === 'BACKWARD_DATES' && (
                      <div className="bg-orange-50 border border-orange-200 rounded p-2">
                        <p className="text-xs text-orange-700">
                          <strong>⚠️ Attention:</strong> Companies House shows older dates than your current workflow. This could mean you're looking at data from a previous period, or there may be an issue with the filing.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowFiledCompaniesHouseConfirm(false)
                setCompaniesHouseWarning(null)
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            {/* Show proceed button only for warnings that allow it */}
            {companiesHouseWarning && companiesHouseWarning.canProceed && (
              <Button 
                onClick={() => handleFiledToCompaniesHouse(true)}
                disabled={updating}
                className={`${
                  companiesHouseWarning.type === 'FORWARD_DATES' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {updating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Filing...
                  </>
                ) : (
                  companiesHouseWarning.type === 'FORWARD_DATES' ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Filing Success
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Proceed Despite Warning
                    </>
                  )
                )}
              </Button>
            )}
            
            {/* Show disabled button for cases that don't allow proceeding */}
            {companiesHouseWarning && !companiesHouseWarning.canProceed && (
              <Button 
                disabled={true}
                className="bg-gray-400 cursor-not-allowed"
              >
                {companiesHouseWarning.type === 'SAME_DATES' ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cannot Proceed - Filing Not Done
                  </>
                ) : companiesHouseWarning.type === 'WORKFLOW_DATES_WRONG' ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cannot Proceed - Fix Workflow First
                  </>
                ) : companiesHouseWarning.type === 'BACKWARD_DATES' ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cannot Proceed - Check Dates
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cannot Proceed
                  </>
                )}
              </Button>
            )}
            
            {/* Default confirm button when no warning */}
            {!companiesHouseWarning && (
              <Button 
                onClick={() => handleFiledToCompaniesHouse()}
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Filing...
                  </>
                ) : (
                  'Confirm Filing'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filed to HMRC Confirmation Dialog */}
      <Dialog open={showFiledHMRCConfirm} onOpenChange={setShowFiledHMRCConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-600" />
              Confirm Filing to HMRC
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to mark this workflow as "Filed to HMRC"?
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-800">Final Filing Step</p>
                  <p className="text-xs text-green-700">
                    This will complete the workflow and mark it as fully filed. The system will automatically:
                  </p>
                  <ul className="text-xs text-green-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Mark this workflow as completed (historical data)</li>
                    <li>Fetch fresh Companies House data for updated deadlines</li>
                    <li>Create a new workflow for the next accounting year</li>
                    <li>Assign the new workflow to the default user</li>
                    <li>Set the new workflow status to "Waiting for Year End"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowFiledHMRCConfirm(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFiledToHMRC}
              disabled={updating}
              className="bg-green-600 hover:bg-green-700"
            >
              {updating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Completing & Rolling Over...
                </>
              ) : (
                'Complete Filing & Rollover'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Skip Warning Dialog */}
      {pendingStageChange && (
        <WorkflowSkipWarningDialog
          isOpen={showSkipWarning}
          onClose={handleSkipWarningClose}
          onConfirm={handleSkipWarningConfirm}
          workflowType="LTD"
          currentStage={pendingStageChange.client.currentLtdAccountsWorkflow?.currentStage || ''}
          targetStage={pendingStageChange.targetStage}
          skippedStages={pendingStageChange.skippedStages}
          clientName={pendingStageChange.client.companyName}
        />
      )}

      {/* Advanced Filter Modal */}
      <AdvancedFilterModal
        isOpen={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
        onApplyFilters={handleApplyAdvancedFilters}
        currentFilter={advancedFilter}
        users={users}
        tableType="ltd"
      />

      {/* Rollover Information Modal */}
      <Dialog open={showRolloverModal} onOpenChange={setShowRolloverModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Rollover Completed Successfully
            </DialogTitle>
            <DialogDescription>
              New workflow created for next year and client dates updated with latest Companies House data.
            </DialogDescription>
          </DialogHeader>
          {rolloverInfo && (
            <div className="space-y-4">
              {/* New Workflow Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">New Workflow Created</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700">Filing Period:</span>
                    <span className="text-xs font-medium text-blue-800">
                      {formatDate(rolloverInfo.newWorkflow.filingPeriodStart)} - {formatDate(rolloverInfo.newWorkflow.filingPeriodEnd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700">Status:</span>
                    <Badge variant="outline" className="text-xs">
                      {rolloverInfo.newWorkflow.currentStage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700">Assigned To:</span>
                    <span className="text-xs font-medium text-blue-800">
                      {rolloverInfo.newWorkflow.assignedUserId ? 
                        users.find(user => user.id === rolloverInfo.newWorkflow.assignedUserId)?.name || 'Unknown User' : 
                        'Unassigned'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Updated Dates Information */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Updated Deadlines</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700">Year End:</span>
                    <span className="text-xs font-medium text-green-800">
                      {formatDate(rolloverInfo.updatedDates.yearEnd)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700">Accounts Due:</span>
                    <span className="text-xs font-medium text-green-800">
                      {formatDate(rolloverInfo.updatedDates.accountsDue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700">Corporation Tax Due:</span>
                    <span className="text-xs font-medium text-green-800">
                      {formatDate(rolloverInfo.updatedDates.ctDue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-green-700">Confirmation Due:</span>
                    <span className="text-xs font-medium text-green-800">
                      {formatDate(rolloverInfo.updatedDates.confirmationDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              onClick={() => {
                setShowRolloverModal(false)
                setRolloverInfo(null)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Got it!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 