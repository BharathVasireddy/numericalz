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
import { VATBulkOperations } from './vat-bulk-operations'

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
  assignedUser?: {
    id: string
    name: string
    email: string
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
    <th 
      className={`table-header-cell cursor-pointer hover:text-foreground ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{children}</span>
        {isActive ? (
          sortOrder === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </div>
    </th>
  )
}

// Define types for comprehensive status
type ComprehensiveStatus = 
  | {
      type: 'workflow'
      stage: string
      quarterInfo: any
      daysUntilQuarterEnd: number
      daysUntilFiling: number
      workflowAssignee?: {
        id: string
        name: string
        email: string
      }
    }
  | {
      type: 'current_quarter'
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
      type: 'basic'
      status: string
      nextDue?: string
    }

// Month configuration
const MONTHS = [
  { key: 'jan', name: 'January', number: 1 },
  { key: 'feb', name: 'February', number: 2 },
  { key: 'mar', name: 'March', number: 3 },
  { key: 'apr', name: 'April', number: 4 },
  { key: 'may', name: 'May', number: 5 },
  { key: 'jun', name: 'June', number: 6 },
  { key: 'jul', name: 'July', number: 7 },
  { key: 'aug', name: 'August', number: 8 },
  { key: 'sep', name: 'September', number: 9 },
  { key: 'oct', name: 'October', number: 10 },
  { key: 'nov', name: 'November', number: 11 },
  { key: 'dec', name: 'December', number: 12 }
]

// Quarter group to months mapping
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

  // Filter clients by selected month
  const getClientsForMonth = (monthNumber: number) => {
    return vatClients.filter(client => {
      // Only show quarterly VAT clients with quarter groups
      if (client.vatReturnsFrequency !== 'QUARTERLY' || !client.vatQuarterGroup) {
        return false
      }

      // Check if this client's quarter group includes the selected month
      const quarterMonths = QUARTER_GROUP_MONTHS[client.vatQuarterGroup] || []
      return quarterMonths.includes(monthNumber)
    })
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
            type: 'workflow',
            stage: currentWorkflow.currentStage,
            quarterInfo,
            daysUntilQuarterEnd,
            daysUntilFiling,
            workflowAssignee: currentWorkflow.assignedUser
          }
        } else if (daysUntilQuarterEnd > 0) {
          // Current quarter is still ongoing
          return {
            type: 'current_quarter',
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

  // Render the comprehensive status display
  const renderStatusDisplay = (client: VATClient) => {
    const status = getComprehensiveStatus(client)
    
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
      case 'workflow':
        const milestoneTooltip = getMilestoneTooltip(client.currentVATQuarter)
        const latestMilestone = (() => {
          const quarter = client.currentVATQuarter
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
              <Badge variant="outline" className="text-xs">
                {formatWorkflowStage(status.stage)}
              </Badge>
              {status.workflowAssignee && (
                <span className="text-xs text-muted-foreground">
                  ({status.workflowAssignee.name})
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Q: {status.daysUntilQuarterEnd > 0 ? `${status.daysUntilQuarterEnd}d` : 'Ended'} • 
              Filing: {status.daysUntilFiling > 0 ? `${status.daysUntilFiling}d` : `${Math.abs(status.daysUntilFiling)}d overdue`}
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

      case 'current_quarter':
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
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg font-medium">No VAT clients for {monthName}</p>
          <p className="text-sm mt-2">
            Clients with quarterly VAT returns due in {monthName} will appear here.
          </p>
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
                <SortableHeader sortKey="vatReturnsFrequency" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients} className="col-vat-frequency">
                  Frequency
                </SortableHeader>
                <SortableHeader sortKey="status" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients} className="col-vat-status">
                  Status
                </SortableHeader>
                <SortableHeader sortKey="assignedUser" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients} className="col-vat-assigned">
                  Assigned
                </SortableHeader>
                <th className="table-header-cell col-vat-actions text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {monthClients
                .sort((a, b) => {
                  if (!currentSort) {
                    // Default sort by deadline status priority
                    const statusOrder = { 'overdue': 0, 'urgent': 1, 'upcoming': 2, 'future': 3, 'unknown': 4 }
                    const aStatus = getDeadlineStatus(a.nextVatReturnDue)
                    const bStatus = getDeadlineStatus(b.nextVatReturnDue)
                    return statusOrder[aStatus as keyof typeof statusOrder] - statusOrder[bStatus as keyof typeof statusOrder]
                  }
                  
                  let aValue: any = a[currentSort as keyof VATClient]
                  let bValue: any = b[currentSort as keyof VATClient]
                  
                  // Handle special sorting cases
                  if (currentSort === 'assignedUser') {
                    aValue = a.assignedUser?.name || ''
                    bValue = b.assignedUser?.name || ''
                  } else if (currentSort === 'nextVatReturnDue') {
                    aValue = a.nextVatReturnDue ? new Date(a.nextVatReturnDue).getTime() : 0
                    bValue = b.nextVatReturnDue ? new Date(b.nextVatReturnDue).getTime() : 0
                  } else if (currentSort === 'status') {
                    const statusOrder = { 'overdue': 0, 'urgent': 1, 'upcoming': 2, 'future': 3, 'unknown': 4 }
                    aValue = statusOrder[getDeadlineStatus(a.nextVatReturnDue) as keyof typeof statusOrder]
                    bValue = statusOrder[getDeadlineStatus(b.nextVatReturnDue) as keyof typeof statusOrder]
                  }
                  
                  // Convert to string for consistent comparison
                  if (typeof aValue === 'string' && typeof bValue === 'string') {
                    aValue = aValue.toLowerCase()
                    bValue = bValue.toLowerCase()
                  }
                  
                  if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
                  if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
                  return 0
                })
                .map((client) => (
                  <tr key={client.id} className="table-body-row">
                    <td className="table-body-cell">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {client.clientCode || 'N/A'}
                      </span>
                    </td>
                    <td className="table-body-cell">
                      <div className="w-full">
                        <button
                          onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                          className="text-left w-full hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors group"
                        >
                          <div className="font-medium text-sm truncate group-hover:text-primary" title={client.companyName}>
                            {client.companyName}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {client.companyType === 'LIMITED_COMPANY' ? 'Ltd Co' :
                             client.companyType === 'NON_LIMITED_COMPANY' ? 'Non Ltd' :
                             client.companyType === 'DIRECTOR' ? 'Director' :
                             client.companyType === 'SUB_CONTRACTOR' ? 'Sub Con' :
                             client.companyType}
                          </div>
                        </button>
                      </div>
                    </td>
                    <td className="table-body-cell">
                      {getFrequencyBadge(client.vatReturnsFrequency, client.vatQuarterGroup)}
                    </td>
                    <td className="table-body-cell">
                      {renderStatusDisplay(client)}
                    </td>
                    <td className="table-body-cell">
                      {client.assignedUser ? (
                        <div className="text-xs">
                          <div className="font-medium truncate" title={`${client.assignedUser.name} (${client.assignedUser.email})`}>
                            {client.assignedUser.name}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="table-actions-cell">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="action-trigger-button">
                            <MoreHorizontal className="action-trigger-icon" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleOpenWorkflowModal(client)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <TrendingUp className="h-4 w-4" />
                            Manage Workflow
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block lg:hidden space-y-4 p-4">
          {monthClients.map((client) => (
            <Card key={client.id} className="mobile-client-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      className="text-left w-full group"
                    >
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary" title={client.companyName}>
                        {client.companyName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {client.clientCode} • {client.companyType === 'LIMITED_COMPANY' ? 'Ltd Co' : client.companyType}
                      </p>
                    </button>
                  </div>
                  <div className="ml-2">
                    {renderStatusDisplay(client)}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency:</span>
                    {getFrequencyBadge(client.vatReturnsFrequency, client.vatQuarterGroup)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Due:</span>
                    <span className={`font-mono ${
                      getDeadlineStatus(client.nextVatReturnDue) === 'overdue' ? 'text-red-600 font-medium' :
                      getDeadlineStatus(client.nextVatReturnDue) === 'urgent' ? 'text-amber-600 font-medium' :
                      'text-foreground'
                    }`}>
                      {formatDate(client.nextVatReturnDue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned To:</span>
                    <span>{client.assignedUser?.name || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    {client.contactEmail && (
                      <button
                        onClick={() => window.open(`mailto:${client.contactEmail}`, '_blank')}
                        className="p-1 hover:bg-accent rounded transition-colors"
                        title={client.contactEmail}
                      >
                        <Mail className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                    {client.contactPhone && (
                      <button
                        onClick={() => window.open(`tel:${client.contactPhone}`, '_blank')}
                        className="p-1 hover:bg-accent rounded transition-colors"
                        title={client.contactPhone}
                      >
                        <Phone className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenWorkflowModal(client)}
                    className="text-xs"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Workflow
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">VAT Deadline Tracker</h1>
          <p className="text-muted-foreground">Track VAT deadlines by month for quarterly clients</p>
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
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/dashboard/clients/add">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Month-based Tabs */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>VAT Deadlines by Month</CardTitle>
          <CardDescription>
            Clients are shown in their quarter end months. 
            3/6/9/12 group appears in Mar/Jun/Sep/Dec, 
            1/4/7/10 group appears in Jan/Apr/Jul/Oct, 
            2/5/8/11 group appears in Feb/May/Aug/Nov.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeMonth} onValueChange={setActiveMonth} className="w-full">
            {/* Month Tabs - Better Aligned */}
            <div className="border-b bg-muted/30">
              <div className="px-6 py-3">
                <TabsList className="grid w-full grid-cols-6 lg:grid-cols-12 h-auto bg-transparent p-0 gap-1">
                  {MONTHS.map((month) => {
                    const monthClients = getClientsForMonth(month.number)
                    return (
                      <TabsTrigger 
                        key={month.key} 
                        value={month.key}
                        className="flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md transition-all hover:bg-background/50"
                      >
                        <span className="font-semibold">
                          {month.key.toUpperCase()}
                        </span>
                        {monthClients.length > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="h-5 w-auto min-w-[20px] px-1.5 text-[10px] font-medium bg-primary/10 text-primary border-0"
                          >
                            {monthClients.length}
                          </Badge>
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

      {/* VAT Workflow Modal */}
      {workflowModalOpen && selectedVATQuarter && (
        <VATWorkflowModal
          isOpen={workflowModalOpen}
          onClose={() => setWorkflowModalOpen(false)}
          onUpdate={handleWorkflowUpdate}
          vatQuarter={selectedVATQuarter}
          availableUsers={availableUsers}
        />
      )}
    </div>
  )
}
