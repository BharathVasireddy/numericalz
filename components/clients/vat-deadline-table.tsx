'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Calendar, AlertTriangle, CheckCircle, Clock, Building2, Eye, Mail, Phone, MoreHorizontal, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown, FileText, TrendingUp, Users, Target } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { showToast } from '@/lib/toast'
import { calculateVATQuarter, getDaysUntilVATDeadline, calculateDaysBetween } from '@/lib/vat-workflow'
import { VATWorkflowModal } from './vat-workflow-modal'


interface VATClient {
  id: string
  clientCode: string
  companyName: string
  companyType: string
  contactEmail: string
  contactPhone?: string
  vatReturnsFrequency?: string
  vatQuarterGroup?: string
  nextVatReturnDue?: string
  isVatEnabled: boolean
  createdAt: string // Client creation date
  
  // ENHANCED ASSIGNMENT - Show VAT-specific assignee
  vatAssignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  
  // Current VAT quarter workflow info
  currentVATQuarter?: {
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
  }
}

// Sortable header component
interface SortableHeaderProps {
  children: React.ReactNode
  sortKey: string
  currentSort: string
  sortOrder: 'asc' | 'desc'
  onSort: (key: string) => void
  className?: string
}

function SortableHeader({ children, sortKey, currentSort, sortOrder, onSort, className = '' }: SortableHeaderProps) {
  const isActive = currentSort === sortKey
  
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`flex items-center gap-1 hover:text-foreground transition-colors ${className} ${
        isActive ? 'text-foreground' : 'text-muted-foreground'
      }`}
    >
      {children}
      {isActive && (
        sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      )}
    </button>
  )
}

// Define types for comprehensive status
type ComprehensiveStatus = 
  | {
      type: 'quarter_end_month'
      stage: string
      quarterInfo: any
      daysUntilQuarterEnd: number
      workflowAssignee?: {
        id: string
        name: string
        email: string
        role: string
      }
    }
  | {
      type: 'filing_month'
      stage: string
      quarterInfo: any
      daysUntilFiling: number
      workflowAssignee?: {
        id: string
        name: string
        email: string
        role: string
      }
    }
  | {
      type: 'quarter_ongoing'
      quarterInfo: any
      daysUntilQuarterEnd: number
      daysUntilFiling: number
    }
  | {
      type: 'filing_period'
      quarterInfo: any
      daysUntilFiling: number
    }
  | {
      type: 'filing_overdue'
      quarterInfo: any
      daysOverdue: number
    }
  | {
      type: 'historical'
      quarterInfo: any
      clientCreatedDate: string
    }
  | {
      type: 'basic'
      status: string
      nextDue?: string
    }

// Month configuration - More compact for better fit
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

// Quarter group to filing months mapping (month AFTER quarter end)
const QUARTER_GROUP_FILING_MONTHS: { [key: string]: number[] } = {
  '1_4_7_10': [2, 5, 8, 11], // Feb, May, Aug, Nov (filing months after Jan, Apr, Jul, Oct)
  '2_5_8_11': [3, 6, 9, 12], // Mar, Jun, Sep, Dec (filing months after Feb, May, Aug, Nov)
  '3_6_9_12': [4, 7, 10, 1]  // Apr, Jul, Oct, Jan (filing months after Mar, Jun, Sep, Dec)
}

// Quarter group to quarter end months mapping (for reference)
const QUARTER_GROUP_MONTHS: { [key: string]: number[] } = {
  '1_4_7_10': [1, 4, 7, 10], // Jan, Apr, Jul, Oct
  '2_5_8_11': [2, 5, 8, 11], // Feb, May, Aug, Nov
  '3_6_9_12': [3, 6, 9, 12]  // Mar, Jun, Sep, Dec
}

export function VATDeadlineTable() {
  const { data: session } = useSession()
  const router = useRouter()
  const [vatClients, setVatClients] = useState<VATClient[]>([])
  const [loading, setLoading] = useState(true)
  const hasFetchedRef = useRef(false)
  const [currentSort, setCurrentSort] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([])
  
  // Month tab state - default to current month
  const currentMonth = new Date().getMonth() + 1 // JavaScript months are 0-indexed
  const defaultMonth = MONTHS.find(m => m.number === currentMonth)?.key || 'jan'
  const [activeMonth, setActiveMonth] = useState(defaultMonth)
  
  // Workflow modal state
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false)
  const [selectedVATQuarter, setSelectedVATQuarter] = useState<any>(null)

  const fetchVATClients = useCallback(async () => {
    // Prevent duplicate fetches
    if (hasFetchedRef.current && vatClients.length > 0) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/clients/vat-clients', {
        // Add cache headers to prevent unnecessary requests
        headers: {
          'Cache-Control': 'max-age=60', // Cache for 1 minute
        }
      })
      const data = await response.json()

      if (data.success) {
        setVatClients(data.clients)
        hasFetchedRef.current = true
      } else {
        showToast.error('Failed to fetch VAT clients')
      }
    } catch (error) {
      console.error('Error fetching VAT clients:', error)
      showToast.error('Failed to fetch VAT clients')
    } finally {
      setLoading(false)
    }
  }, [vatClients.length])

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users/staff')
      const data = await response.json()
      
      if (data.success) {
        setAvailableUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching available users:', error)
    }
  }, [])

  useEffect(() => {
    fetchVATClients()
    fetchAvailableUsers()
  }, [fetchVATClients, fetchAvailableUsers])

  // Helper function to safely find quarter group
  const findQuarterGroup = (monthNumber: number): string => {
    for (const [group, months] of Object.entries(QUARTER_GROUP_MONTHS)) {
      if (months.includes(monthNumber)) {
        return group
      }
    }
    return 'unknown'
  }

  // Helper function to check if a quarter is historical (before client was added to system)
  const isHistoricalQuarter = (client: VATClient, quarterEndDate: Date): boolean => {
    const clientCreatedDate = new Date(client.createdAt)
    return quarterEndDate < clientCreatedDate
  }

  // Filter clients by selected month - show clients in their FILING MONTH (month after quarter end)
  const getClientsForMonth = (monthNumber: number) => {
    return vatClients.filter(client => {
      // Only show quarterly VAT clients with quarter groups
      if (client.vatReturnsFrequency !== 'QUARTERLY' || !client.vatQuarterGroup) {
        return false
      }

      // Check if this client's quarter group includes the selected month as a FILING MONTH
      const filingMonths = QUARTER_GROUP_FILING_MONTHS[client.vatQuarterGroup] || []
      return filingMonths.includes(monthNumber)
    })
  }

  // Get filing due count for a specific month
  const getFilingDueCount = (monthNumber: number) => {
    return getClientsForMonth(monthNumber).length
  }

  // Get stage analytics for all clients
  const getStageAnalytics = () => {
    const analytics: { [key: string]: number } = {}
    
    vatClients.forEach(client => {
      if (client.currentVATQuarter && !client.currentVATQuarter.isCompleted) {
        const stage = client.currentVATQuarter.currentStage || 'unknown'
        analytics[stage] = (analytics[stage] || 0) + 1
      } else {
        analytics['no_active_workflow'] = (analytics['no_active_workflow'] || 0) + 1
      }
    })
    
    return analytics
  }

  // Month-aware comprehensive status - show workflow for filing months (month after quarter end)
  const getMonthSpecificStatus = (client: VATClient, monthNumber: number): ComprehensiveStatus => {
    const today = new Date()
    
    // If client has quarterly VAT and quarter group, calculate quarter info for this specific month
    if (client.vatReturnsFrequency === 'QUARTERLY' && client.vatQuarterGroup) {
      try {
        // Find the quarter group that ends in the month before this filing month
        const quarterEndMonth = QUARTER_GROUP_MONTHS[client.vatQuarterGroup]?.find(m => {
          // Filing month is the month after quarter end
          return (m % 12) + 1 === monthNumber || (m === 12 && monthNumber === 1)
        })
        
        if (quarterEndMonth !== undefined) {
          // Calculate quarter info for the quarter that ends in the corresponding month
          // Handle year wraparound for January filing (December quarter end)
          let quarterYear = today.getFullYear()
          if (monthNumber === 1 && quarterEndMonth === 12) {
            quarterYear = today.getFullYear() - 1
          }
          
          const quarterInfo = calculateVATQuarter(client.vatQuarterGroup, new Date(quarterYear, quarterEndMonth - 1, 1))
          
          // Check if this is a historical quarter (before client was added to system)
          if (isHistoricalQuarter(client, quarterInfo.quarterEndDate)) {
            return {
              type: 'historical',
              quarterInfo,
              clientCreatedDate: client.createdAt
            }
          }

          const daysUntilFiling = calculateDaysBetween(today, quarterInfo.filingDueDate)
          
          // Check if there's an active workflow for this specific quarter
          const currentWorkflow = client.currentVATQuarter
          
          if (currentWorkflow && !currentWorkflow.isCompleted && 
              currentWorkflow.quarterPeriod === quarterInfo.quarterPeriod) {
            // Active workflow in progress for this quarter - show in filing month
            return {
              type: 'filing_month',
              stage: currentWorkflow.currentStage,
              quarterInfo,
              daysUntilFiling,
              workflowAssignee: currentWorkflow.assignedUser
            }
          } else if (daysUntilFiling > 0) {
            // Quarter ended, filing period active
            return {
              type: 'filing_period',
              quarterInfo,
              daysUntilFiling
            }
          } else {
            // Filing overdue
            return {
              type: 'filing_overdue',
              quarterInfo,
              daysOverdue: Math.abs(daysUntilFiling)
            }
          }
        } else {
          // Not a filing month for this client
          return {
            type: 'basic',
            status: 'not_applicable'
          }
        }
      } catch (error) {
        console.error('Error calculating quarter info:', error)
      }
    }
    
    // Fallback to basic deadline status
    const deadlineStatus = getDeadlineStatus(client.nextVatReturnDue)
    return {
      type: 'basic',
      status: deadlineStatus,
      nextDue: client.nextVatReturnDue
    }
  }

  const getDeadlineStatus = (nextVatReturnDue?: string) => {
    if (!nextVatReturnDue) return 'unknown'
    
    const today = new Date()
    const dueDate = new Date(nextVatReturnDue)
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'overdue'
    if (diffDays <= 7) return 'urgent'
    if (diffDays <= 30) return 'upcoming'
    return 'future'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive" className="text-xs">Overdue</Badge>
      case 'urgent':
        return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 hover:bg-orange-100">Urgent</Badge>
      case 'upcoming':
        return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100">Upcoming</Badge>
      case 'future':
        return <Badge variant="outline" className="text-xs">Future</Badge>
      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getFrequencyBadge = (frequency?: string, quarterGroup?: string) => {
    if (frequency === 'QUARTERLY' && quarterGroup) {
      return (
        <Badge variant="outline" className="text-xs">
          Quarterly
        </Badge>
      )
    } else if (frequency === 'MONTHLY') {
      return <Badge variant="outline" className="text-xs">Monthly</Badge>
    } else if (frequency === 'ANNUALLY') {
      return <Badge variant="outline" className="text-xs">Annually</Badge>
    }
    return <Badge variant="outline" className="text-xs">Unknown</Badge>
  }

  const getQuarterEndMonth = (client: VATClient, monthNumber?: number): string => {
    // If monthNumber is provided, calculate for that specific month
    if (monthNumber && client.vatQuarterGroup) {
      try {
        const today = new Date()
        const quarterEndMonth = QUARTER_GROUP_MONTHS[client.vatQuarterGroup]?.find(m => {
          return (m % 12) + 1 === monthNumber || (m === 12 && monthNumber === 1)
        })
        
        if (quarterEndMonth !== undefined) {
          let quarterYear = today.getFullYear()
          if (monthNumber === 1 && quarterEndMonth === 12) {
            quarterYear = today.getFullYear() - 1
          }
          
          const quarterInfo = calculateVATQuarter(client.vatQuarterGroup, new Date(quarterYear, quarterEndMonth - 1, 1))
          const endDate = new Date(quarterInfo.quarterEndDate)
          return endDate.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Europe/London' })
        }
      } catch (error) {
        console.error('Error calculating quarter end month:', error)
      }
    }
    
    // Fallback to current quarter
    if (client.currentVATQuarter?.quarterEndDate) {
      const endDate = new Date(client.currentVATQuarter.quarterEndDate)
      return endDate.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Europe/London' })
    }
    return '-'
  }

  const getFilingMonth = (client: VATClient, monthNumber?: number): string => {
    // If monthNumber is provided, calculate for that specific month
    if (monthNumber && client.vatQuarterGroup) {
      try {
        const today = new Date()
        const quarterEndMonth = QUARTER_GROUP_MONTHS[client.vatQuarterGroup]?.find(m => {
          return (m % 12) + 1 === monthNumber || (m === 12 && monthNumber === 1)
        })
        
        if (quarterEndMonth !== undefined) {
          let quarterYear = today.getFullYear()
          if (monthNumber === 1 && quarterEndMonth === 12) {
            quarterYear = today.getFullYear() - 1
          }
          
          const quarterInfo = calculateVATQuarter(client.vatQuarterGroup, new Date(quarterYear, quarterEndMonth - 1, 1))
          const filingDate = new Date(quarterInfo.filingDueDate)
          return filingDate.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Europe/London' })
        }
      } catch (error) {
        console.error('Error calculating filing month:', error)
      }
    }
    
    // Fallback to current quarter
    if (client.currentVATQuarter?.filingDueDate) {
      const filingDate = new Date(client.currentVATQuarter.filingDueDate)
      return filingDate.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Europe/London' })
    }
    return '-'
  }

  const getCurrentWorkflowStage = (client: VATClient, monthNumber?: number): string => {
    // Check if this is a historical quarter (before client was created)
    if (monthNumber && client.vatQuarterGroup) {
      try {
        const today = new Date()
        const quarterEndMonth = QUARTER_GROUP_MONTHS[client.vatQuarterGroup]?.find(m => {
          return (m % 12) + 1 === monthNumber || (m === 12 && monthNumber === 1)
        })
        
        if (quarterEndMonth !== undefined) {
          let quarterYear = today.getFullYear()
          if (monthNumber === 1 && quarterEndMonth === 12) {
            quarterYear = today.getFullYear() - 1
          }
          
          const quarterInfo = calculateVATQuarter(client.vatQuarterGroup, new Date(quarterYear, quarterEndMonth - 1, 1))
          
          // Check if this is a historical quarter
          if (isHistoricalQuarter(client, quarterInfo.quarterEndDate)) {
            return 'Not Applicable'
          }
        }
      } catch (error) {
        console.error('Error checking historical quarter:', error)
      }
    }

    // Check current workflow status
    if (client.currentVATQuarter) {
      if (client.currentVATQuarter.isCompleted || client.currentVATQuarter.currentStage === 'FILED_TO_HMRC') {
        return 'Completed'
      } else if (client.currentVATQuarter.currentStage) {
        return formatWorkflowStage(client.currentVATQuarter.currentStage)
      }
    }
    
    return 'Not Started'
  }

  const getComprehensiveStatus = (client: VATClient): ComprehensiveStatus => {
    const today = new Date()
    
    // If client has quarterly VAT and quarter group, calculate current quarter info
    if (client.vatReturnsFrequency === 'QUARTERLY' && client.vatQuarterGroup) {
      try {
        const quarterInfo = calculateVATQuarter(client.vatQuarterGroup, today)
        const daysUntilQuarterEnd = calculateDaysBetween(today, quarterInfo.quarterEndDate)
        const daysUntilFiling = calculateDaysBetween(today, quarterInfo.filingDueDate)
        
        // Check if there's an active workflow
        const currentWorkflow = client.currentVATQuarter
        
        if (currentWorkflow && !currentWorkflow.isCompleted) {
          // Active workflow in progress
          return {
            type: 'quarter_end_month',
            stage: currentWorkflow.currentStage,
            quarterInfo,
            daysUntilQuarterEnd,
            workflowAssignee: currentWorkflow.assignedUser
          }
        } else if (daysUntilQuarterEnd > 0) {
          // Current quarter is still ongoing
          return {
            type: 'quarter_ongoing',
            quarterInfo,
            daysUntilQuarterEnd,
            daysUntilFiling
          }
        } else if (daysUntilFiling > 0) {
          // Quarter ended, filing period active
          return {
            type: 'filing_period',
            quarterInfo,
            daysUntilFiling
          }
        } else {
          // Filing overdue
          return {
            type: 'filing_overdue',
            quarterInfo,
            daysOverdue: Math.abs(daysUntilFiling)
          }
        }
      } catch (error) {
        console.error('Error calculating quarter info:', error)
      }
    }
    
    // Fallback to basic deadline status
    const deadlineStatus = getDeadlineStatus(client.nextVatReturnDue)
    return {
      type: 'basic',
      status: deadlineStatus,
      nextDue: client.nextVatReturnDue
    }
  }

  const formatWorkflowStage = (stage: string) => {
    const stageMap: { [key: string]: string } = {
      'CLIENT_BOOKKEEPING': 'Records',
      'WORK_IN_PROGRESS': 'In Progress',
      'QUERIES_PENDING': 'Queries',
      'REVIEW_PENDING_MANAGER': 'Manager Review',
      'REVIEW_PENDING_PARTNER': 'Partner Review',
      'EMAILED_TO_PARTNER': 'With Partner',
      'EMAILED_TO_CLIENT': 'With Client',
      'CLIENT_APPROVED': 'Approved',
      'FILED_TO_HMRC': 'Filed'
    }
    return stageMap[stage] || stage
  }

  // Render the comprehensive status display with month awareness
  const renderStatusDisplay = (client: VATClient, monthNumber?: number) => {
    const status = monthNumber ? getMonthSpecificStatus(client, monthNumber) : getComprehensiveStatus(client)
    
    // For month-specific display, we need to get the quarter data for that specific month
    let monthSpecificQuarter = client.currentVATQuarter
    if (monthNumber && client.vatQuarterGroup) {
      try {
        const today = new Date()
        const quarterEndMonth = QUARTER_GROUP_MONTHS[client.vatQuarterGroup]?.find(m => {
          return (m % 12) + 1 === monthNumber || (m === 12 && monthNumber === 1)
        })
        
        if (quarterEndMonth !== undefined) {
          let quarterYear = today.getFullYear()
          if (monthNumber === 1 && quarterEndMonth === 12) {
            quarterYear = today.getFullYear() - 1
          }
          
          const quarterInfo = calculateVATQuarter(client.vatQuarterGroup, new Date(quarterYear, quarterEndMonth - 1, 1))
          
          // Check if client has a quarter matching this period
          // This would need to be fetched from the server in a real implementation
          // For now, only use currentVATQuarter if it matches this period
          if (client.currentVATQuarter && client.currentVATQuarter.quarterPeriod === quarterInfo.quarterPeriod) {
            monthSpecificQuarter = client.currentVATQuarter
          } else {
            // No quarter exists for this month - show as not started
            monthSpecificQuarter = undefined
          }
        }
      } catch (error) {
        console.error('Error getting month-specific quarter:', error)
      }
    }
    
    // Helper function to get milestone tooltip content
    const getMilestoneTooltip = (currentQuarter?: VATClient['currentVATQuarter']) => {
      if (!currentQuarter) return null
      
      const milestones = []
      if (currentQuarter.chaseStartedDate) {
        milestones.push(`Chase Started: ${formatDate(currentQuarter.chaseStartedDate)} (${currentQuarter.chaseStartedByUserName})`)
      }
      if (currentQuarter.paperworkReceivedDate) {
        milestones.push(`Paperwork Received: ${formatDate(currentQuarter.paperworkReceivedDate)} (${currentQuarter.paperworkReceivedByUserName})`)
      }
      if (currentQuarter.workStartedDate) {
        milestones.push(`Work Started: ${formatDate(currentQuarter.workStartedDate)} (${currentQuarter.workStartedByUserName})`)
      }
      if (currentQuarter.workFinishedDate) {
        milestones.push(`Work Finished: ${formatDate(currentQuarter.workFinishedDate)} (${currentQuarter.workFinishedByUserName})`)
      }
      if (currentQuarter.sentToClientDate) {
        milestones.push(`Sent to Client: ${formatDate(currentQuarter.sentToClientDate)} (${currentQuarter.sentToClientByUserName})`)
      }
      if (currentQuarter.clientApprovedDate) {
        milestones.push(`Client Approved: ${formatDate(currentQuarter.clientApprovedDate)} (${currentQuarter.clientApprovedByUserName})`)
      }
      if (currentQuarter.filedToHMRCDate) {
        milestones.push(`Filed to HMRC: ${formatDate(currentQuarter.filedToHMRCDate)} (${currentQuarter.filedToHMRCByUserName})`)
      }
      
      if (milestones.length === 0) return null
      
      return milestones.join('\n')
    }

    switch (status.type) {
      case 'quarter_end_month':
        const milestoneTooltip = getMilestoneTooltip(monthSpecificQuarter)
        const latestMilestone = (() => {
          const quarter = monthSpecificQuarter
          if (!quarter) return null
          
          // Find the most recent milestone date
          const milestones = [
            { date: quarter.filedToHMRCDate, label: 'Filed' },
            { date: quarter.clientApprovedDate, label: 'Approved' },
            { date: quarter.sentToClientDate, label: 'Sent' },
            { date: quarter.workFinishedDate, label: 'Finished' },
            { date: quarter.workStartedDate, label: 'Started' },
            { date: quarter.paperworkReceivedDate, label: 'Received' },
            { date: quarter.chaseStartedDate, label: 'Chase' }
          ].filter(m => m.date).sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
          
          return milestones[0] || null
        })()

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                Quarter End Month
              </Badge>
              {status.workflowAssignee && (
                <span className="text-xs text-muted-foreground">
                  ({status.workflowAssignee.name})
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatWorkflowStage(status.stage)} • Q: {status.daysUntilQuarterEnd > 0 ? `${status.daysUntilQuarterEnd}d` : 'Ended'}
            </div>
            {latestMilestone && (
              <div 
                className="text-xs text-blue-600 cursor-help"
                title={milestoneTooltip || undefined}
              >
                Latest: {latestMilestone.label} ({formatDate(latestMilestone.date)})
              </div>
            )}
          </div>
        )

      case 'filing_month':
        const filingMilestoneTooltip = getMilestoneTooltip(monthSpecificQuarter)
        const filingLatestMilestone = (() => {
          const quarter = monthSpecificQuarter
          if (!quarter) return null
          
          // Find the most recent milestone date
          const milestones = [
            { date: quarter.filedToHMRCDate, label: 'Filed' },
            { date: quarter.clientApprovedDate, label: 'Approved' },
            { date: quarter.sentToClientDate, label: 'Sent' },
            { date: quarter.workFinishedDate, label: 'Finished' },
            { date: quarter.workStartedDate, label: 'Started' },
            { date: quarter.paperworkReceivedDate, label: 'Received' },
            { date: quarter.chaseStartedDate, label: 'Chase' }
          ].filter(m => m.date).sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
          
          return milestones[0] || null
        })()

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                Filing Month
              </Badge>
              {status.workflowAssignee && (
                <span className="text-xs text-muted-foreground">
                  ({status.workflowAssignee.name})
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatWorkflowStage(status.stage)} • Filing: {status.daysUntilFiling > 0 ? `${status.daysUntilFiling}d` : 'Due'}
            </div>
            {filingLatestMilestone && (
              <div 
                className="text-xs text-orange-600 cursor-help"
                title={filingMilestoneTooltip || undefined}
              >
                Latest: {filingLatestMilestone.label} ({formatDate(filingLatestMilestone.date)})
              </div>
            )}
          </div>
        )

      case 'quarter_ongoing':
        return (
          <div className="space-y-1">
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
              Current Quarter
            </Badge>
            <div className="text-xs text-muted-foreground">
              Q: {status.daysUntilQuarterEnd}d • Filing: {status.daysUntilFiling}d
            </div>
          </div>
        )

      case 'filing_period':
        return (
          <div className="space-y-1">
            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
              Filing Period
            </Badge>
            <div className="text-xs text-muted-foreground">
              Filing: {status.daysUntilFiling}d
            </div>
          </div>
        )

      case 'filing_overdue':
        return (
          <div className="space-y-1">
            <Badge variant="destructive" className="text-xs">
              Overdue
            </Badge>
            <div className="text-xs text-red-600">
              {status.daysOverdue}d overdue
            </div>
          </div>
        )

      case 'historical':
        return (
          <div className="space-y-1">
            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
              Not Applicable
            </Badge>
            <div className="text-xs text-muted-foreground">
              Client added: {formatDate(status.clientCreatedDate)}
            </div>
          </div>
        )

      case 'basic':
        return (
          <div className="space-y-1">
            {getStatusBadge(status.status)}
            {status.nextDue && (
              <div className="text-xs text-muted-foreground">
                Due: {formatDate(status.nextDue)}
              </div>
            )}
          </div>
        )

      default:
        return <Badge variant="outline" className="text-xs">Unknown</Badge>
    }
  }

  const sortClients = (key: string) => {
    if (currentSort === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setCurrentSort(key)
      setSortOrder('asc')
    }
  }

  const handleOpenWorkflowModal = async (client: VATClient) => {
    try {
      setLoading(true)
      
      // Check if we're trying to open a workflow for a historical quarter
      // This can happen when clicking "Manage Workflow" from older months
      const today = new Date()
      const currentYear = today.getFullYear()
      const currentMonth = today.getMonth() + 1
      
      // For month-specific context, check if the current viewing month is historical
      if (activeMonth) {
        const viewingMonth = MONTHS.find(m => m.key === activeMonth)?.number
        if (viewingMonth && client.vatQuarterGroup) {
          try {
            const quarterInfo = calculateVATQuarter(client.vatQuarterGroup, new Date(currentYear, viewingMonth - 1, 1))
            const quarterEndMonth = new Date(quarterInfo.quarterEndDate).getMonth() + 1
            
            // If this month matches the quarter end month and it's historical
            if (quarterEndMonth === viewingMonth && isHistoricalQuarter(client, quarterInfo.quarterEndDate)) {
              showToast.error('Cannot manage workflow for historical quarters. This quarter ended before the client was added to the system.')
              return
            }
          } catch (error) {
            console.error('Error checking historical quarter:', error)
          }
        }
      }
      
      // If client has current VAT quarter, use it
      if (client.currentVATQuarter) {
        // Fetch full quarter details with workflow history
        const response = await fetch(`/api/clients/${client.id}/vat-quarters`)
        const data = await response.json()
        
        if (data.success && data.quarters.length > 0) {
          // Find the current quarter (not completed)
          const currentQuarter = data.quarters.find((q: any) => !q.isCompleted) || data.quarters[0]
          setSelectedVATQuarter({
            ...currentQuarter,
            client: {
              id: client.id,
              companyName: client.companyName,
              vatQuarterGroup: client.vatQuarterGroup
            }
          })
        } else {
          throw new Error('No VAT quarters found')
        }
      } else {
        // Create a new VAT quarter for this client
        const response = await fetch(`/api/clients/${client.id}/vat-quarters`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quarterGroup: client.vatQuarterGroup
          })
        })
        
        const data = await response.json()
        
        if (data.success) {
          setSelectedVATQuarter({
            ...data.data,
            client: {
              id: client.id,
              companyName: client.companyName,
              vatQuarterGroup: client.vatQuarterGroup
            }
          })
          
          // Refresh the client list to show the new quarter
          hasFetchedRef.current = false
          fetchVATClients()
        } else {
          throw new Error(data.error || 'Failed to create VAT quarter')
        }
      }
      
      setWorkflowModalOpen(true)
    } catch (error: any) {
      console.error('Error opening workflow modal:', error)
      showToast.error(error.message || 'Failed to open workflow modal')
    } finally {
      setLoading(false)
    }
  }

  const handleWorkflowUpdate = (updatedQuarter: any) => {
    // Update the local state
    setVatClients(prevClients => 
      prevClients.map(client => {
        if (client.id === updatedQuarter.clientId) {
          return {
            ...client,
            currentVATQuarter: updatedQuarter
          }
        }
        return client
      })
    )
    
    // Update the selected quarter for the modal
    setSelectedVATQuarter(updatedQuarter)
    
    showToast.success('VAT workflow updated successfully')
  }

  // Render month tab content
  const renderMonthContent = (monthNumber: number) => {
    const monthClients = getClientsForMonth(monthNumber)
    const monthName = MONTHS.find(m => m.number === monthNumber)?.name || 'Unknown'

    if (loading) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>Loading VAT clients...</p>
        </div>
      )
    }

    if (monthClients.length === 0) {
      const isCurrentMonth = monthNumber === new Date().getMonth() + 1
      const quarterGroup = findQuarterGroup(monthNumber)
      
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-lg font-medium mb-2">No VAT clients for {monthName}</p>
          <div className="space-y-2 text-sm max-w-md mx-auto">
            <p>
              Clients with quarterly VAT returns due in {monthName} will appear here.
            </p>
            {quarterGroup !== 'unknown' && (
              <p>
                This month belongs to the <Badge variant="outline" className="mx-1">{quarterGroup}</Badge> quarter group.
              </p>
            )}
            {isCurrentMonth && quarterGroup !== 'unknown' && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                <p className="text-blue-800 font-medium">📅 Current Month</p>
                <p className="text-blue-700 text-xs mt-1">
                  Add clients with {quarterGroup} quarter group to see them here.
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="clients-table-container">
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <table className="table-fixed-layout table-compact">
            <thead>
              <tr className="table-header-row">
                <SortableHeader sortKey="clientCode" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients} className="col-vat-client-code">
                  Code
                </SortableHeader>
                <SortableHeader sortKey="companyName" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients} className="col-vat-company-name">
                  Company Name
                </SortableHeader>
                <th className="table-header-cell col-vat-frequency">Freq</th>
                <th className="table-header-cell col-vat-quarter-end">Quarter End</th>
                <th className="table-header-cell col-vat-filing-month">Filing Month</th>
                <th className="table-header-cell col-vat-workflow-stage">Current Stage</th>
                <th className="table-header-cell col-vat-status">Status</th>
                <th className="table-header-cell col-vat-contact">Contact</th>
                <SortableHeader sortKey="assignedUser" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients} className="col-vat-assigned">
                  VAT Assigned
                </SortableHeader>
                <th className="table-header-cell col-vat-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {monthClients.map((client) => (
                <tr key={client.id} className="table-row">
                  <td className="table-cell col-vat-client-code">
                    <span className="truncate" title={client.clientCode}>
                      {client.clientCode}
                    </span>
                  </td>
                  <td className="table-cell col-vat-company-name">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="truncate" title={client.companyName}>
                        {client.companyName}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell col-vat-frequency">
                    {getFrequencyBadge(client.vatReturnsFrequency, client.vatQuarterGroup)}
                  </td>
                  <td className="table-cell col-vat-quarter-end">
                    <span className="text-xs" title={client.currentVATQuarter?.quarterEndDate ? formatDate(client.currentVATQuarter.quarterEndDate) : undefined}>
                      {getQuarterEndMonth(client, monthNumber)}
                    </span>
                  </td>
                  <td className="table-cell col-vat-filing-month">
                    <span className="text-xs" title={client.currentVATQuarter?.filingDueDate ? formatDate(client.currentVATQuarter.filingDueDate) : undefined}>
                      {getFilingMonth(client, monthNumber)}
                    </span>
                  </td>
                  <td className="table-cell col-vat-workflow-stage">
                    {(() => {
                      const stage = getCurrentWorkflowStage(client, monthNumber)
                      if (stage === 'Not Applicable') {
                        return <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">N/A</Badge>
                      } else if (stage === 'Completed') {
                        return <Badge variant="outline" className="text-xs bg-green-100 text-green-700">Completed</Badge>
                      } else if (stage === 'Not Started') {
                        return <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">Not Started</Badge>
                      } else {
                        return <Badge variant="secondary" className="text-xs">{stage}</Badge>
                      }
                    })()}
                  </td>
                  <td className="table-cell col-vat-status">
                    {renderStatusDisplay(client, monthNumber)}
                  </td>
                  <td className="table-cell col-vat-contact">
                    <div className="flex items-center gap-1">
                      {client.contactEmail && (
                        <a 
                          href={`mailto:${client.contactEmail}`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={client.contactEmail}
                        >
                          <Mail className="h-3 w-3" />
                        </a>
                      )}
                      {client.contactPhone && (
                        <a 
                          href={`tel:${client.contactPhone}`}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title={client.contactPhone}
                        >
                          <Phone className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="table-cell col-vat-assigned">
                    <span className="truncate text-xs" title={
                      client.currentVATQuarter?.assignedUser?.name || 
                      client.vatAssignedUser?.name || 
                      'Unassigned'
                    }>
                      {client.currentVATQuarter?.assignedUser?.name || 
                       client.vatAssignedUser?.name || 
                       'Unassigned'}
                    </span>
                  </td>
                  <td className="table-cell col-vat-actions">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                        title="View Details"
                      >
                        <Eye className="action-trigger-icon" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="More Actions"
                          >
                            <MoreHorizontal className="action-trigger-icon" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenWorkflowModal(client)}>
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Manage Workflow
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/clients/${client.id}/edit`}>
                              <FileText className="mr-2 h-4 w-4" />
                              Edit Client
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {monthClients.map((client) => (
            <Card key={client.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium text-sm">{client.companyName}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Code: {client.clientCode}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenWorkflowModal(client)}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Manage Workflow
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/clients/${client.id}/edit`}>
                          <FileText className="mr-2 h-4 w-4" />
                          Edit Client
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Frequency:</span>
                    <div className="mt-1">
                      {getFrequencyBadge(client.vatReturnsFrequency, client.vatQuarterGroup)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quarter End:</span>
                    <p className="mt-1">{getQuarterEndMonth(client, monthNumber)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Filing Month:</span>
                    <p className="mt-1">{getFilingMonth(client, monthNumber)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Stage:</span>
                    <div className="mt-1">
                      {(() => {
                        const stage = getCurrentWorkflowStage(client, monthNumber)
                        if (stage === 'Not Applicable') {
                          return <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">N/A</Badge>
                        } else if (stage === 'Completed') {
                          return <Badge variant="outline" className="text-xs bg-green-100 text-green-700">Completed</Badge>
                        } else if (stage === 'Not Started') {
                          return <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">Not Started</Badge>
                        } else {
                          return <Badge variant="secondary" className="text-xs">{stage}</Badge>
                        }
                      })()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">VAT Assigned:</span>
                    <p className="mt-1 truncate">
                      {client.currentVATQuarter?.assignedUser?.name || 
                       client.vatAssignedUser?.name || 
                       'Unassigned'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-muted-foreground text-xs">Status:</span>
                  <div className="mt-1">
                    {renderStatusDisplay(client, monthNumber)}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {client.contactEmail && (
                      <a 
                        href={`mailto:${client.contactEmail}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title={client.contactEmail}
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    )}
                    {client.contactPhone && (
                      <a 
                        href={`tel:${client.contactPhone}`}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title={client.contactPhone}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenWorkflowModal(client)}
                  >
                    <TrendingUp className="mr-2 h-3 w-3" />
                    Workflow
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">VAT Deadline Tracker</h1>
              <p className="text-muted-foreground">
                Track VAT deadlines by month for quarterly clients • 
                {vatClients.length} total clients • 
                Current month: {MONTHS.find(m => m.number === new Date().getMonth() + 1)?.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  hasFetchedRef.current = false
                  fetchVATClients()
                }}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stage Analytics Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                VAT Workflow Analytics
              </CardTitle>
              <CardDescription>
                Current workflow stage distribution across all VAT clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {(() => {
                  const analytics = getStageAnalytics()
                  const stageLabels: { [key: string]: { label: string; color: string } } = {
                    'CHASE_STARTED': { label: 'Chase Started', color: 'bg-blue-100 text-blue-800' },
                    'PAPERWORK_RECEIVED': { label: 'Paperwork Received', color: 'bg-green-100 text-green-800' },
                    'WORK_STARTED': { label: 'Work Started', color: 'bg-yellow-100 text-yellow-800' },
                    'WORK_FINISHED': { label: 'Work Finished', color: 'bg-purple-100 text-purple-800' },
                    'SENT_TO_CLIENT': { label: 'Sent to Client', color: 'bg-orange-100 text-orange-800' },
                    'CLIENT_APPROVED': { label: 'Client Approved', color: 'bg-indigo-100 text-indigo-800' },
                    'FILED_TO_HMRC': { label: 'Filed to HMRC', color: 'bg-emerald-100 text-emerald-800' },
                    'no_active_workflow': { label: 'No Active Workflow', color: 'bg-gray-100 text-gray-800' }
                  }
                  
                  return Object.entries(analytics).map(([stage, count]) => {
                    const stageInfo = stageLabels[stage] || { label: stage, color: 'bg-gray-100 text-gray-800' }
                    return (
                      <div key={stage} className="text-center">
                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${stageInfo.color} font-bold text-lg`}>
                          {count}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 leading-tight">
                          {stageInfo.label}
                        </p>
                      </div>
                    )
                  })
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Month-based Tabs */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>VAT Filing Schedule</CardTitle>
              <CardDescription>
                Clients shown in their VAT filing months (month after quarter end). 
                Example: Quarter ending June 30th → Filing due in July.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeMonth} onValueChange={setActiveMonth} className="w-full">
                {/* Month Tabs with Filing Due Counts */}
                <div className="border-b bg-muted/30">
                  <div className="px-6 py-3">
                    <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 h-auto bg-transparent p-0 gap-1">
                      {MONTHS.map((month) => {
                        const filingDueCount = getFilingDueCount(month.number)
                        return (
                          <TabsTrigger 
                            key={month.key} 
                            value={month.key}
                            className="flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all hover:bg-background/50"
                          >
                            <span className="font-semibold text-[11px] leading-tight">
                              {month.short}
                            </span>
                            {filingDueCount > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <Badge 
                                  variant="secondary" 
                                  className="h-5 w-auto min-w-[20px] px-1.5 text-[10px] font-medium bg-orange-100 text-orange-800 border-0"
                                >
                                  {filingDueCount}
                                </Badge>
                                <span className="text-[9px] text-muted-foreground leading-none">
                                  filing{filingDueCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            ) : (
                              <div className="h-5" />
                            )}
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </div>
                </div>
                
                {/* Month Content - Properly Aligned */}
                {MONTHS.map((month) => (
                  <TabsContent key={month.key} value={month.key} className="mt-0 focus-visible:outline-none">
                    <div className="px-6 py-4">
                      {renderMonthContent(month.number)}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* VAT Workflow Modal */}
      {selectedVATQuarter && (
        <VATWorkflowModal
          isOpen={workflowModalOpen}
          onClose={() => {
            setWorkflowModalOpen(false)
            setSelectedVATQuarter(null)
          }}
          onUpdate={handleWorkflowUpdate}
          vatQuarter={selectedVATQuarter}
          availableUsers={availableUsers}
        />
      )}
    </div>
  )
}
