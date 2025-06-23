'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { showToast } from '@/lib/toast'
import { debounce } from '@/lib/utils'
import {
  Eye,
  Edit,
  UserPlus,
  UserX,
  RefreshCw,
  Settings,
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  ArrowUpDown,
  Clock,
  User,
  Plus,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { BulkOperations } from './bulk-operations'
import { Badge } from '@/components/ui/badge'
import { ActivityLogViewer } from '@/components/activity/activity-log-viewer'

interface Client {
  id: string
  clientCode: string | null
  companyName: string
  companyNumber: string | null
  companyType: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  nextAccountsDue: string | null
  nextConfirmationDue: string | null
  nextCorporationTaxDue: string | null
  accountingReferenceDate: string | null
  assignedUser?: {
    id: string
    name: string
    email: string
  }
  ltdCompanyAssignedUser?: {
    id: string
    name: string
    email: string
  }
  nonLtdCompanyAssignedUser?: {
    id: string
    name: string
    email: string
  }
  vatAssignedUser?: {
    id: string
    name: string
    email: string
  }
  isActive: boolean
  isVatEnabled: boolean
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

// Advanced filter interfaces
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

interface ClientsTableProps {
  searchQuery: string
  filters: {
    companyType: string
    accountsAssignedUser: string
    vatAssignedUser: string
    status: string
  }
  advancedFilter?: AdvancedFilter | null
  onClientCountsUpdate?: (total: number, filtered: number) => void
}

// Sortable header component to match VAT/Ltd tables design
interface SortableHeaderProps {
  children: React.ReactNode
  column: string
  className?: string
  onSort: (column: string) => void
}

const SortableHeader = ({ column, children, className = "", onSort }: SortableHeaderProps) => (
  <TableHead className={className}>
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-1 hover:text-primary transition-colors text-xs font-medium"
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  </TableHead>
)

/**
 * Clients table component with comprehensive functionality
 * 
 * Features:
 * - Display clients in a comprehensive table with all key fields
 * - Sort by different columns
 * - Quick actions menu including Companies House refetch
 * - Bulk operations for managers (assign, resign, refresh)
 * - Loading and empty states
 * - Mobile-friendly design
 * - Shows client code, company details, due dates, and assignments
 * - Real-time search and filtering with debouncing
 * - Modal-based resign confirmation
 * - Working assign user functionality
 */
export function ClientsTable({ searchQuery, filters, advancedFilter, onClientCountsUpdate }: ClientsTableProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [totalClientCount, setTotalClientCount] = useState(0)
  const [sortBy, setSortBy] = useState<string>('companyName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  
  // Modal state for resign functionality
  const [showResignModal, setShowResignModal] = useState(false)
  const [clientToResign, setClientToResign] = useState<Client | null>(null)
  
  // Modal state for activity log
  const [showActivityLogModal, setShowActivityLogModal] = useState(false)
  const [activityLogClient, setActivityLogClient] = useState<Client | null>(null)

  const fetchClients = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      
      // Use advanced filter if available
      if (advancedFilter) {
        const response = await fetch('/api/clients/advanced-filter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filter: advancedFilter,
            sortBy,
            sortOrder,
            page: 1,
            limit: 100
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          let clientsData = data.clients || []
          
          // Handle client-side sorting for assignment columns
          if (sortBy === 'accountsAssigned' || sortBy === 'vatAssigned') {
            clientsData = [...clientsData].sort((a, b) => {
              let aValue = ''
              let bValue = ''
              
              if (sortBy === 'accountsAssigned') {
                // Get effective accounts assignment
                if (a.companyType === 'LIMITED_COMPANY') {
                  aValue = a.ltdCompanyAssignedUser?.name || a.assignedUser?.name || 'Unassigned'
                } else {
                  aValue = a.nonLtdCompanyAssignedUser?.name || a.assignedUser?.name || 'Unassigned'
                }
                
                if (b.companyType === 'LIMITED_COMPANY') {
                  bValue = b.ltdCompanyAssignedUser?.name || b.assignedUser?.name || 'Unassigned'
                } else {
                  bValue = b.nonLtdCompanyAssignedUser?.name || b.assignedUser?.name || 'Unassigned'
                }
              } else if (sortBy === 'vatAssigned') {
                // Get effective VAT assignment with proper handling for non-VAT clients
                aValue = a.isVatEnabled ? (a.vatAssignedUser?.name || 'Unassigned') : 'Not Opted'
                bValue = b.isVatEnabled ? (b.vatAssignedUser?.name || 'Unassigned') : 'Not Opted'
              }
              
              const comparison = aValue.localeCompare(bValue)
              return sortOrder === 'asc' ? comparison : -comparison
            })
          }
          
          setClients(clientsData)
          
          const currentTotal = data.pagination?.totalCount || 0
          
          // Get unfiltered total if we don't have it
          if (totalClientCount === 0) {
            const totalResponse = await fetch('/api/clients?active=true&limit=1')
            if (totalResponse.ok) {
              const totalData = await totalResponse.json()
              const unfiltered = totalData.pagination?.totalCount || 0
              setTotalClientCount(unfiltered)
              onClientCountsUpdate?.(unfiltered, currentTotal)
            }
          } else {
            onClientCountsUpdate?.(totalClientCount, currentTotal)
          }
        }
        return
      }
      
      // Use basic filters if no advanced filter
      const params = new URLSearchParams()
      params.append('active', 'true')
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      
      if (filters.companyType) {
        params.append('companyType', filters.companyType)
      }
      
      if (filters.accountsAssignedUser) {
        if (filters.accountsAssignedUser === 'me') {
          params.append('accountsAssignedUserId', session.user.id)
        } else if (filters.accountsAssignedUser === 'unassigned') {
          params.append('accountsUnassigned', 'true')
        } else {
          params.append('accountsAssignedUserId', filters.accountsAssignedUser)
        }
      }
      
      if (filters.vatAssignedUser) {
        if (filters.vatAssignedUser === 'me') {
          params.append('vatAssignedUserId', session.user.id)
        } else if (filters.vatAssignedUser === 'unassigned') {
          params.append('vatUnassigned', 'true')
        } else {
          params.append('vatAssignedUserId', filters.vatAssignedUser)
        }
      }
      
      if (filters.status) {
        params.append('isActive', filters.status)
      }
      
      params.append('sortBy', sortBy)
      params.append('sortOrder', sortOrder)
      
      const response = await fetch(`/api/clients?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        let clientsData = data.clients || []
        
        // Handle client-side sorting for assignment columns
        if (sortBy === 'accountsAssigned' || sortBy === 'vatAssigned') {
          clientsData = [...clientsData].sort((a, b) => {
            let aValue = ''
            let bValue = ''
            
            if (sortBy === 'accountsAssigned') {
              // Get specific accounts assignment only (no fallback)
              if (a.companyType === 'LIMITED_COMPANY') {
                aValue = a.ltdCompanyAssignedUser?.name || 'Unassigned'
              } else {
                aValue = a.nonLtdCompanyAssignedUser?.name || 'Unassigned'
              }
              
              if (b.companyType === 'LIMITED_COMPANY') {
                bValue = b.ltdCompanyAssignedUser?.name || 'Unassigned'
              } else {
                bValue = b.nonLtdCompanyAssignedUser?.name || 'Unassigned'
              }
            } else if (sortBy === 'vatAssigned') {
              // Get effective VAT assignment with proper handling for non-VAT clients
              aValue = a.isVatEnabled ? (a.vatAssignedUser?.name || 'Unassigned') : 'Not Opted'
              bValue = b.isVatEnabled ? (b.vatAssignedUser?.name || 'Unassigned') : 'Not Opted'
            }
            
            const comparison = aValue.localeCompare(bValue)
            return sortOrder === 'asc' ? comparison : -comparison
          })
        }
        
        setClients(clientsData)
        
        // If no filters applied, this is our total count
        const hasFilters = searchQuery.trim() || filters.companyType || filters.accountsAssignedUser || filters.vatAssignedUser || filters.status
        const currentTotal = data.pagination?.totalCount || 0
        
        if (!hasFilters) {
          setTotalClientCount(currentTotal)
          onClientCountsUpdate?.(currentTotal, currentTotal)
        } else {
          // For filtered results, we need to fetch the unfiltered total if we don't have it
          if (totalClientCount === 0) {
            const totalResponse = await fetch('/api/clients?active=true&limit=1')
            if (totalResponse.ok) {
              const totalData = await totalResponse.json()
              const unfiltered = totalData.pagination?.totalCount || 0
              setTotalClientCount(unfiltered)
              onClientCountsUpdate?.(unfiltered, currentTotal)
            }
          } else {
            onClientCountsUpdate?.(totalClientCount, currentTotal)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filters, advancedFilter, sortBy, sortOrder, session?.user?.id])

  useEffect(() => {
    if (session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') {
      fetchUsers()
    }
  }, [session])

  // Debounced fetch effect - separate from the debounced function to avoid dependency issues
  useEffect(() => {
    if (!session?.user?.id) return

    const debouncedFetch = debounce(() => {
      fetchClients()
    }, 300)

    debouncedFetch()

    // Cleanup function to cancel pending debounced calls
    return () => {
      debouncedFetch.cancel()
    }
  }, [fetchClients])

  const fetchUsers = async () => {
    try {
      // Include the current user in the list for assignment
      const response = await fetch('/api/users?includeSelf=true')
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched users for assignment:', data.users) // Debug log
        setUsers(data.users || [])
      } else {
        console.error('Failed to fetch users:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(clients.map(client => client.id))
    } else {
      setSelectedClients([])
    }
  }

  const handleSelectClient = (clientId: string, checked: boolean) => {
    if (checked) {
      setSelectedClients(prev => [...prev, clientId])
    } else {
      setSelectedClients(prev => prev.filter(id => id !== clientId))
    }
  }

  const handleClearSelection = () => {
    setSelectedClients([])
  }

  const isAllSelected = clients.length > 0 && selectedClients.length === clients.length

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getYearEnd = (accountingRefDate: string | null) => {
    if (!accountingRefDate) return '-'
    try {
      const parsed = JSON.parse(accountingRefDate)
      if (parsed.day && parsed.month) {
        return `${parsed.day}/${parsed.month}`
      }
    } catch (e) {
      const date = new Date(accountingRefDate)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: '2-digit' 
        })
      }
    }
    return '-'
  }

  const isDateOverdue = (dateString: string | null) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const isDateSoon = (dateString: string | null, daysThreshold: number = 30) => {
    if (!dateString) return false
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= daysThreshold && diffDays > 0
  }

  const handleResignClient = (client: Client) => {
    setClientToResign(client)
    setShowResignModal(true)
  }

  const confirmResignClient = async () => {
    if (!clientToResign) return

    try {
      const loadingToast = showToast.loading('Resigning client...')
      
      const response = await fetch(`/api/clients/${clientToResign.id}/resign`, {
        method: 'POST',
      })
      
      if (response.ok) {
        showToast.dismiss(loadingToast)
        showToast.success('Client resigned successfully')
        // Refresh the clients list to remove the resigned client
        fetchClients()
        setShowResignModal(false)
        setClientToResign(null)
      } else {
        const error = await response.json()
        showToast.dismiss(loadingToast)
        showToast.error(`Failed to resign client: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error resigning client:', error)
      showToast.error('Error resigning client')
    }
  }

  const cancelResignClient = () => {
    setShowResignModal(false)
    setClientToResign(null)
  }

  const handleRefreshCompaniesHouse = async (client: Client) => {
    if (!client.companyNumber) {
      showToast.error('No company number available for refresh')
      return
    }

    try {
      const loadingToast = showToast.loading('Refreshing Companies House data...')
      
      const response = await fetch(`/api/clients/${client.id}/refresh-companies-house`, {
        method: 'POST',
      })
      
      if (response.ok) {
        showToast.dismiss(loadingToast)
        showToast.success('Companies House data refreshed successfully')
        // Refresh the clients list to show updated data
        fetchClients()
      } else {
        const error = await response.json()
        showToast.dismiss(loadingToast)
        showToast.error(`Failed to refresh: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error refreshing Companies House data:', error)
      showToast.error('Error refreshing Companies House data')
    }
  }

  const handleViewActivityLog = (client: Client) => {
    setActivityLogClient(client)
    setShowActivityLogModal(true)
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        </div>
      </Card>
    )
  }

  return (
    <>
      {/* Bulk Operations */}
      {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
        <BulkOperations
          selectedClients={selectedClients}
          onClearSelection={handleClearSelection}
          onRefreshClients={fetchClients}
          users={users}
        />
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="border-b">
                  {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
                    <TableHead className="w-12 p-2">
                      <Checkbox
                        checked={selectedClients.length === clients.length && clients.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all clients"
                      />
                    </TableHead>
                  )}
                  <SortableHeader column="clientCode" onSort={handleSort} className="w-16 col-client-code p-2 text-center">
                    Code
                  </SortableHeader>
                  <SortableHeader column="companyNumber" onSort={handleSort} className="w-20 col-company-number p-2 text-center">
                    Co. No.
                  </SortableHeader>
                  <SortableHeader column="companyName" onSort={handleSort} className="w-48 col-company-name p-2">
                    Company Name
                  </SortableHeader>
                  <SortableHeader column="companyType" onSort={handleSort} className="w-20 col-company-type p-2 text-center">
                    Accounts
                  </SortableHeader>
                  <SortableHeader column="isVatEnabled" onSort={handleSort} className="w-16 col-vat-enabled p-2 text-center">
                    VAT
                  </SortableHeader>
                  <SortableHeader column="contactEmail" onSort={handleSort} className="w-20 col-contact p-2 text-center">
                    Contact
                  </SortableHeader>
                  <SortableHeader column="accountsAssigned" onSort={handleSort} className="w-24 col-accounts-assigned p-2 text-center">
                    Accounts
                  </SortableHeader>
                  <SortableHeader column="vatAssigned" onSort={handleSort} className="w-24 col-vat-assigned p-2 text-center">
                    VAT Assigned
                  </SortableHeader>
                  <TableHead className="w-20 col-actions p-2 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
                            <TableBody className="table-compact">
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading clients...
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="space-y-2">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground">No clients found</p>
                        <p className="text-xs text-muted-foreground">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/50 h-12">
                      {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
                        <TableCell className="p-2">
                          <Checkbox
                            checked={selectedClients.includes(client.id)}
                            onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                            aria-label={`Select ${client.companyName}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs p-2 text-center">
                        {client.clientCode || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-xs p-2 text-center">
                        {client.companyNumber || '—'}
                      </TableCell>
                      <TableCell className="font-medium p-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                            className="max-w-[150px] truncate text-sm hover:text-primary transition-colors cursor-pointer text-left"
                            title={`View ${client.companyName} details`}
                          >
                            {client.companyName}
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
                      <TableCell className="text-center p-2">
                        {(client.companyType === 'LIMITED_COMPANY' || client.companyType === 'NON_LIMITED_COMPANY') ? (
                          <Check className="h-3 w-3 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center p-2">
                        {client.isVatEnabled ? (
                          <Check className="h-3 w-3 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-3 w-3 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {client.contactEmail && (
                            <a
                              href={`mailto:${client.contactEmail}`}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={`Email: ${client.contactEmail}`}
                            >
                              <Mail className="h-3 w-3" />
                            </a>
                          )}
                          {client.contactPhone && (
                            <a
                              href={`tel:${client.contactPhone}`}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              title={`Call: ${client.contactPhone}`}
                            >
                              <Phone className="h-3 w-3" />
                            </a>
                          )}
                          {!client.contactEmail && !client.contactPhone && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="p-2 text-center">
                        <div className="text-xs">
                          {(() => {
                            if (client.companyType === 'LIMITED_COMPANY') {
                              if (client.ltdCompanyAssignedUser) {
                                return (
                                  <div className="flex items-center justify-center gap-1 truncate max-w-[100px]" title={client.ltdCompanyAssignedUser.name}>
                                    <User className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                    <span className="text-blue-600 font-medium truncate">
                                      {client.ltdCompanyAssignedUser.name}
                                    </span>
                                  </div>
                                )
                              }
                            } else if (client.companyType === 'NON_LIMITED_COMPANY' || client.companyType === 'DIRECTOR' || client.companyType === 'SUB_CONTRACTOR') {
                              if (client.nonLtdCompanyAssignedUser) {
                                return (
                                  <div className="flex items-center justify-center gap-1 truncate max-w-[100px]" title={client.nonLtdCompanyAssignedUser.name}>
                                    <User className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                    <span className="text-blue-600 font-medium truncate">
                                      {client.nonLtdCompanyAssignedUser.name}
                                    </span>
                                  </div>
                                )
                              }
                            }
                            return <span className="text-muted-foreground">Unassigned</span>
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="p-2 text-center">
                        <div className="text-xs">
                          {client.isVatEnabled ? (
                            client.vatAssignedUser ? (
                              <div className="flex items-center justify-center gap-1 truncate max-w-[100px]" title={client.vatAssignedUser.name}>
                                <User className="h-3 w-3 text-green-600 flex-shrink-0" />
                                <span className="text-green-600 font-medium truncate">
                                  {client.vatAssignedUser.name}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )
                          ) : (
                            <span className="text-muted-foreground">Not Opted</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="table-actions-cell">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="action-trigger-button">
                              <Settings className="action-trigger-icon" />
                              <span className="sr-only">Open menu</span>
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
                              onClick={() => handleViewActivityLog(client)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Clock className="h-4 w-4" />
                              View Log
                            </DropdownMenuItem>
                            {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit Client
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleRefreshCompaniesHouse(client)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                  Refresh from Companies House
                                </DropdownMenuItem>
                                {client.isActive && (
                                  <DropdownMenuItem 
                                    onClick={() => handleResignClient(client)}
                                    className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                                  >
                                    <UserX className="h-4 w-4" />
                                    Resign Client
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Resign Confirmation Modal */}
      <Dialog open={showResignModal} onOpenChange={setShowResignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Client Resignation</DialogTitle>
            <DialogDescription>
              Are you sure you want to resign <strong>{clientToResign?.companyName}</strong>? 
              This will move the client to inactive status and remove them from the active clients list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelResignClient}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmResignClient}>
              Resign Client
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