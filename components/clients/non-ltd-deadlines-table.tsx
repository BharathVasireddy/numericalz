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
import { Checkbox } from '@/components/ui/checkbox'
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
  Search,
  AlertTriangle,
  Mail
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { ActivityLogViewer } from '@/components/activity/activity-log-viewer'
import { AdvancedFilterModal } from './advanced-filter-modal'
import { WorkflowSkipWarningDialog } from '@/components/ui/workflow-skip-warning-dialog'
import { validateStageTransition, getSelectableStages } from '@/lib/workflow-validation'
import { SendEmailModal } from './send-email-modal'
import { DeadlinesBulkOperations } from './deadlines-bulk-operations'


interface NonLtdAccountsWorkflow {
  id: string
  yearEndDate: string
  filingDueDate: string
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
  filedToHMRCDate?: string
  filedToHMRCByUserName?: string
}

interface NonLtdClient {
  id: string
  clientCode: string
  companyName: string
  companyType?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  
  // Non-Ltd specific assignee
  nonLtdCompanyAssignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  
  // General assignment fallback
  assignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  
  // Current Non-Ltd workflow info
  currentNonLtdAccountsWorkflow?: NonLtdAccountsWorkflow | null
}

interface WorkflowStage {
  key: string
  label: string
  icon: React.ReactNode
  color: string
}



// All workflow stages for display purposes (Non-Ltd companies only file to HMRC, not Companies House)
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
  { key: 'FILED_TO_HMRC', label: 'Filed to HMRC', icon: <FileText className="h-4 w-4" />, color: 'bg-green-100 text-green-800' }
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

interface NonLtdDeadlinesTableProps {
  focusClientId?: string
  focusWorkflowId?: string
}

export function NonLtdDeadlinesTable({ 
  focusClientId, 
  focusWorkflowId 
}: NonLtdDeadlinesTableProps = {}) {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize filter state from URL parameters
  const getInitialFilter = () => {
    const filterParam = searchParams.get('filter')
    if (filterParam === 'unassigned') {
      return { filter: 'all' as const, userFilter: 'unassigned' }
    }
    if (filterParam === 'all') {
      return { filter: 'all' as const, userFilter: 'all' }
    }
    // Default to "assigned_to_me" instead of "all"
    return { filter: 'assigned_to_me' as const, userFilter: 'all' }
  }
  
  const initialFilterState = getInitialFilter()
  
  const [nonLtdClients, setNonLtdClients] = useState<NonLtdClient[]>([])
  const [loading, setLoading] = useState(true)
  
  // Use centralized user fetching hook
  const { users, loading: usersLoading, error: usersError } = useUsers()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<NonLtdClient | null>(null)
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('unassigned')
  const [updateComments, setUpdateComments] = useState('')
  const [updating, setUpdating] = useState(false)
  const [sortField, setSortField] = useState<string>('accountsDue')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [showClientSelfFilingConfirm, setShowClientSelfFilingConfirm] = useState(false)
  const [showFiledHMRCConfirm, setShowFiledHMRCConfirm] = useState(false)
  const [showBackwardStageConfirm, setShowBackwardStageConfirm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'assigned_to_me'>(initialFilterState.filter)
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(initialFilterState.userFilter)
  const [selectedWorkflowStageFilter, setSelectedWorkflowStageFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [refreshingClientId, setRefreshingClientId] = useState<string | null>(null)
  const [undoingClientId, setUndoingClientId] = useState<string | null>(null)
  const [showActivityLogModal, setShowActivityLogModal] = useState(false)
  const [activityLogClient, setActivityLogClient] = useState<NonLtdClient | null>(null)
  
  // Email modal state
  const [sendEmailModalOpen, setSendEmailModalOpen] = useState(false)
  const [emailClient, setEmailClient] = useState<NonLtdClient | null>(null)
  
  // Advanced filter state
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter | null>(null)
  
  // Bulk operations state
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  
  // Workflow skip validation states
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const [pendingStageChange, setPendingStageChange] = useState<{
    client: NonLtdClient
    targetStage: string
    skippedStages: string[]
  } | null>(null)

  // State for rollover information display
  const [rolloverInfo, setRolloverInfo] = useState<{
    newWorkflow: {
      id: string
      yearEndDate: string
      filingDueDate: string
      currentStage: string
      assignedUserId: string | null
    }
    updatedDates: {
      yearEnd: string
      filingDue: string
    }
  } | null>(null)
  const [showRolloverModal, setShowRolloverModal] = useState(false)

  // Get current month for header stats
  const currentMonth = new Date().getMonth() + 1
  const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' })

  // PERFORMANCE OPTIMIZATION: Add pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 50 // Optimized page size
  })

  const fetchNonLtdClients = useCallback(async (forceRefresh: boolean = false, page: number = 1) => {
    try {
      console.log('Starting fetch...') // Debug log
      setLoading(true)
      
      // PERFORMANCE: Build optimized API call with pagination and filters
      const params = new URLSearchParams()
      params.append('page', page.toString())
      params.append('limit', pagination.pageSize.toString())
      
      // FIX: Apply assigned filter for ALL user roles, not just staff
      if (filter === 'assigned_to_me') {
        params.append('assignedFilter', 'assigned_to_me')
      } else {
        params.append('assignedFilter', 'all')
      }
      
      if (forceRefresh) {
        params.append('_t', Date.now().toString())
      }
      
      const url = `/api/clients/non-ltd-deadlines?${params.toString()}`
      
      const response = await fetch(url, {
        // PERFORMANCE: Use smart caching - API handles cache headers
        method: 'GET',
        ...(forceRefresh && { 
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch non-Ltd companies')
      }
      
      const data = await response.json()
      
      console.log('API Response:', data) // Debug log
      
      if (data.success) {
        console.log('Setting clients:', data.clients) // Debug log
        setNonLtdClients(data.clients || [])
        
        // Update pagination info
        if (data.pagination) {
          setPagination({
            currentPage: data.pagination.currentPage,
            totalPages: data.pagination.totalPages,
            totalCount: data.pagination.totalCount,
            pageSize: data.pagination.pageSize
          })
        }
      } else {
        throw new Error(data.error || 'Failed to fetch non-Ltd companies')
      }
      
    } catch (error) {
              console.error('Error fetching non-Ltd companies:', error)
      showToast.error('Failed to fetch non-Ltd companies data')
    } finally {
      setLoading(false)
    }
  }, [pagination.pageSize, filter])

  useEffect(() => {
    fetchNonLtdClients(false, 1) // Always start from page 1 when filters change
  }, [filter, selectedUserFilter]) // Removed fetchNonLtdClients dependency to prevent infinite loops

  // Pagination handlers
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchNonLtdClients(false, newPage)
    }
  }, [fetchNonLtdClients, pagination.totalPages])

  const handlePreviousPage = useCallback(() => {
    if (pagination.currentPage > 1) {
      handlePageChange(pagination.currentPage - 1)
    }
  }, [pagination.currentPage, handlePageChange])

  const handleNextPage = useCallback(() => {
    if (pagination.currentPage < pagination.totalPages) {
      handlePageChange(pagination.currentPage + 1)
    }
  }, [pagination.currentPage, pagination.totalPages, handlePageChange])



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

  // Bulk operations handlers
  const handleSelectClient = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClients(prev => [...prev, clientId])
    } else {
      setSelectedClients(prev => prev.filter(id => id !== clientId))
    }
  }

  const handleSelectAllClients = (checked: boolean) => {
    if (checked) {
      // Select ALL visible clients regardless of workflow status
      const allVisibleClients = sortedFilteredClients.map(client => client.id)
      setSelectedClients(allVisibleClients)
    } else {
      setSelectedClients([])
    }
  }

  const handleClearSelection = () => {
    setSelectedClients([])
  }

  // PERFORMANCE OPTIMIZATION: Client-side filtering for current page only
  // Server handles major filtering (assigned/role-based), client handles search/stage filtering
  const filteredClients = useMemo(() => {
    return nonLtdClients.filter(client => {
      // Search filter (client-side for instant feedback)
      let passesSearchFilter = true
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase()
        passesSearchFilter = (
          client.clientCode.toLowerCase().includes(searchLower) ||
          client.companyName.toLowerCase().includes(searchLower)
        )
      }
      
      // User filter (client-side refinement)
      let passesUserFilter = true
      if (selectedUserFilter !== 'all') {
        if (selectedUserFilter === 'unassigned') {
          passesUserFilter = !client.nonLtdCompanyAssignedUser?.id && !client.assignedUser?.id
        } else {
          passesUserFilter = client.nonLtdCompanyAssignedUser?.id === selectedUserFilter || client.assignedUser?.id === selectedUserFilter
        }
      }
      
      // Workflow stage filter (client-side)
      let passesWorkflowFilter = true
      if (selectedWorkflowStageFilter !== 'all') {
        passesWorkflowFilter = client.currentNonLtdAccountsWorkflow?.currentStage === selectedWorkflowStageFilter
      }

      return passesSearchFilter && passesUserFilter && passesWorkflowFilter
    })
  }, [nonLtdClients, searchTerm, selectedUserFilter, selectedWorkflowStageFilter])

  // Calculate client counts per user for filter display
  const userClientCounts = users.reduce((acc, user) => {
    const clientCount = nonLtdClients.filter(client => 
      client.nonLtdCompanyAssignedUser?.id === user.id ||
      client.assignedUser?.id === user.id ||
      client.currentNonLtdAccountsWorkflow?.assignedUser?.id === user.id
    ).length
    acc[user.id] = clientCount
    return acc
  }, {} as Record<string, number>)

  // Count unassigned clients
  const unassignedCount = nonLtdClients.filter(client => 
    !client.nonLtdCompanyAssignedUser?.id && !client.assignedUser?.id && !client.currentNonLtdAccountsWorkflow?.assignedUser?.id
  ).length

  const sortedFilteredClients = filteredClients
    .sort((a, b) => {
      // Sort by filingDueDate (soonest first)
      const aFilingDue = a.currentNonLtdAccountsWorkflow?.filingDueDate
      const bFilingDue = b.currentNonLtdAccountsWorkflow?.filingDueDate
      
      if (!aFilingDue && !bFilingDue) return 0
      if (!aFilingDue) return 1  // No due date goes to end
      if (!bFilingDue) return -1 // No due date goes to end
      
      const dateA = new Date(aFilingDue).getTime()
      const dateB = new Date(bFilingDue).getTime()
      return dateA - dateB // Ascending order (soonest first)
    })

  // Calculate header stats for current filing month
  const currentMonthClients = sortedFilteredClients.filter(client => {
    const filingDue = client.currentNonLtdAccountsWorkflow?.filingDueDate
    if (!filingDue) return false
    const dueDate = new Date(filingDue)
    const currentMonth = new Date().getMonth() + 1
    return dueDate.getMonth() + 1 === currentMonth
  })

  // Fix date range calculations to be mutually exclusive
  const next30DaysClients = sortedFilteredClients.filter(client => {
    const filingDue = client.currentNonLtdAccountsWorkflow?.filingDueDate
    if (!filingDue) return false
    const dueDate = new Date(filingDue)
    const today = new Date()
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 30 && daysDiff >= 0
  })

  const next60DaysClients = sortedFilteredClients.filter(client => {
    const filingDue = client.currentNonLtdAccountsWorkflow?.filingDueDate
    if (!filingDue) return false
    const dueDate = new Date(filingDue)
    const today = new Date()
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 60 && daysDiff > 30 // 31-60 days range
  })

  const next90DaysClients = sortedFilteredClients.filter(client => {
    const filingDue = client.currentNonLtdAccountsWorkflow?.filingDueDate
    if (!filingDue) return false
    const dueDate = new Date(filingDue)
    const today = new Date()
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff <= 90 && daysDiff > 60 // 61-90 days range
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return '—'
    }
  }

  // Non-Ltd companies have fixed year end of April 5th
  const getYearEndFromAccountingRef = (client: NonLtdClient) => {
    if (client.currentNonLtdAccountsWorkflow?.yearEndDate) {
      return new Date(client.currentNonLtdAccountsWorkflow.yearEndDate).toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short',
        year: 'numeric'
      })
    }
    return 'Not available'
  }

  const getDaysUntilDue = (dueDateString?: string, workflow?: NonLtdAccountsWorkflow | null) => {
    if (!dueDateString) return null
    
    // Check if workflow is completed - completed workflows should never show as overdue
    if (workflow?.isCompleted || workflow?.currentStage === 'FILED_TO_HMRC' || workflow?.currentStage === 'CLIENT_SELF_FILING' || workflow?.filedToHMRCDate) {
      return { 
        label: 'Completed', 
        color: 'text-green-600' 
      }
    }
    
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

  const isRecentlyFiled = (workflow: NonLtdAccountsWorkflow | null) => {
    if (!workflow?.filedToHMRCDate || !workflow.isCompleted) return false
    const filedDate = new Date(workflow.filedToHMRCDate)
    const today = new Date()
    const daysSinceFiled = Math.ceil((today.getTime() - filedDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceFiled <= 30 // Filed within last 30 days
  }

  const renderLtdWorkflowTimeline = (client: NonLtdClient) => {
    const workflow = client.currentNonLtdAccountsWorkflow
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
        label: 'Manager Review',
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
        id: 'REVIEW_DONE_HELLO_SIGN', 
        date: workflow.reviewCompletedDate, 
        user: workflow.reviewCompletedByUserName,
        label: 'Review Complete',
        icon: <CheckCircle className="h-4 w-4" />
      },
      { 
        id: 'SENT_TO_CLIENT_HELLO_SIGN', 
        date: workflow.sentToClientDate, 
        user: workflow.sentToClientByUserName,
        label: 'Sent to Client',
        icon: <Send className="h-4 w-4" />
      },
      { 
        id: 'APPROVED_BY_CLIENT', 
        date: workflow.clientApprovedDate, 
        user: workflow.clientApprovedByUserName,
        label: 'Client Approved',
        icon: <UserCheck className="h-4 w-4" />
      },
      { 
        id: 'SUBMISSION_APPROVED_PARTNER', 
        date: workflow.partnerApprovedDate, 
        user: workflow.partnerApprovedByUserName,
        label: 'Partner Approved',
        icon: <CheckCircle className="h-4 w-4" />
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

  const getWorkflowStatus = (workflow: NonLtdAccountsWorkflow | null) => {
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

    // Use ALL_WORKFLOW_STAGES for proper stage lookup including excluded stages
    const stage = ALL_WORKFLOW_STAGES.find(s => s.key === workflow.currentStage)
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

  const sortClients = (clients: NonLtdClient[]) => {
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
          aVal = a.companyName || ''
          bVal = b.companyName || ''
          break
        case 'companyName':
          aVal = a.companyName
          bVal = b.companyName
          break
        case 'yearEnd':
          aVal = new Date(a.currentNonLtdAccountsWorkflow?.yearEndDate || 0)
          bVal = new Date(b.currentNonLtdAccountsWorkflow?.yearEndDate || 0)
          break
        case 'accountsDue':
          aVal = new Date(a.currentNonLtdAccountsWorkflow?.filingDueDate || 0)
          bVal = new Date(b.currentNonLtdAccountsWorkflow?.filingDueDate || 0)
          break
        case 'assignedTo':
          aVal = a.nonLtdCompanyAssignedUser?.name || a.assignedUser?.name || ''
          bVal = b.nonLtdCompanyAssignedUser?.name || b.assignedUser?.name || ''
          break
        case 'status':
          aVal = getWorkflowStatus(a.currentNonLtdAccountsWorkflow || null).label
          bVal = getWorkflowStatus(b.currentNonLtdAccountsWorkflow || null).label
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
    if (!selectedClient?.currentNonLtdAccountsWorkflow?.currentStage) {
      setSelectedStage(stageKey)
      return
    }

    // Use ALL_WORKFLOW_STAGES for proper stage index comparison
    const currentStageIndex = ALL_WORKFLOW_STAGES.findIndex(s => s.key === selectedClient.currentNonLtdAccountsWorkflow?.currentStage)
    const newStageIndex = ALL_WORKFLOW_STAGES.findIndex(s => s.key === stageKey)
    
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

    // Allow assignment-only changes (no stage required)
    const hasStageChange = selectedStage && selectedStage !== selectedClient.currentNonLtdAccountsWorkflow?.currentStage
    const hasAssignmentChange = selectedAssignee !== (selectedClient.currentNonLtdAccountsWorkflow?.assignedUser?.id || selectedClient.nonLtdCompanyAssignedUser?.id || 'unassigned')
    
    if (!hasStageChange && !hasAssignmentChange && !updateComments.trim()) {
      showToast.error('Please select a stage to update to, change the assignment, or add comments')
      return
    }

    // If FILED_TO_HMRC is selected, show confirmation dialog
    if (selectedStage === 'FILED_TO_HMRC') {
      setShowFiledHMRCConfirm(true)
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/clients/non-ltd-deadlines/${selectedClient.id}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(hasStageChange && { currentStage: selectedStage }), // Only include stage if it's actually changing
          assignedUserId: selectedAssignee === 'unassigned' ? null : selectedAssignee,
          notes: updateComments
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Workflow updated successfully')
        setUpdateModalOpen(false)
        setSelectedStage('')
        setUpdateComments('')
        await fetchNonLtdClients(true, pagination.currentPage)
      } else {
        // Check if this is a stage validation error that requires skip warning
        if (data.requiresSkipWarning) {
          setPendingStageChange({
            client: selectedClient,
            targetStage: selectedStage,
            skippedStages: data.skippedStages || [] // FIXED: Use skippedStages instead of allowedStages
          })
          setShowSkipWarning(true)
        } else {
          showToast.error(data.error || 'Failed to update workflow')
        }
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

    // If FILED_TO_HMRC is selected, show confirmation dialog
    if (selectedStage === 'FILED_TO_HMRC') {
      setShowFiledHMRCConfirm(true)
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/clients/non-ltd-deadlines/${selectedClient.id}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(selectedStage && { currentStage: selectedStage }), // Only include stage if provided
          assignedUserId: selectedAssignee === 'unassigned' ? null : selectedAssignee,
          notes: updateComments,
          skipWarning: true // Bypass stage validation
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Workflow updated successfully')
        setUpdateModalOpen(false)
        setSelectedStage('')
        setUpdateComments('')
        await fetchNonLtdClients(true, pagination.currentPage)
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
      const response = await fetch(`/api/clients/non-ltd-deadlines/${selectedClient.id}/self-filing`, {
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
        await fetchNonLtdClients(true, pagination.currentPage)
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



  const handleFiledToHMRC = async () => {
    if (!selectedClient?.currentNonLtdAccountsWorkflow) {
      showToast.error('No workflow selected')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/clients/non-ltd-deadlines/${selectedClient.id}/filed-hmrc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: selectedClient.currentNonLtdAccountsWorkflow.id,
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
          
          // 🎯 NEW: Show congratulatory message with filing due date
          if (data.congratulatory && data.rollover.newFilingDueDate) {
            showToast.success(
              `🎉 Congratulations! HMRC filing completed!\n\n` +
              `📅 New filing due: ${data.rollover.newFilingDueDate.formatted}\n` +
              `(for year end: ${data.rollover.newFilingDueDate.yearEnd})`
            )
          } else {
            showToast.success('🎉 Filing completed! New workflow created for next year.')
          }
          
          // Log rollover details for debugging
          console.log('🔄 Automatic rollover completed:', {
            newWorkflow: data.rollover.newWorkflow,
            updatedDates: data.rollover.updatedDates,
            newFilingDueDate: data.rollover.newFilingDueDate
          })
        } else {
          showToast.success(data.congratulatory ? '🎉 Congratulations! HMRC filing completed!' : '🎉 Filing completed! Workflow marked as completed.')
        }
        
        setUpdateModalOpen(false)
        setShowFiledHMRCConfirm(false)
        setSelectedStage('')
        setUpdateComments('')
        await fetchNonLtdClients(true, pagination.currentPage)
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

  const handleViewActivityLog = (client: NonLtdClient) => {
    setActivityLogClient(client)
    setShowActivityLogModal(true)
  }

  const handleUndoLtdFiling = async (client: NonLtdClient) => {
    if (!client.currentNonLtdAccountsWorkflow) return
    
    try {
      setUndoingClientId(client.id)
      
      // DEBUG: Log the request details
      console.log('🔄 Undo filing request:', {
        clientId: client.id,
        clientName: client.companyName,
        workflowId: client.currentNonLtdAccountsWorkflow.id,
        url: `/api/clients/non-ltd-deadlines/${client.id}/workflow`
      })
      
      // Use client ID, not workflow ID
      const response = await fetch(`/api/clients/non-ltd-deadlines/${client.id}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentStage: 'SUBMISSION_APPROVED_PARTNER', // Reset to previous stage
          notes: 'Filing undone - workflow reopened for corrections',
          assignedUserId: client.nonLtdCompanyAssignedUser?.id || null,
          skipWarning: true // Bypass validation for undo operations
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to undo filing')
      }

      const data = await response.json()
      
      if (data.success) {
        showToast.success('Filing undone successfully - workflow reopened')
        await fetchNonLtdClients(true, pagination.currentPage)
      } else {
        showToast.error(data.error || 'Failed to undo filing')
      }
    } catch (error) {
      console.error('Error undoing filing:', error)
      showToast.error('Failed to undo filing')
    } finally {
      setUndoingClientId(null)
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
                Loading non-Ltd companies deadlines...
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
          title="Non-Ltd Companies Deadlines"
          description="Track and manage filing deadlines for all non-Limited Company clients"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNonLtdClients(true, 1)}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </PageHeader>
        
        <PageContent>



            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 md:left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by client code, company name, or number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 md:pl-14"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

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
                        <span>All Users ({nonLtdClients.length})</span>
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

            {/* Bulk Operations */}
            <DeadlinesBulkOperations
              selectedItems={selectedClients}
              users={users}
              onClearSelection={handleClearSelection}
              onRefreshData={() => fetchNonLtdClients(true)}
              type="non-ltd"
            />

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="border-b">
                        {/* Bulk selection checkbox column - only for managers and partners */}
                        {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
                          <TableHead className="w-12 p-2 text-center">
                            <Checkbox
                              checked={selectedClients.length > 0 && selectedClients.length === sortedFilteredClients.length}
                              onCheckedChange={(checked) => handleSelectAllClients(checked as boolean)}
                              aria-label="Select all Ltd company clients"
                            />
                          </TableHead>
                        )}
                        <SortableHeader column="clientCode" className="w-14 col-ltd-client-code text-center">Code</SortableHeader>
                        <SortableHeader column="companyName" className="w-40 col-ltd-company-name">Company Name</SortableHeader>
                        <SortableHeader column="yearEnd" className="w-16 col-ltd-year-end text-center">Year End</SortableHeader>
                        <SortableHeader column="accountsDue" className="w-20 col-ltd-accounts-due text-center">Accounts</SortableHeader>
                        <SortableHeader column="assignedTo" className="w-20 col-ltd-assigned text-center">Assigned</SortableHeader>
                        <SortableHeader column="status" className="w-24 col-ltd-status text-center">Status</SortableHeader>
                        <TableHead className="w-16 col-ltd-update text-center">Update</TableHead>
                        <TableHead className="w-16 col-ltd-action text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody className="table-compact">
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') ? 9 : 8} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                          Loading non-Ltd companies...
                        </TableCell>
                      </TableRow>
                    ) : sortedFilteredClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') ? 9 : 8} className="text-center py-8">
                          <div className="space-y-2">
                            <Building className="h-12 w-12 mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground">No non-Ltd companies found</p>
                            <p className="text-xs text-muted-foreground">
                              {filter === 'assigned_to_me' ? 'No non-Ltd companies assigned to you' : 'No non-Limited Company clients in the system'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortClients(sortedFilteredClients).map((client) => {
                      const workflowStatus = getWorkflowStatus(client.currentNonLtdAccountsWorkflow || null)
                      const accountsDue = getDaysUntilDue(client.currentNonLtdAccountsWorkflow?.filingDueDate, client.currentNonLtdAccountsWorkflow)
                      const rowKey = client.id
                      
                      return (
                        <React.Fragment key={client.id}>
                          {/* Main Row */}
                          <TableRow className="hover:bg-muted/50 h-10">
                            {/* Bulk selection checkbox - only for managers and partners */}
                            {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
                              <TableCell className="p-2 text-center">
                                <Checkbox
                                  checked={selectedClients.includes(client.id)}
                                  onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                                  aria-label={`Select ${client.companyName}`}
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-mono text-xs p-1 text-center">
                              {client.clientCode}
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
                                <div className="font-medium">{formatDate(client.currentNonLtdAccountsWorkflow?.filingDueDate)}</div>
                                {accountsDue && (
                                  <div className={`text-xs ${accountsDue.color}`}>
                                    {accountsDue.label}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="p-1 text-center">
                              <div className="text-xs">
                                {/* 🎯 CRITICAL FIX: Prioritize workflow-level assignment over client-level assignment */}
                                {client.currentNonLtdAccountsWorkflow?.assignedUser || client.nonLtdCompanyAssignedUser ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <User className="h-3 w-3 text-blue-600" />
                                    <span className="text-blue-600 font-medium max-w-[60px] truncate" title={
                                      client.currentNonLtdAccountsWorkflow?.assignedUser?.name || 
                                      client.nonLtdCompanyAssignedUser?.name
                                    }>
                                      {client.currentNonLtdAccountsWorkflow?.assignedUser?.name || 
                                       client.nonLtdCompanyAssignedUser?.name}
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
                              {client.currentNonLtdAccountsWorkflow?.isCompleted || 
                               client.currentNonLtdAccountsWorkflow?.currentStage === 'FILED_TO_HMRC' ? (
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
                                    setSelectedStage('')
                                    setSelectedAssignee(
                                      client.currentNonLtdAccountsWorkflow?.assignedUser?.id || 
                                      client.nonLtdCompanyAssignedUser?.id || 
                                      'unassigned'
                                    )
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

                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setEmailClient(client)
                                      setSendEmailModalOpen(true)
                                    }}
                                    className="flex items-center gap-2 cursor-pointer"
                                    disabled={!client.contactEmail}
                                  >
                                    <Mail className="h-4 w-4" />
                                    Send Mail
                                  </DropdownMenuItem>
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
                              <TableCell colSpan={(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') ? 9 : 8} className="p-0">
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
                
                {/* PERFORMANCE OPTIMIZATION: Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
                        {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount)} of{' '}
                        {pagination.totalCount} non-Ltd companies
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={pagination.currentPage === 1 || loading}
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {/* Show page numbers */}
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1
                          } else {
                            // Smart page number display
                            if (pagination.currentPage <= 3) {
                              pageNum = i + 1
                            } else if (pagination.currentPage >= pagination.totalPages - 2) {
                              pageNum = pagination.totalPages - 4 + i
                            } else {
                              pageNum = pagination.currentPage - 2 + i
                            }
                          }
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === pagination.currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(pageNum)}
                              disabled={loading}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={pagination.currentPage === pagination.totalPages || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
        </PageContent>
      </PageLayout>

      {/* Update Modal - Full Workflow Functionality */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Non-Ltd Company Workflow</DialogTitle>
            <DialogDescription>
              Update workflow stage, assignment, or add comments for {selectedClient?.companyName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Status Display */}
            {selectedClient?.currentNonLtdAccountsWorkflow && (
              <div className="bg-muted/20 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Current Status</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getWorkflowStatus(selectedClient.currentNonLtdAccountsWorkflow).color}>
                      {getWorkflowStatus(selectedClient.currentNonLtdAccountsWorkflow).label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedClient.currentNonLtdAccountsWorkflow.assignedUser?.name || 
                       selectedClient.nonLtdCompanyAssignedUser?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Workflow Stage Selection */}
            <div className="space-y-2">
              <Label htmlFor="stage-select">Update Workflow Stage (Optional)</Label>
              <Select value={selectedStage || ''} onValueChange={handleStageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage to update to (optional)..." />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_STAGES.map((stage) => {
                    // Use ALL_WORKFLOW_STAGES for proper completion status calculation
                    const currentStageIndex = ALL_WORKFLOW_STAGES.findIndex(s => s.key === selectedClient?.currentNonLtdAccountsWorkflow?.currentStage)
                    const stageIndex = ALL_WORKFLOW_STAGES.findIndex(s => s.key === stage.key)
                    const isCompletedStage = currentStageIndex !== -1 && stageIndex < currentStageIndex
                    const isCurrentStage = stage.key === selectedClient?.currentNonLtdAccountsWorkflow?.currentStage
                    
                    // Role-based restrictions for SUBMISSION_APPROVED_PARTNER
                    const isRestrictedStage = stage.key === 'SUBMISSION_APPROVED_PARTNER'
                    const canAccessRestrictedStage = session?.user?.role === 'MANAGER' || session?.user?.role === 'PARTNER'
                    
                    // Skip restricted stages for non-authorized users
                    if (isRestrictedStage && !canAccessRestrictedStage) {
                      return null
                    }
                    
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
                          {isRestrictedStage && canAccessRestrictedStage && (
                            <Badge variant="outline" className="ml-auto text-xs text-purple-600 border-purple-300">
                              🔒 MANAGER+
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
                    Current: {ALL_WORKFLOW_STAGES.find(s => s.key === selectedClient?.currentNonLtdAccountsWorkflow?.currentStage)?.label}
                    <br />
                    Moving to: {ALL_WORKFLOW_STAGES.find(s => s.key === selectedStage)?.label}
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
                setSelectedStage(selectedClient?.currentNonLtdAccountsWorkflow?.currentStage || '')
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
          currentStage={pendingStageChange.client.currentNonLtdAccountsWorkflow?.currentStage || ''}
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
              New workflow created for next year with fixed dates for non-limited company accounts.
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
                    <span className="text-xs text-blue-700">Year End:</span>
                    <span className="text-xs font-medium text-blue-800">
                      {formatDate(rolloverInfo.newWorkflow.yearEndDate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700">Filing Due:</span>
                    <span className="text-xs font-medium text-blue-800">
                      {formatDate(rolloverInfo.newWorkflow.filingDueDate)}
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
                    <span className="text-xs text-green-700">Filing Due:</span>
                    <span className="text-xs font-medium text-green-800">
                      {formatDate(rolloverInfo.updatedDates.filingDue)}
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

      {/* Send Email Modal */}
      <SendEmailModal
        open={sendEmailModalOpen}
        onOpenChange={setSendEmailModalOpen}
        client={emailClient}
        workflowData={emailClient?.currentNonLtdAccountsWorkflow}
        workflowType="ltd"
      />
    </>
  )
} 