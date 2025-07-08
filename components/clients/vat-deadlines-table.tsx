'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  History,
  ArrowUpDown,
  AlertCircle,
  UserPlus,
  Edit,
  Settings,
  Filter,
  Undo2,
  Mail
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { 
  calculateVATQuarter, 
  getVATFilingMonthName, 
  getVATQuarterEndMonthName,
  isVATFilingMonth,
  formatQuarterPeriodForDisplay
} from '@/lib/vat-workflow'
import { VATQuartersHistoryModal } from './vat-quarters-history-modal'
import { ActivityLogViewer } from '@/components/activity/activity-log-viewer'
import { AdvancedFilterModal } from './advanced-filter-modal'
import { WorkflowSkipWarningDialog } from '@/components/ui/workflow-skip-warning-dialog'
import { validateStageTransition, getSelectableStages } from '@/lib/workflow-validation'
import { SendEmailModal } from './send-email-modal'

interface VATQuarter {
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
    role: string
  }
  // Milestone dates with user attribution
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
}

interface VATClient {
  id: string
  clientCode: string
  companyName: string
  contactEmail?: string
  vatReturnsFrequency?: string
  vatQuarterGroup?: string
  createdAt: string // Client creation date to determine if old quarters are applicable
  
  // Current VAT quarter workflow info (for backward compatibility)
  currentVATQuarter?: VATQuarter
  
  // All VAT quarters for this client
  vatQuartersWorkflow?: VATQuarter[]
}

interface WorkflowStage {
  key: string
  label: string
  icon: React.ReactNode
  color: string
}



// All VAT workflow stages for display purposes
const ALL_VAT_WORKFLOW_STAGES: WorkflowStage[] = [
  { key: 'WAITING_FOR_QUARTER_END', label: 'Waiting for quarter end', icon: <Calendar className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' },
  { key: 'PAPERWORK_PENDING_CHASE', label: 'Pending to chase', icon: <Clock className="h-4 w-4" />, color: 'bg-amber-100 text-amber-800' },
  { key: 'PAPERWORK_CHASED', label: 'Paperwork chased', icon: <Phone className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'PAPERWORK_RECEIVED', label: 'Paperwork received', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'WORK_IN_PROGRESS', label: 'Work in progress', icon: <Clock className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'QUERIES_PENDING', label: 'Queries pending', icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'REVIEW_PENDING_MANAGER', label: 'Review pending by manager', icon: <UserCheck className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
  { key: 'REVIEWED_BY_MANAGER', label: 'Reviewed by manager', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'REVIEW_PENDING_PARTNER', label: 'Review pending by partner', icon: <UserCheck className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  { key: 'REVIEWED_BY_PARTNER', label: 'Reviewed by partner', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800' },
  { key: 'EMAILED_TO_PARTNER', label: 'Emailed to partner', icon: <Send className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-800' },
  { key: 'EMAILED_TO_CLIENT', label: 'Emailed to client', icon: <Send className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-800' },
  { key: 'CLIENT_APPROVED', label: 'Client approved', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800' },
  { key: 'FILED_TO_HMRC', label: 'Filed to HMRC', icon: <Building className="h-4 w-4" />, color: 'bg-green-100 text-green-800' }
]

// User-selectable VAT workflow stages (excluding auto-set stages)
const WORKFLOW_STAGES = ALL_VAT_WORKFLOW_STAGES.filter(stage => 
  !['REVIEWED_BY_MANAGER', 'REVIEWED_BY_PARTNER'].includes(stage.key)
)

// Month configuration for tabs with dynamic year calculation
const MONTHS = [
  { key: 'jan', name: 'January', short: 'Jan', number: 1 },
  { key: 'feb', name: 'February', short: 'Feb', number: 2 },
  { key: 'mar', name: 'March', short: 'Mar', number: 3 },
  { key: 'apr', name: 'April', short: 'Apr', number: 4 },
  { key: 'may', name: 'May', short: 'May', number: 5 },
  { key: 'jun', name: 'June', short: 'Jun', number: 6 },
  { key: 'jul', name: 'July', short: 'Jul', number: 7 },
  { key: 'aug', name: 'August', short: 'Aug', number: 8 },
  { key: 'sep', name: 'September', short: 'Sep', number: 9 },
  { key: 'oct', name: 'October', short: 'Oct', number: 10 },
  { key: 'nov', name: 'November', short: 'Nov', number: 11 },
  { key: 'dec', name: 'December', short: 'Dec', number: 12 }
]

// Helper function to get display year for a month tab
const getMonthDisplayYear = (monthNumber: number, client?: VATClient): number => {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  
  // For cross-year filing months (like January), check if we should show next year
  if (monthNumber === 1) {
    // Basic rule: If we're past October, January tab should show next year deadlines
    if (currentMonth >= 10) {
      return currentYear + 1
    }
    
    // ENHANCED: Progressive quarter logic for January
    // Show next year if current year January quarter is completed
    if (client?.vatQuartersWorkflow) {
      const currentYearJanQuarter = client.vatQuartersWorkflow.find(q => {
        const filingDate = new Date(q.filingDueDate)
        return filingDate.getMonth() === 0 && filingDate.getFullYear() === currentYear // January of current year
      })
      
      // If current year January quarter is completed, show next year quarters
      if (currentYearJanQuarter?.isCompleted || currentYearJanQuarter?.currentStage === 'FILED_TO_HMRC') {
        return currentYear + 1
      }
    }
  }
  
  // ENHANCED: Progressive quarter logic for all months
  // Show next year quarters if current year quarter is completed AND we're close to year end
  if (client?.vatQuartersWorkflow) {
    const currentMonthQuarter = client.vatQuartersWorkflow.find(q => {
      const filingDate = new Date(q.filingDueDate)
      return filingDate.getMonth() === monthNumber - 1 && filingDate.getFullYear() === currentYear
    })
    
    // Progressive logic: Show next year if current quarter is completed and we're in the right time period
    if (currentMonthQuarter?.isCompleted || currentMonthQuarter?.currentStage === 'FILED_TO_HMRC') {
      // Example: Show Jan 2026 after Oct 2025 filing is completed
      // Show next year deadlines if we're in Q4 (Oct-Dec) and current quarter is done
      if (currentMonth >= 10 && monthNumber === 1) {
        return currentYear + 1
      }
      
      // For other months, show next year if completed and we're past the filing month
      if (currentMonth > monthNumber) {
        return currentYear + 1
      }
    }
  }
  
  return currentYear
}

// Helper function to get month display with year
const getMonthDisplay = (monthNumber: number): string => {
  const month = MONTHS.find(m => m.number === monthNumber)
  const year = getMonthDisplayYear(monthNumber)
  const yearSuffix = String(year).slice(2) // "2025" -> "25"
  
  return `${month?.short || 'Unknown'} ${yearSuffix}`
}

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

interface VATDeadlinesTableProps {
  focusClientId?: string
  focusWorkflowId?: string
}

export function VATDeadlinesTable({ 
  focusClientId, 
  focusWorkflowId 
}: VATDeadlinesTableProps = {}) {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize filter state from URL parameters
  const getInitialFilter = () => {
    const filterParam = searchParams.get('filter')
    const tabParam = searchParams.get('tab')
    
    if (filterParam === 'unassigned') {
      return { 
        filter: 'all' as const, 
        userFilter: 'unassigned',
        showAllMonths: tabParam === 'all' // Special flag to show all months for unassigned
      }
    }
    return { 
      filter: 'assigned_to_me' as const, 
      userFilter: 'all',
      showAllMonths: false
    }
  }
  
  const initialFilterState = getInitialFilter()
  
  const [vatClients, setVatClients] = useState<VATClient[]>([])
  const [loading, setLoading] = useState(true)
  
  // Use centralized user fetching hook
  const { users, loading: usersLoading, error: usersError } = useUsers()
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<VATClient | null>(null)
  const [selectedQuarter, setSelectedQuarter] = useState<VATQuarter | null>(null)
  const [selectedStage, setSelectedStage] = useState<string | undefined>(undefined)
  const [selectedAssignee, setSelectedAssignee] = useState<string>('unassigned')
  const [updateComments, setUpdateComments] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [activeMonth, setActiveMonth] = useState<string>('')
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedHistoryClient, setSelectedHistoryClient] = useState<VATClient | null>(null)
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showClientSelfFilingConfirm, setShowClientSelfFilingConfirm] = useState(false)
  const [showFiledToHMRCConfirm, setShowFiledToHMRCConfirm] = useState(false)
  const [showBackwardStageConfirm, setShowBackwardStageConfirm] = useState(false)
  const [showActivityLogModal, setShowActivityLogModal] = useState(false)
  const [activityLogClient, setActivityLogClient] = useState<VATClient | null>(null)
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>(initialFilterState.userFilter)
  const [selectedWorkflowStageFilter, setSelectedWorkflowStageFilter] = useState<string>('all')
  const [filter, setFilter] = useState<'assigned_to_me' | 'all'>(initialFilterState.filter)
  const [showAllMonths, setShowAllMonths] = useState(initialFilterState.showAllMonths)
  
  // Email modal state
  const [sendEmailModalOpen, setSendEmailModalOpen] = useState(false)
  const [emailClient, setEmailClient] = useState<VATClient | null>(null)
  const [emailQuarter, setEmailQuarter] = useState<VATQuarter | null>(null)

  // Advanced filter state
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter | null>(null)
  
  // Workflow skip validation states
  const [showSkipWarning, setShowSkipWarning] = useState(false)
  const [pendingStageChange, setPendingStageChange] = useState<{
    client: VATClient
    quarter: VATQuarter
    targetStage: string
    skippedStages: string[]
  } | null>(null)

  // Get current month for default tab
  const currentMonth = new Date().getMonth() + 1
  const currentMonthKey = MONTHS.find(m => m.number === currentMonth)?.key || 'jan'

  // Initialize active month
  useEffect(() => {
    if (!activeMonth) {
      setActiveMonth(currentMonthKey)
    }
  }, [currentMonthKey, activeMonth])

  const fetchVATClients = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      const response = await fetch('/api/clients/vat-clients', {
        // Add timestamp to prevent caching when forcing refresh
        ...(forceRefresh && {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
      })
      const data = await response.json()

      if (data.success) {
        setVatClients(data.clients || [])
      } else {
        showToast.error('Failed to fetch VAT clients')
      }
    } catch (error) {
      console.error('Error fetching VAT clients:', error)
      showToast.error('Failed to fetch VAT clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVATClients()
  }, [fetchVATClients])

  // Auto-focus on specific client/workflow when navigated from notifications
  useEffect(() => {
    if (focusClientId && vatClients.length > 0) {
      const targetClient = vatClients.find(client => client.id === focusClientId)
      if (targetClient) {
        // Expand the client row if it has a workflow
        setExpandedRows(prev => ({ ...prev, [`${focusClientId}-${currentMonth}`]: true }))
        
        // Scroll to the client after a short delay
        setTimeout(() => {
          const element = document.getElementById(`vat-client-${focusClientId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Add highlight effect
            element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
            }, 3000)
          }
        }, 500)
      }
    }
  }, [focusClientId, vatClients, currentMonth])

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

  // Get quarter that files in a specific month for a client
  const getQuarterForMonth = useCallback((client: VATClient, monthNumber: number): VATQuarter | null => {
    if (!client.vatQuarterGroup || !isVATFilingMonth(client.vatQuarterGroup, monthNumber)) {
      return null
    }

    // ENHANCED: Progressive quarter display logic
    // Use the display year helper to determine which year's quarter to show
    const displayYear = getMonthDisplayYear(monthNumber, client)
    
    // Calculate the quarter that files in this month
    // Filing month is the month AFTER quarter end, so quarter ends in previous month
    const quarterEndMonth = monthNumber === 1 ? 12 : monthNumber - 1
    const quarterEndYear = monthNumber === 1 ? displayYear - 1 : displayYear
    
    // Calculate quarter info for the quarter that ends in that month
    const quarterEndDate = new Date(quarterEndYear, quarterEndMonth - 1, 15) // Mid-month to avoid edge cases
    const quarterInfo = calculateVATQuarter(client.vatQuarterGroup, quarterEndDate)
    
    // First, try to find existing quarter that matches this period from all quarters
    if (client.vatQuartersWorkflow) {
      const existingQuarter = client.vatQuartersWorkflow.find(q => 
        q.quarterPeriod === quarterInfo.quarterPeriod
      )
      if (existingQuarter) {
        return existingQuarter
      }
    }
    
    // Fallback to current quarter if it matches
    if (client.currentVATQuarter?.quarterPeriod === quarterInfo.quarterPeriod) {
      return client.currentVATQuarter
    }
    
    // Return calculated quarter info (quarter doesn't exist yet)
    // Future quarters should be unassigned by default - each quarter is independent
    
    // Determine the appropriate stage based on whether quarter has ended
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const quarterEndDateForStage = new Date(quarterInfo.quarterEndDate)
    quarterEndDateForStage.setHours(0, 0, 0, 0)
    
    // If quarter has ended, it should be ready for chase; otherwise, waiting for quarter end
    const defaultStage = today > quarterEndDateForStage ? 'PAPERWORK_PENDING_CHASE' : 'WAITING_FOR_QUARTER_END'
    
    return {
      id: `calculated-${client.id}-${quarterInfo.quarterPeriod}`,
      quarterPeriod: quarterInfo.quarterPeriod,
      quarterStartDate: quarterInfo.quarterStartDate.toISOString(),
      quarterEndDate: quarterInfo.quarterEndDate.toISOString(),
      filingDueDate: quarterInfo.filingDueDate.toISOString(),
      currentStage: defaultStage,
      isCompleted: false,
      assignedUser: undefined // Future quarters are unassigned - each quarter is independent
    }
  }, [vatClients])

  // Enhanced filter function with advanced filters
  const clientMatchesFilters = useCallback((client: VATClient, monthNumber?: number) => {
    // Basic assigned filter - FIXED: Use quarter-level assignment instead of client-level
    let passesBasicFilter = true
    if (filter === 'assigned_to_me') {
      if (monthNumber) {
        const quarterForMonth = getQuarterForMonth(client, monthNumber)
        passesBasicFilter = quarterForMonth?.assignedUser?.id === session?.user?.id
      } else {
        // For current month when no specific month provided
        const quarterForMonth = getQuarterForMonth(client, currentMonth)
        passesBasicFilter = quarterForMonth?.assignedUser?.id === session?.user?.id
      }
    }
    
    // User filter - FIXED: Use quarter-level assignment instead of client-level
    let passesUserFilter = true
    if (selectedUserFilter !== 'all') {
      const quarterForFilter = monthNumber ? getQuarterForMonth(client, monthNumber) : getQuarterForMonth(client, currentMonth)
      if (selectedUserFilter === 'unassigned') {
        passesUserFilter = !quarterForFilter?.assignedUser?.id
      } else {
        passesUserFilter = quarterForFilter?.assignedUser?.id === selectedUserFilter
      }
    }
    
    // Workflow stage filter
    let passesWorkflowFilter = true
    if (selectedWorkflowStageFilter !== 'all') {
      if (monthNumber) {
        const quarterForMonth = getQuarterForMonth(client, monthNumber)
        passesWorkflowFilter = quarterForMonth?.currentStage === selectedWorkflowStageFilter
      } else {
        const quarterForMonth = getQuarterForMonth(client, currentMonth)
        passesWorkflowFilter = quarterForMonth?.currentStage === selectedWorkflowStageFilter
      }
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
  }, [filter, selectedUserFilter, selectedWorkflowStageFilter, advancedFilter, session?.user?.id, getQuarterForMonth, currentMonth])

  // Get clients for specific filing month with user and workflow stage filtering
  const getClientsForMonth = useCallback((monthNumber: number) => {
    if (!vatClients || !Array.isArray(vatClients)) return []
    
    return vatClients.filter(client => {
      if (!client.vatQuarterGroup) return false
      
      // First check if client files in this month
      if (!isVATFilingMonth(client.vatQuarterGroup, monthNumber)) return false
      
      // Then apply user and workflow stage filters
      return clientMatchesFilters(client, monthNumber)
    })
  }, [vatClients, clientMatchesFilters])

  // SIMPLIFIED: Calculate VAT client counts per user for filter display
  // Only count quarters that are actually assigned to users, no fallbacks
  const userVATClientCounts = users.reduce((acc, user) => {
    const clientCount = vatClients.filter(client => {
      const quarter = getQuarterForMonth(client, currentMonth)
      return quarter?.assignedUser?.id === user.id
    }).length
    acc[user.id] = clientCount
    return acc
  }, {} as Record<string, number>)

  // SIMPLIFIED: Count unassigned VAT clients (only quarters without assignedUser)
  const unassignedVATCount = vatClients.filter(client => {
    const quarter = getQuarterForMonth(client, currentMonth)
    return quarter && !quarter.assignedUser?.id
  }).length

  // Get current month clients count for prominent display
  const currentMonthClients = getClientsForMonth(currentMonth)
  const currentMonthName = MONTHS.find(m => m.number === currentMonth)?.name || ''

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

  const getFilingMonth = (quarter: VATQuarter | null) => {
    if (!quarter) return '-'
    
    try {
      return getVATFilingMonthName(quarter)
    } catch {
      return '-'
    }
  }

  const getQuarterEndMonth = (quarter: VATQuarter | null) => {
    if (!quarter) return '-'
    
    try {
      return getVATQuarterEndMonthName(quarter)
    } catch {
      return '-'
    }
  }

  // Check if a quarter is applicable for a client (not from before client creation)
  const isQuarterApplicable = (quarter: VATQuarter | null, client?: VATClient): boolean => {
    if (!quarter || !client?.createdAt) return true
    
    const filingDueDate = new Date(quarter.filingDueDate)
    const clientCreatedDate = new Date(client.createdAt)
    clientCreatedDate.setHours(0, 0, 0, 0)
    
    // Quarter is applicable if filing due date is on or after client creation date
    return filingDueDate >= clientCreatedDate
  }

  const getDueStatus = (quarter: VATQuarter | null, client?: VATClient) => {
    if (!quarter) return { label: 'No Quarter', color: 'text-gray-500' }
    
    // Check if quarter is completed - completed quarters should never show as overdue
    if (quarter.isCompleted || quarter.currentStage === 'FILED_TO_HMRC' || quarter.filedToHMRCDate) {
      return { 
        label: 'Completed', 
        color: 'text-green-600' 
      }
    }
    
    const quarterEndDate = new Date(quarter.quarterEndDate)
    const filingDueDate = new Date(quarter.filingDueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Check if this quarter is from before the client was created
    // If so, mark as "Not Applicable" instead of overdue
    if (!isQuarterApplicable(quarter, client)) {
      return { 
        label: 'Not Applicable', 
        color: 'text-gray-500' 
      }
    }
    
    // If quarter hasn't ended yet
    if (today <= quarterEndDate) {
      const daysUntilEnd = Math.ceil((quarterEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return { 
        label: `Q: ${daysUntilEnd}d`, 
        color: 'text-blue-600' 
      }
    }
    
    // If quarter ended but filing not due yet
    if (today <= filingDueDate) {
      const daysUntilFiling = Math.ceil((filingDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return { 
        label: `${daysUntilFiling}d`, 
        color: daysUntilFiling <= 7 ? 'text-amber-600' : 'text-green-600' 
      }
    }
    
    // Filing is overdue
    const daysOverdue = Math.ceil((today.getTime() - filingDueDate.getTime()) / (1000 * 60 * 60 * 24))
    return { 
      label: `${daysOverdue}d overdue`, 
      color: 'text-red-600' 
    }
  }

  const getFrequencyBadge = (frequency?: string) => {
    const colors = {
      'QUARTERLY': 'bg-blue-100 text-blue-800',
      'MONTHLY': 'bg-green-100 text-green-800',
      'ANNUALLY': 'bg-purple-100 text-purple-800'
    }
    
    const color = colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    const label = frequency ? frequency.charAt(0) + frequency.slice(1).toLowerCase() : 'Unknown'
    
    return (
      <Badge variant="outline" className={`text-xs ${color}`}>
        {label}
      </Badge>
    )
  }

  const getWorkflowStatus = (quarter: VATQuarter | null) => {
    if (!quarter) return { label: 'No Quarter', color: 'bg-gray-100 text-gray-800' }
    
    const stage = WORKFLOW_STAGES.find(s => s.key === quarter.currentStage)
    if (!stage) return { label: quarter.currentStage, color: 'bg-gray-100 text-gray-800' }
    
    return {
      label: stage.label,
      color: stage.color,
      icon: stage.icon
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

  const sortClients = (clients: VATClient[], monthNumber: number) => {
    return [...clients].sort((a, b) => {
      // Default sorting by urgency when no sort column is specified
      if (!sortColumn) {
        const aQuarter = getQuarterForMonth(a, monthNumber)
        const bQuarter = getQuarterForMonth(b, monthNumber)
        
        const aDueStatus = getDueStatus(aQuarter, a)
        const bDueStatus = getDueStatus(bQuarter, b)
        
        // Prioritize by urgency level
        const getUrgencyLevel = (status: any) => {
          if (status.label.includes('overdue')) return 0  // Most urgent
          if (status.label.includes('Due today')) return 1
          if (status.label.match(/^\d+d$/)) return 2  // "7d" format - due soon
          if (status.label.includes('Q:')) return 3  // Quarter not ended yet
          if (status.label === 'Completed') return 5  // Completed quarters - lowest priority
          return 4  // Not applicable or other
        }
        
        const aUrgency = getUrgencyLevel(aDueStatus)
        const bUrgency = getUrgencyLevel(bDueStatus)
        
        if (aUrgency !== bUrgency) {
          return aUrgency - bUrgency  // Lower number = higher priority
        }
        
        // If same urgency level, sort by client code for consistency
        return (a.clientCode || '').localeCompare(b.clientCode || '')
      }

      // Existing column-based sorting logic
      let aValue: any = ''
      let bValue: any = ''

      const aQuarter = getQuarterForMonth(a, monthNumber)
      const bQuarter = getQuarterForMonth(b, monthNumber)

      switch (sortColumn) {
        case 'clientCode':
          aValue = a.clientCode || ''
          bValue = b.clientCode || ''
          break
        case 'companyName':
          aValue = a.companyName || ''
          bValue = b.companyName || ''
          break
        case 'quarterEnd':
          aValue = getQuarterEndMonth(aQuarter)
          bValue = getQuarterEndMonth(bQuarter)
          break
        case 'filingMonth':
          aValue = getFilingMonth(aQuarter)
          bValue = getFilingMonth(bQuarter)
          break
        case 'due':
          aValue = getDueStatus(aQuarter, a).label
          bValue = getDueStatus(bQuarter, b).label
          break
        case 'status':
          aValue = getWorkflowStatus(aQuarter).label
          bValue = getWorkflowStatus(bQuarter).label
          break
        case 'assignedTo':
                  aValue = aQuarter?.assignedUser?.name || ''
        bValue = bQuarter?.assignedUser?.name || ''
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const toggleRowExpansion = (clientId: string, monthNumber?: number) => {
    // Create unique key for client + month combination
    const key = monthNumber ? `${clientId}-${monthNumber}` : clientId
    setExpandedRows(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleAddUpdate = (client: VATClient, quarter?: VATQuarter | null) => {
    setSelectedClient(client)
    setSelectedQuarter(quarter || null)
    setSelectedStage(undefined)
    
    // Use the specific quarter's assigned user if available, otherwise default to unassigned
    // This ensures each quarter is independent and future quarters don't inherit assignments
    const quarterAssignedUserId = quarter?.assignedUser?.id
    setSelectedAssignee(quarterAssignedUserId || 'unassigned')
    
    setUpdateComments('')
    setUpdateModalOpen(true)
  }

  const handleOpenHistory = (client: VATClient) => {
    setSelectedHistoryClient(client)
    setHistoryModalOpen(true)
  }

  const handleViewActivityLog = (client: VATClient) => {
    setActivityLogClient(client)
    setShowActivityLogModal(true)
  }

  const handleUndoFiling = async (client: VATClient, quarter: VATQuarter | null) => {
    if (!quarter) return
    
    try {
      setUpdating(true)
      
      const response = await fetch(`/api/vat-quarters/${quarter.id}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'CLIENT_APPROVED', // Reset to previous stage
          comments: 'Filing undone - workflow reopened for corrections',
          assignedUserId: quarter?.assignedUser?.id || null // SIMPLIFIED: Only use quarter assignment
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to undo filing')
      }

      const data = await response.json()
      
      if (data.success) {
        showToast.success('Filing undone successfully - workflow reopened')
        await fetchVATClients(true)
      } else {
        throw new Error(data.error || 'Failed to undo filing')
      }
      
    } catch (error) {
      console.error('Error undoing filing:', error)
      showToast.error('Failed to undo filing. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleStageChange = (stageKey: string) => {
    if (!selectedQuarter?.currentStage) {
      setSelectedStage(stageKey)
      return
    }

    const currentStageIndex = WORKFLOW_STAGES.findIndex(s => s.key === selectedQuarter.currentStage)
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
    if (!selectedClient || !selectedQuarter) {
      showToast.error('No client or quarter selected')
      return
    }

    // Allow update if either stage is changed OR assignee is changed
    const currentAssigneeId = selectedQuarter.assignedUser?.id || null
    const selectedAssigneeId = selectedAssignee === 'unassigned' ? null : selectedAssignee
    const hasStageChange = selectedStage && selectedStage !== selectedQuarter.currentStage
    const hasAssigneeChange = selectedAssigneeId !== currentAssigneeId

    if (!hasStageChange && !hasAssigneeChange) {
      showToast.error('Please select a stage to update or change the assignment')
      return
    }

    // Validate stage transition if there's a stage change
    if (hasStageChange && selectedStage) {
      const currentStage = selectedQuarter.currentStage
      const validation = validateStageTransition(currentStage, selectedStage, 'VAT')
      
      if (!validation.isValid) {
        if (validation.isSkipping) {
          // Show skip warning dialog
          setPendingStageChange({
            client: selectedClient,
            quarter: selectedQuarter,
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

    // If FILED_TO_HMRC is selected, show confirmation dialog
    if (selectedStage === 'FILED_TO_HMRC') {
      setShowFiledToHMRCConfirm(true)
      return
    }

    setUpdating(true)
    try {
      // For calculated quarters (future quarters), we need to create the quarter first
      let quarterId = selectedQuarter.id
      
      if (selectedQuarter.id.startsWith('calculated-')) {
        // This is a future quarter that doesn't exist yet - create it first
        const createResponse = await fetch(`/api/clients/${selectedClient.id}/vat-quarters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quarterPeriod: selectedQuarter.quarterPeriod,
            quarterStartDate: selectedQuarter.quarterStartDate,
            quarterEndDate: selectedQuarter.quarterEndDate,
            filingDueDate: selectedQuarter.filingDueDate
          })
        })

        const createData = await createResponse.json()
        if (!createData.success) {
          throw new Error(createData.error || 'Failed to create VAT quarter')
        }
        
        quarterId = createData.data.id
      }

      // Build request body - only include stage if it's changing
      const requestBody: any = {
        assignedUserId: selectedAssignee === 'unassigned' ? null : selectedAssignee,
        comments: updateComments || (hasAssigneeChange && !hasStageChange ? 'Assignment updated' : '')
      }

      // Only include stage if it's actually changing
      if (hasStageChange && selectedStage) {
        requestBody.stage = selectedStage
      }

      const response = await fetch(`/api/vat-quarters/${quarterId}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Update completed successfully')
        setUpdateModalOpen(false)
        setSelectedStage(undefined)
        setSelectedQuarter(null)
        setUpdateComments('')
        await fetchVATClients(true)
      } else {
        showToast.error(data.error || 'Failed to update workflow')
      }
    } catch (error) {
      console.error('Error updating:', error)
      showToast.error('Failed to update. Please try again.')
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
    await proceedWithVATStageUpdate()
    
    // Clear pending change
    setPendingStageChange(null)
  }

  // Extracted function to perform the actual VAT stage update
  const proceedWithVATStageUpdate = async () => {
    if (!selectedClient || !selectedQuarter) return

    // If FILED_TO_HMRC is selected, show confirmation dialog
    if (selectedStage === 'FILED_TO_HMRC') {
      setShowFiledToHMRCConfirm(true)
      return
    }

    setUpdating(true)
    try {
      // For calculated quarters (future quarters), we need to create the quarter first
      let quarterId = selectedQuarter.id
      
      if (selectedQuarter.id.startsWith('calculated-')) {
        // This is a future quarter that doesn't exist yet - create it first
        const createResponse = await fetch(`/api/clients/${selectedClient.id}/vat-quarters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quarterPeriod: selectedQuarter.quarterPeriod,
            quarterStartDate: selectedQuarter.quarterStartDate,
            quarterEndDate: selectedQuarter.quarterEndDate,
            filingDueDate: selectedQuarter.filingDueDate
          })
        })

        const createData = await createResponse.json()
        if (!createData.success) {
          throw new Error(createData.error || 'Failed to create VAT quarter')
        }
        
        quarterId = createData.data.id
      }

      // Build request body - only include stage if it's changing
      const requestBody: any = {
        assignedUserId: selectedAssignee === 'unassigned' ? null : selectedAssignee,
        comments: updateComments || 'Stage updated with skip warning bypass'
      }

      // Only include stage if it's actually changing
      if (selectedStage) {
        requestBody.stage = selectedStage
      }

      const response = await fetch(`/api/vat-quarters/${quarterId}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Update completed successfully')
        setUpdateModalOpen(false)
        setSelectedStage(undefined)
        setSelectedQuarter(null)
        setUpdateComments('')
        await fetchVATClients(true)
      } else {
        showToast.error(data.error || 'Failed to update workflow')
      }
    } catch (error) {
      console.error('Error updating:', error)
      showToast.error('Failed to update. Please try again.')
    } finally {
      setUpdating(false)
    }
  }



  const handleClientSelfFiling = async () => {
    if (!selectedClient?.currentVATQuarter) {
      showToast.error('No active VAT quarter found for this client')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/vat-quarters/${selectedClient.currentVATQuarter.id}/client-self-filing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comments: 'Client handling their own VAT filing',
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Quarter marked as client self-filing')
        setUpdateModalOpen(false)
        setShowClientSelfFilingConfirm(false)
        await fetchVATClients(true)
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

  const handleFiledToHMRCConfirm = async () => {
    if (!selectedClient || !selectedStage) {
      return
    }

    setUpdating(true)
    try {
      if (!selectedClient.currentVATQuarter) {
        showToast.error('No active VAT quarter found for this client')
        return
      }

      const response = await fetch(`/api/vat-quarters/${selectedClient.currentVATQuarter.id}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: selectedStage,
          assignedUserId: selectedAssignee === 'unassigned' ? null : selectedAssignee,
          comments: updateComments || 'Filed to HMRC - VAT return completed'
        })
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('VAT return successfully filed to HMRC')
        setUpdateModalOpen(false)
        setShowFiledToHMRCConfirm(false)
        setSelectedStage(undefined)
        setUpdateComments('')
        await fetchVATClients(true)
      } else {
        showToast.error(data.error || 'Failed to file to HMRC')
      }
      
    } catch (error) {
      console.error('Error filing to HMRC:', error)
      showToast.error('Failed to file to HMRC. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const renderWorkflowTimeline = (client: VATClient, quarter: VATQuarter | null) => {
    if (!quarter) return null

    // Define milestone timeline for normal workflow
    const milestones = [
      { 
        id: 'CHASE_STARTED', 
        date: quarter.chaseStartedDate, 
        user: quarter.chaseStartedByUserName,
        label: 'Chase Started',
        icon: <Phone className="h-4 w-4" />
      },
      { 
        id: 'PAPERWORK_RECEIVED', 
        date: quarter.paperworkReceivedDate, 
        user: quarter.paperworkReceivedByUserName,
        label: 'Paperwork Received',
        icon: <FileText className="h-4 w-4" />
      },
      { 
        id: 'WORK_STARTED', 
        date: quarter.workStartedDate, 
        user: quarter.workStartedByUserName,
        label: 'Work in progress',
        icon: <Clock className="h-4 w-4" />
      },
      { 
        id: 'WORK_FINISHED', 
        date: quarter.workFinishedDate, 
        user: quarter.workFinishedByUserName,
        label: 'Work Finished',
        icon: <CheckCircle className="h-4 w-4" />
      },
      { 
        id: 'SENT_TO_CLIENT', 
        date: quarter.sentToClientDate, 
        user: quarter.sentToClientByUserName,
        label: 'Sent to Client',
        icon: <Send className="h-4 w-4" />
      },
      { 
        id: 'CLIENT_APPROVED', 
        date: quarter.clientApprovedDate, 
        user: quarter.clientApprovedByUserName,
        label: 'Client Approved',
        icon: <UserCheck className="h-4 w-4" />
      },
      { 
        id: 'FILED_TO_HMRC', 
        date: quarter.filedToHMRCDate, 
        user: quarter.filedToHMRCByUserName,
        label: 'Filed to HMRC',
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
      <div className="py-4 px-6 bg-gray-50 border-t">
        <h4 className="text-sm font-medium text-gray-900 mb-4">
          Workflow Timeline - {(() => {
            try {
              // Use the proper VAT workflow function to format quarter periods
              return formatQuarterPeriodForDisplay(quarter.quarterPeriod)
            } catch (error) {
              // Fallback to original format if parsing fails
              return quarter.quarterPeriod
            }
          })()}
        </h4>
        <div className="relative overflow-x-auto">
          {/* Timeline Items with Connectors */}
          <div className="flex items-center justify-between min-w-full">
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
      </div>
    )
  }

  const SortableHeader = ({ column, children, className = "" }: { 
    column: string, 
    children: React.ReactNode, 
    className?: string 
  }) => (
    <TableHead className={className}>
      <button
        onClick={() => handleSort(column)}
        className="flex items-center gap-1 hover:text-primary transition-colors text-xs font-medium"
      >
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </TableHead>
  )

  const renderMonthContent = (monthNumber: number) => {
    const monthClients = getClientsForMonth(monthNumber)
    
    if (monthClients.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No VAT clients have filing due in this month</p>
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="border-b">
                                    <SortableHeader column="clientCode" className="col-vat-client-code p-2 text-center">Code</SortableHeader>
                        <SortableHeader column="companyName" className="col-vat-company-name p-2">Company</SortableHeader>
                        <SortableHeader column="quarterEnd" className="col-vat-quarter-end p-2 text-center">Q.End</SortableHeader>
                        <SortableHeader column="filingMonth" className="col-vat-filing-month p-2 text-center">Filing</SortableHeader>
                        <SortableHeader column="due" className="col-vat-due p-2 text-center">Due</SortableHeader>
                        <SortableHeader column="status" className="col-vat-status p-2 text-center">Status</SortableHeader>
                        <SortableHeader column="assignedTo" className="col-vat-assigned p-2 text-center">Assigned</SortableHeader>
                          <TableHead className="col-vat-add-update p-2 text-center">Update</TableHead>
              <TableHead className="col-vat-actions p-2 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortClients(monthClients, monthNumber).map((client) => {
            // Get the specific quarter for this month
            const monthQuarter = getQuarterForMonth(client, monthNumber)
            const dueStatus = getDueStatus(monthQuarter, client)
            const workflowStatus = getWorkflowStatus(monthQuarter)
            const rowKey = `${client.id}-${monthNumber}`
            const isApplicable = isQuarterApplicable(monthQuarter, client)
            
            return (
            <>
              {/* Main Row */}
              <TableRow 
                key={rowKey} 
                id={`vat-client-${client.id}`}
                className="hover:bg-muted/50 h-14"
              >
                <TableCell className="font-mono text-xs p-2 text-center">
                  {client.clientCode}
                </TableCell>
                <TableCell className="font-medium p-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      className="text-left hover:text-primary transition-colors cursor-pointer text-xs truncate max-w-[140px]"
                      title={`View ${client.companyName} details`}
                    >
                      <span className="hover:underline truncate">{client.companyName}</span>
                    </button>
                    <button
                      onClick={() => handleOpenHistory(client)}
                      className="flex items-center gap-1 text-left hover:text-primary transition-colors cursor-pointer group text-xs"
                      title="View VAT History"
                    >
                      <History className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    </button>
                    <button
                      onClick={() => handleViewActivityLog(client)}
                      className="flex items-center gap-1 text-left hover:text-primary transition-colors cursor-pointer group text-xs"
                      title="View Activity Log"
                    >
                      <Clock className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    </button>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-medium p-2 text-center">
                  {getQuarterEndMonth(monthQuarter)}
                </TableCell>
                <TableCell className="text-xs font-medium p-2 text-center">
                  {getFilingMonth(monthQuarter)}
                </TableCell>
                <TableCell className="p-2 text-center">
                  <span className={`text-xs font-medium ${dueStatus.color}`}>
                    {dueStatus.label}
                  </span>
                </TableCell>
                <TableCell className="p-2 text-center">
                  <Badge variant="outline" className={`text-xs px-1 py-0 h-5 max-w-[140px] ${workflowStatus.color}`}>
                    <div className="flex items-center gap-1 truncate">
                      <span className="flex-shrink-0">{workflowStatus.icon}</span>
                      <span className="truncate text-xs" title={workflowStatus.label}>
                        {workflowStatus.label.length > 15 ? workflowStatus.label.substring(0, 15) + '...' : workflowStatus.label}
                      </span>
                    </div>
                  </Badge>
                </TableCell>
                <TableCell className="p-2 text-center">
                  {isApplicable ? (
                    <div className="flex items-center justify-center gap-1 text-xs truncate max-w-[120px]" title={monthQuarter?.assignedUser?.name || 'Unassigned'}>
                      {monthQuarter?.assignedUser?.name ? (
                        <>
                          <User className="h-3 w-3 text-blue-600 flex-shrink-0" />
                          <span className="truncate text-blue-600">
                            {monthQuarter?.assignedUser?.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">Not Applicable</span>
                  )}
                </TableCell>
                <TableCell className="p-2 text-center">
                  {isApplicable ? (
                    monthQuarter?.isCompleted || monthQuarter?.currentStage === 'FILED_TO_HMRC' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 font-medium">Complete</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndoFiling(client, monthQuarter)}
                          className="action-trigger-button h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          title="Undo filing (reopen workflow)"
                        >
                          <Undo2 className="action-trigger-icon" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddUpdate(client, monthQuarter)}
                        className="flex items-center gap-1 h-6 px-2 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        Update
                      </Button>
                    )
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="p-2 text-center">
                  {isApplicable ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted/50 transition-colors">
                          <Settings className="h-4 w-4 text-foreground" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={() => toggleRowExpansion(client.id, monthNumber)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {expandedRows[rowKey] ? (
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setEmailClient(client)
                            setEmailQuarter(monthQuarter)
                            setSendEmailModalOpen(true)
                          }}
                          className="flex items-center gap-2 cursor-pointer"
                          disabled={!client.contactEmail}
                        >
                          <Mail className="h-4 w-4" />
                          Send Mail
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </TableCell>
              </TableRow>
              
              {/* Expanded Row - Workflow Timeline */}
              {expandedRows[rowKey] && isApplicable && (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    {renderWorkflowTimeline(client, monthQuarter)}
                  </TableCell>
                </TableRow>
              )}
            </>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading VAT deadlines...
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
                  <h1 className="text-xl md:text-2xl font-bold">VAT Deadline Tracker</h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Track and manage VAT filing deadlines for all VAT-enabled clients
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchVATClients(true)}
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Data
                  </Button>
                </div>
              </div>
            </div>



            {/* Current Month Summary */}
            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Current Filing Month - Most Emphasized */}
                <div className="md:col-span-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <Calendar className="h-6 w-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Filing Month</p>
                      <h2 className="text-3xl font-bold text-blue-600">{currentMonthName}</h2>
                    </div>
                  </div>
                </div>

                {/* Total Clients */}
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentMonthClients.length}</div>
                  <div className="text-sm text-muted-foreground">Total Clients</div>
                  <div className="text-xs text-muted-foreground mt-1">Filing this month</div>
                </div>

                {/* Completion Status */}
                {(() => {
                  const completed = currentMonthClients.filter(client => {
                    const quarter = getQuarterForMonth(client, currentMonth)
                    return quarter?.isCompleted || quarter?.currentStage === 'FILED_TO_HMRC'
                  }).length
                  
                  const stillDue = currentMonthClients.length - completed
                  
                  return (
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <div className="text-lg font-bold text-green-600">{completed}</div>
                        <div className="text-muted-foreground">/</div>
                        <div className="text-lg font-bold text-orange-600">{stillDue}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">Completed / Due</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {currentMonthClients.length > 0 ? Math.round((completed / currentMonthClients.length) * 100) : 0}% complete
                      </div>
                    </div>
                  )
                })()}

                {/* Days Left to File */}
                {(() => {
                  const today = new Date()
                  const currentYear = today.getFullYear()
                  const currentMonthIndex = today.getMonth()
                  const lastDayOfMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate()
                  const currentDay = today.getDate()
                  const daysLeft = lastDayOfMonth - currentDay + 1 // +1 to include today
                  
                  return (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{daysLeft}</div>
                      <div className="text-sm text-muted-foreground">Days Left</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {daysLeft <= 5 ? 'Urgent deadline!' : 'To file this month'}
                      </div>
                    </div>
                  )
                })()}
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
                <Label htmlFor="vat-user-filter" className="text-sm font-medium whitespace-nowrap">
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
                        <span>All Users ({vatClients.length})</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>Unassigned ({unassignedVATCount})</span>
                      </div>
                    </SelectItem>
                    {users
                      .filter(user => (userVATClientCounts?.[user.id] || 0) > 0)
                      .sort((a, b) => (userVATClientCounts?.[b.id] || 0) - (userVATClientCounts?.[a.id] || 0))
                      .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-600" />
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">({userVATClientCounts?.[user.id] || 0})</span>
                        </div>
                      </SelectItem>
                    ))}
                    {users
                      .filter(user => (userVATClientCounts?.[user.id] || 0) === 0)
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
                <Label htmlFor="vat-stage-filter" className="text-sm font-medium whitespace-nowrap">
                  Filter by Stage:
                </Label>
                <Select value={selectedWorkflowStageFilter} onValueChange={setSelectedWorkflowStageFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-600" />
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

            {/* Unassigned Clients Alert - Show when filtering by unassigned */}
            {selectedUserFilter === 'unassigned' && (
              <div className="mb-4">
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-amber-800 mb-1">
                          Viewing Unassigned VAT Clients
                        </h4>
                        <p className="text-sm text-amber-700 mb-2">
                          You're viewing unassigned VAT clients. Check different month tabs to see all unassigned clients across filing periods.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {MONTHS.map((month) => {
                            const monthClients = getClientsForMonth(month.number)
                            const unassignedInMonth = monthClients.filter(client => {
                              const quarter = getQuarterForMonth(client, month.number)
                              return quarter && !quarter.assignedUser?.id
                            }).length
                            
                            if (unassignedInMonth > 0) {
                              return (
                                <Button
                                  key={month.key}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7 px-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                                  onClick={() => setActiveMonth(month.key)}
                                >
                                  {month.short} ({unassignedInMonth})
                                </Button>
                              )
                            }
                            return null
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Monthly Tabs */}
            <Card>
              <CardContent className="p-0">
                <Tabs value={activeMonth} onValueChange={setActiveMonth} className="w-full">
                  <div className="border-b px-6 py-4">
                    <TabsList className="grid grid-cols-6 lg:grid-cols-12 gap-1 h-auto p-1">
                      {MONTHS.map((month) => {
                        const monthClients = getClientsForMonth(month.number)
                        const isCurrentMonth = month.number === currentMonth
                        const monthDisplayWithYear = getMonthDisplay(month.number)
                        return (
                          <TabsTrigger
                            key={month.key}
                            value={month.key}
                            className={`flex flex-col items-center gap-1 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${
                              isCurrentMonth ? 'ring-2 ring-blue-200 ring-offset-1' : ''
                            }`}
                          >
                            <span className="font-medium">{monthDisplayWithYear}</span>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs px-1.5 py-0.5 h-auto min-w-[1.5rem] justify-center ${
                                isCurrentMonth ? 'bg-blue-100 text-blue-800' : ''
                              }`}
                            >
                              {monthClients.length}
                            </Badge>
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </div>

                  {MONTHS.map((month) => (
                    <TabsContent key={month.key} value={month.key} className="mt-0">
                      {renderMonthContent(month.number)}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Update Modal */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update VAT Workflow</DialogTitle>
            <DialogDescription>
              Update workflow stage and assignment for {selectedClient?.companyName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Status Display */}
            {selectedQuarter && (
              <div className="bg-muted/20 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Current Status</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getWorkflowStatus(selectedQuarter).color}>
                      {getWorkflowStatus(selectedQuarter).label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">
                      {selectedQuarter.assignedUser?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Assignment Section - Available for All Users */}
            <div>
              <Label htmlFor="assignee">Assign To</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>Unassigned</span>
                    </div>
                  </SelectItem>
                  {session?.user?.id && (
                    <SelectItem value={session.user.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
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
                        <Users className="h-4 w-4 text-gray-600" />
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground">({user.role})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stage">Workflow Stage (Optional)</Label>
              <Select value={selectedStage || undefined} onValueChange={handleStageChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage to update" />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_STAGES.map((stage) => {
                    const currentStageIndex = WORKFLOW_STAGES.findIndex(s => s.key === selectedQuarter?.currentStage)
                    const stageIndex = WORKFLOW_STAGES.findIndex(s => s.key === stage.key)
                    const isCompletedStage = currentStageIndex !== -1 && stageIndex < currentStageIndex
                    const isCurrentStage = stage.key === selectedQuarter?.currentStage
                    
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

            <div>
              <Label htmlFor="updatedBy">Updated By</Label>
              <Input 
                id="updatedBy" 
                value={session?.user?.name || ''} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                placeholder="Add comments about this update (visible to everyone)"
                value={updateComments}
                onChange={(e) => setUpdateComments(e.target.value)}
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
                  disabled={updating}
                >
                  <FileText className="h-4 w-4" />
                  Client do the bookkeeping
                </Button>
                <p className="text-xs text-muted-foreground">
                  Use this if the client will handle their own VAT filing for this quarter
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
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
              {updating ? 'Updating...' : 'Update'}
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
              Are you sure you want to mark this quarter as "Client do the bookkeeping"?
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
          <DialogFooter>
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
              className="flex items-center gap-2"
            >
              {updating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Confirm
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filed to HMRC Confirmation Dialog */}
      <Dialog open={showFiledToHMRCConfirm} onOpenChange={setShowFiledToHMRCConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-600" />
              Confirm Filing to HMRC
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to mark this VAT return as "Filed to HMRC"?
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Final Step:</p>
                  <p>This will complete the VAT workflow and mark the quarter as filed. The Update button will be disabled after confirmation.</p>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Please ensure:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>VAT return has been successfully submitted to HMRC</li>
                    <li>All supporting documentation is properly filed</li>
                    <li>Client has been notified of the submission</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowFiledToHMRCConfirm(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFiledToHMRCConfirm}
              disabled={updating}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {updating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Filing...
                </>
              ) : (
                <>
                  <Building className="h-4 w-4" />
                  Confirm Filing
                </>
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
                    Current: {WORKFLOW_STAGES.find(s => s.key === selectedQuarter?.currentStage)?.label}
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
                setSelectedStage(selectedQuarter?.currentStage || '')
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

      {/* VAT Quarters History Modal */}
      {selectedHistoryClient && (
        <VATQuartersHistoryModal
          isOpen={historyModalOpen}
          onClose={() => {
            setHistoryModalOpen(false)
            setSelectedHistoryClient(null)
          }}
          clientId={selectedHistoryClient.id}
          clientCode={selectedHistoryClient.clientCode}
          companyName={selectedHistoryClient.companyName}
        />
      )}

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

      {/* Workflow Skip Warning Dialog */}
      {pendingStageChange && (
        <WorkflowSkipWarningDialog
          isOpen={showSkipWarning}
          onClose={handleSkipWarningClose}
          onConfirm={handleSkipWarningConfirm}
          workflowType="VAT"
          currentStage={pendingStageChange.quarter.currentStage}
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
        tableType="vat"
      />

      {/* Send Email Modal */}
      <SendEmailModal
        open={sendEmailModalOpen}
        onOpenChange={setSendEmailModalOpen}
        client={emailClient}
        workflowData={emailQuarter}
        workflowType="vat"
      />
    </>
  )
} 