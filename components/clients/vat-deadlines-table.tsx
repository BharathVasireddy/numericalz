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
  ArrowUpDown
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
  vatReturnsFrequency?: string
  vatQuarterGroup?: string
  createdAt: string // Client creation date to determine if old quarters are applicable
  
  // VAT-specific assignee
  vatAssignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  
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

interface User {
  id: string
  name: string
  email: string
  role: string
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  { key: 'CLIENT_BOOKKEEPING', label: 'Self Filing', icon: <User className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'PAPERWORK_CHASED', label: 'Paperwork chased', icon: <Phone className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'PAPERWORK_RECEIVED', label: 'Paperwork received', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'WORK_IN_PROGRESS', label: 'Work in progress', icon: <Clock className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'QUERIES_PENDING', label: 'Queries pending', icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'REVIEW_PENDING_MANAGER', label: 'Review pending by manager', icon: <UserCheck className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
  { key: 'REVIEW_PENDING_PARTNER', label: 'Review pending by partner', icon: <UserCheck className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  { key: 'WORK_FINISHED', label: 'Work finished', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'EMAILED_TO_PARTNER', label: 'Emailed to partner', icon: <Send className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-800' },
  { key: 'EMAILED_TO_CLIENT', label: 'Emailed to client', icon: <Send className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-800' },
  { key: 'CLIENT_APPROVED', label: 'Client approved', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800' },
  { key: 'FILED_TO_HMRC', label: 'Filed to HMRC', icon: <Building className="h-4 w-4" />, color: 'bg-green-100 text-green-800' }
]

// Month configuration for tabs
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

export function VATDeadlinesTable() {
  const { data: session } = useSession()
  const router = useRouter()
  const [vatClients, setVatClients] = useState<VATClient[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<VATClient | null>(null)
  const [selectedStage, setSelectedStage] = useState<string | undefined>(undefined)
  const [selectedAssignee, setSelectedAssignee] = useState<string>('unassigned')
  const [updateComments, setUpdateComments] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [activeMonth, setActiveMonth] = useState<string>('')
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedHistoryClient, setSelectedHistoryClient] = useState<VATClient | null>(null)
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

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

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()

      if (data.success) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  useEffect(() => {
    fetchVATClients()
    fetchUsers()
  }, [fetchVATClients, fetchUsers])

  // Get clients for specific filing month
  const getClientsForMonth = useCallback((monthNumber: number) => {
    if (!vatClients || !Array.isArray(vatClients)) return []
    
    return vatClients.filter(client => {
      if (!client.vatQuarterGroup) return false
      
      return isVATFilingMonth(client.vatQuarterGroup, monthNumber)
    })
  }, [vatClients])

  // Get quarter that files in a specific month for a client
  const getQuarterForMonth = useCallback((client: VATClient, monthNumber: number): VATQuarter | null => {
    if (!client.vatQuarterGroup || !isVATFilingMonth(client.vatQuarterGroup, monthNumber)) {
      return null
    }

    // Calculate the quarter that files in this month
    // Filing month is the month AFTER quarter end, so quarter ends in previous month
    const quarterEndMonth = monthNumber === 1 ? 12 : monthNumber - 1
    const currentYear = new Date().getFullYear()
    const quarterEndYear = monthNumber === 1 ? currentYear - 1 : currentYear
    
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
    return {
      id: `calculated-${client.id}-${quarterInfo.quarterPeriod}`,
      quarterPeriod: quarterInfo.quarterPeriod,
      quarterStartDate: quarterInfo.quarterStartDate.toISOString(),
      quarterEndDate: quarterInfo.quarterEndDate.toISOString(),
      filingDueDate: quarterInfo.filingDueDate.toISOString(),
      currentStage: 'CLIENT_BOOKKEEPING',
      isCompleted: false,
      assignedUser: client.vatAssignedUser
    }
  }, [vatClients])

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

  const getDueStatus = (quarter: VATQuarter | null, client?: VATClient) => {
    if (!quarter) return { label: 'No Quarter', color: 'text-gray-500' }
    
    const quarterEndDate = new Date(quarter.quarterEndDate)
    const filingDueDate = new Date(quarter.filingDueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Check if this quarter is from before the client was created
    // If so, mark as "Not Applicable" instead of overdue
    if (client?.createdAt) {
      const clientCreatedDate = new Date(client.createdAt)
      clientCreatedDate.setHours(0, 0, 0, 0)
      
      // If the quarter's filing due date was before the client was created,
      // then this client was not responsible for this quarter
      if (filingDueDate < clientCreatedDate) {
        return { 
          label: 'Not Applicable', 
          color: 'text-gray-500' 
        }
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
    if (!sortColumn) return clients

    return [...clients].sort((a, b) => {
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
          aValue = aQuarter?.assignedUser?.name || a.vatAssignedUser?.name || 'Unassigned'
          bValue = bQuarter?.assignedUser?.name || b.vatAssignedUser?.name || 'Unassigned'
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
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedRows(newExpanded)
  }

  const handleAddUpdate = (client: VATClient) => {
    setSelectedClient(client)
    setSelectedStage(undefined)
    setSelectedAssignee(client.vatAssignedUser?.id || 'unassigned')
    setUpdateComments('')
    setUpdateModalOpen(true)
  }

  const handleOpenHistory = (client: VATClient) => {
    setSelectedHistoryClient(client)
    setHistoryModalOpen(true)
  }

  const handleSubmitUpdate = async () => {
    if (!selectedClient || (!selectedStage && selectedAssignee === (selectedClient?.vatAssignedUser?.id || 'unassigned'))) {
      showToast.error('Please select a stage to update or assign a user')
      return
    }

    setUpdating(true)
    try {
      let assignmentUpdated = false
      
      // Handle assignment if assignee changed
      if (selectedAssignee !== (selectedClient.vatAssignedUser?.id || 'unassigned')) {
        const assignResponse = await fetch(`/api/clients/${selectedClient.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: selectedAssignee === 'unassigned' ? null : selectedAssignee
          })
        })

        if (!assignResponse.ok) {
          throw new Error('Failed to assign user')
        }
        
        assignmentUpdated = true
        
        // Update local state immediately for responsive UI
        const assignedUser = selectedAssignee === 'unassigned' ? null : users.find(u => u.id === selectedAssignee)
        setVatClients(prevClients => 
          prevClients.map(client => {
            if (client.id === selectedClient.id) {
              return {
                ...client,
                vatAssignedUser: assignedUser || undefined
              }
            }
            return client
          })
        )
      }

      // Handle workflow stage update if stage selected
      if (selectedStage && selectedClient.currentVATQuarter) {
        const workflowResponse = await fetch(`/api/vat-quarters/${selectedClient.currentVATQuarter.id}/workflow`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: selectedStage,
            comments: updateComments,
            assignedUserId: selectedAssignee === 'unassigned' ? null : selectedAssignee
          })
        })

        if (!workflowResponse.ok) {
          throw new Error('Failed to update workflow stage')
        }
      }

      showToast.success('Update completed successfully')
      setUpdateModalOpen(false)
      
      // Force refresh data from server to ensure consistency
      await fetchVATClients(true)
      
    } catch (error) {
      console.error('Error updating:', error)
      showToast.error('Failed to update. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleQuickAssign = async (clientId: string, userId: string | null) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: userId,
          assignmentType: 'vat'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to assign user')
      }

      showToast.success('Assignment updated successfully')
      
      // Refresh data
      await fetchVATClients(true)
      
    } catch (error) {
      console.error('Error assigning user:', error)
      showToast.error('Failed to assign user. Please try again.')
    }
  }

  const renderWorkflowTimeline = (client: VATClient, quarter: VATQuarter | null) => {
    if (!quarter) return null

    // Check if this is a client bookkeeping case (simplified workflow)
    const isClientBookkeeping = quarter.currentStage === 'CLIENT_BOOKKEEPING'

    // Define different milestone sets based on workflow type
    const milestones = isClientBookkeeping ? [
      // Simplified timeline for client bookkeeping - only show Filed to HMRC
      { 
        id: 'FILED_TO_HMRC', 
        date: quarter.filedToHMRCDate, 
        user: quarter.filedToHMRCByUserName,
        label: 'Client Filed to HMRC',
        icon: <Building className="h-4 w-4" />
      }
    ] : [
      // Full timeline for normal workflow
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
          {isClientBookkeeping ? 'Client Self-Filing Status' : 'Workflow Timeline'} - {(() => {
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
            <SortableHeader column="clientCode" className="col-vat-client-code p-2">Code</SortableHeader>
            <SortableHeader column="companyName" className="col-vat-company-name p-2">Company</SortableHeader>
            <SortableHeader column="quarterEnd" className="col-vat-quarter-end p-2">Q.End</SortableHeader>
            <SortableHeader column="filingMonth" className="col-vat-filing-month p-2">Filing</SortableHeader>
            <SortableHeader column="due" className="col-vat-due p-2">Due</SortableHeader>
            <SortableHeader column="status" className="col-vat-status p-2">Status</SortableHeader>
            <SortableHeader column="assignedTo" className="col-vat-assigned p-2">Assigned</SortableHeader>
            <TableHead className="col-vat-add-update p-2">Update</TableHead>
            <TableHead className="col-vat-actions p-2">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortClients(monthClients, monthNumber).map((client) => {
            // Get the specific quarter for this month
            const monthQuarter = getQuarterForMonth(client, monthNumber)
            const dueStatus = getDueStatus(monthQuarter, client)
            const workflowStatus = getWorkflowStatus(monthQuarter)
            const rowKey = `${client.id}-${monthNumber}`
            
            return (
            <>
              {/* Main Row */}
              <TableRow key={rowKey} className="hover:bg-muted/50 h-14">
                <TableCell className="font-mono text-xs p-2">
                  {client.clientCode}
                </TableCell>
                <TableCell className="font-medium p-2">
                  <button
                    onClick={() => handleOpenHistory(client)}
                    className="flex items-center gap-1 text-left hover:text-primary transition-colors cursor-pointer group text-xs truncate max-w-[180px]"
                    title={client.companyName}
                  >
                    <span className="hover:underline truncate">{client.companyName}</span>
                    <History className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  </button>
                </TableCell>
                <TableCell className="text-xs font-medium p-2">
                  {getQuarterEndMonth(monthQuarter)}
                </TableCell>
                <TableCell className="text-xs font-medium p-2">
                  {getFilingMonth(monthQuarter)}
                </TableCell>
                <TableCell className="p-2">
                  <span className={`text-xs font-medium ${dueStatus.color}`}>
                    {dueStatus.label}
                  </span>
                </TableCell>
                <TableCell className="p-2">
                  <Badge variant="outline" className={`text-xs px-1 py-0 h-5 max-w-[140px] ${workflowStatus.color}`}>
                    <div className="flex items-center gap-1 truncate">
                      <span className="flex-shrink-0">{workflowStatus.icon}</span>
                      <span className="truncate text-xs" title={workflowStatus.label}>
                        {workflowStatus.label.length > 15 ? workflowStatus.label.substring(0, 15) + '...' : workflowStatus.label}
                      </span>
                    </div>
                  </Badge>
                </TableCell>
                <TableCell className="p-2">
                  <div className="flex items-center gap-1 text-xs truncate max-w-[120px]" title={monthQuarter?.assignedUser?.name || client.vatAssignedUser?.name || 'Unassigned'}>
                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">
                      {monthQuarter?.assignedUser?.name || 
                       client.vatAssignedUser?.name || 
                       'Unassigned'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddUpdate(client)}
                    className="flex items-center gap-1 h-6 px-2 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Update
                  </Button>
                </TableCell>
                <TableCell className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-muted/50"
                    onClick={() => toggleRowExpansion(client.id, monthNumber)}
                    title="Expand Timeline"
                  >
                    {expandedRows.has(rowKey) ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
              
              {/* Expanded Row - Workflow Timeline */}
              {expandedRows.has(rowKey) && (
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

            {/* Monthly Tabs */}
            <Card>
              <CardContent className="p-0">
                <Tabs value={activeMonth} onValueChange={setActiveMonth} className="w-full">
                  <div className="border-b px-6 py-4">
                    <TabsList className="grid grid-cols-6 lg:grid-cols-12 gap-1 h-auto p-1">
                      {MONTHS.map((month) => {
                        const monthClients = getClientsForMonth(month.number)
                        const isCurrentMonth = month.number === currentMonth
                        return (
                          <TabsTrigger
                            key={month.key}
                            value={month.key}
                            className={`flex flex-col items-center gap-1 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground ${
                              isCurrentMonth ? 'ring-2 ring-blue-200 ring-offset-1' : ''
                            }`}
                          >
                            <span className="font-medium">{month.short}</span>
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
            {/* Assignment Section - Only for Managers/Partners */}
            {(session?.user?.role === 'MANAGER' || session?.user?.role === 'PARTNER') && (
              <div>
                <Label htmlFor="assignee">Assign To</Label>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {user.name} ({user.role})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="stage">Workflow Stage (Optional)</Label>
              <Select value={selectedStage || undefined} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage to update" />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_STAGES.map((stage) => (
                    <SelectItem key={stage.key} value={stage.key}>
                      <div className="flex items-center gap-2">
                        {stage.icon}
                        {stage.label}
                      </div>
                    </SelectItem>
                  ))}
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
              disabled={updating || (!selectedStage && selectedAssignee === (selectedClient?.vatAssignedUser?.id || 'unassigned'))}
            >
              {updating ? 'Updating...' : 'Update'}
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
    </>
  )
} 