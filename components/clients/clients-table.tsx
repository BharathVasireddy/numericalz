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
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Search,
  Download,
  Upload,
  RotateCcw,
  Loader2,
  Mail,
  Phone,
  MoreHorizontal,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { AssignUserModal } from './assign-user-modal'
import { Badge } from '@/components/ui/badge'

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
  accountingReferenceDate: string | null
  assignedUser?: {
    id: string
    name: string
    email: string
  }
  isActive: boolean
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface ClientsTableProps {
  searchQuery: string
  filters: {
    companyType: string
    assignedUser: string
    status: string
  }
}

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
export function ClientsTable({ searchQuery, filters }: ClientsTableProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<string>('companyName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  
  // Modal state for resign functionality
  const [showResignModal, setShowResignModal] = useState(false)
  const [clientToResign, setClientToResign] = useState<Client | null>(null)
  
  // Modal state for assign functionality
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [clientToAssign, setClientToAssign] = useState<Client | null>(null)

  const fetchClients = useCallback(async () => {
    if (!session) return

    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      params.append('active', 'true')
      
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      
      if (filters.companyType) {
        params.append('companyType', filters.companyType)
      }
      
      if (filters.assignedUser) {
        if (filters.assignedUser === 'me') {
          params.append('assignedUserId', session.user.id)
        } else if (filters.assignedUser === 'unassigned') {
          params.append('unassigned', 'true')
        } else {
          params.append('assignedUserId', filters.assignedUser)
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
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filters, sortBy, sortOrder, session])

  useEffect(() => {
    if (session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') {
      fetchUsers()
    }
  }, [session])

  // Debounced fetch effect - separate from the debounced function to avoid dependency issues
  useEffect(() => {
    if (!session) return

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
      // Include the current user (manager) in the list for assignment
      const response = await fetch('/api/users?includeSelf=true')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
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
      // If it's not JSON, try to parse as date string
      const date = new Date(accountingRefDate)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
      }
    }
    return '-'
  }

  const calculateCTDue = (nextAccountsDue: string | null) => {
    if (!nextAccountsDue) return '-'
    // CT is typically due 9 months after accounting period end
    const accountsDate = new Date(nextAccountsDue)
    const ctDate = new Date(accountsDate)
    ctDate.setMonth(ctDate.getMonth() + 9)
    return ctDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
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

  const handleAssignUser = (client: Client) => {
    setClientToAssign(client)
    setShowAssignModal(true)
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

  const handleAssignSuccess = () => {
    fetchClients() // Refresh the clients list
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

      <Card className="overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <table className="table-fixed-layout">
            <thead>
              <tr className="table-header-row">
                {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
                  <th className="table-header-cell w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all clients"
                    />
                  </th>
                )}
                <th 
                  className="table-header-cell col-client-code cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('clientCode')}
                >
                  Client Code
                </th>
                <th 
                  className="table-header-cell col-company-number cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('companyNumber')}
                >
                  Company No.
                </th>
                <th 
                  className="table-header-cell col-company-name cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('companyName')}
                >
                  Company Name
                </th>
                <th className="table-header-cell w-20">
                  Year End
                </th>
                <th 
                  className="table-header-cell col-date cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('nextAccountsDue')}
                >
                  Accounts Due
                </th>
                <th className="table-header-cell w-20">
                  CT Due
                </th>
                <th 
                  className="table-header-cell col-date cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('nextConfirmationDue')}
                >
                  CS Due
                </th>
                <th className="table-header-cell col-contact">
                  Contact
                </th>
                <th className="table-header-cell col-assigned-to">
                  Assigned To
                </th>
                <th className="table-header-cell col-actions text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="table-body-row">
                  {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
                    <td className="table-body-cell">
                      <Checkbox
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                        aria-label={`Select ${client.companyName}`}
                      />
                    </td>
                  )}
                  <td className="table-body-cell">
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {client.clientCode || 'N/A'}
                    </span>
                  </td>
                  <td className="table-body-cell">
                    <span className="font-mono text-xs">
                      {client.companyNumber || '-'}
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
                    <span className="text-xs font-mono">
                      {getYearEnd(client.accountingReferenceDate)}
                    </span>
                  </td>
                  <td className="table-body-cell">
                    <div className="flex items-center gap-1">
                      {isDateOverdue(client.nextAccountsDue) && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-xs font-mono ${
                        isDateOverdue(client.nextAccountsDue) ? 'text-red-600 font-medium' :
                        isDateSoon(client.nextAccountsDue) ? 'text-amber-600 font-medium' :
                        'text-foreground'
                      }`}>
                        {formatDate(client.nextAccountsDue)}
                      </span>
                    </div>
                  </td>
                  <td className="table-body-cell">
                    <span className="text-xs font-mono text-muted-foreground">
                      {calculateCTDue(client.nextAccountsDue)}
                    </span>
                  </td>
                  <td className="table-body-cell">
                    <div className="flex items-center gap-1">
                      {isDateOverdue(client.nextConfirmationDue) && (
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      )}
                      <span className={`text-xs font-mono ${
                        isDateOverdue(client.nextConfirmationDue) ? 'text-red-600 font-medium' :
                        isDateSoon(client.nextConfirmationDue) ? 'text-amber-600 font-medium' :
                        'text-foreground'
                      }`}>
                        {formatDate(client.nextConfirmationDue)}
                      </span>
                    </div>
                  </td>
                  <td className="table-body-cell">
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
                      {!client.contactEmail && !client.contactPhone && (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>
                  <td className="table-body-cell">
                    {client.assignedUser ? (
                      <div className="text-xs">
                        <div className="font-medium truncate" title={client.assignedUser.name}>{client.assignedUser.name}</div>
                        <div className="text-muted-foreground truncate" title={client.assignedUser.email}>{client.assignedUser.email}</div>
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
                        {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') &&
                          <>
                            <DropdownMenuItem 
                              onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                              Edit Client
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleAssignUser(client)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <UserPlus className="h-4 w-4" />
                              Assign User
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
                        }
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tablet View */}
        <div className="hidden md:block lg:hidden">
          <div className="space-y-4 p-4">
            {clients.map((client) => (
              <div key={client.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                    className="text-left hover:bg-accent/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors group flex-1"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-sm group-hover:text-primary">{client.companyName}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.companyNumber} • {client.companyType === 'LIMITED_COMPANY' ? 'Ltd Co' : client.companyType}
                      </div>
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
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
                      {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleAssignUser(client)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <UserPlus className="h-4 w-4" />
                            Assign User
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
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Year End:</span>
                    <div className="font-medium">{getYearEnd(client.accountingReferenceDate)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact:</span>
                    <div className="flex items-center gap-2 mt-1">
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
                      {!client.contactEmail && !client.contactPhone && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Accounts Due:</span>
                    <div className={`font-mono ${
                      isDateOverdue(client.nextAccountsDue) ? 'text-red-600 font-medium' :
                      isDateSoon(client.nextAccountsDue) ? 'text-amber-600 font-medium' :
                      'text-foreground'
                    }`}>
                      {formatDate(client.nextAccountsDue)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CS Due:</span>
                    <div className={`font-mono ${
                      isDateOverdue(client.nextConfirmationDue) ? 'text-red-600 font-medium' :
                      isDateSoon(client.nextConfirmationDue) ? 'text-amber-600 font-medium' :
                      'text-foreground'
                    }`}>
                      {formatDate(client.nextConfirmationDue)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Assigned to:</span>
                    <div className="font-medium">
                      {client.assignedUser?.name || 'Unassigned'}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden">
          <div className="space-y-3 p-3">
            {clients.map((client) => (
              <div key={client.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="font-medium text-sm">{client.companyName}</div>
                    <div className="text-xs text-muted-foreground">
                      {client.companyNumber}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
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
                      {(session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleAssignUser(client)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <UserPlus className="h-4 w-4" />
                            Assign User
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
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accounts:</span>
                    <span className={`font-mono ${
                      isDateOverdue(client.nextAccountsDue) ? 'text-red-600 font-medium' :
                      isDateSoon(client.nextAccountsDue) ? 'text-amber-600 font-medium' :
                      'text-foreground'
                    }`}>
                      {formatDate(client.nextAccountsDue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CS:</span>
                    <span className={`font-mono ${
                      isDateOverdue(client.nextConfirmationDue) ? 'text-red-600 font-medium' :
                      isDateSoon(client.nextConfirmationDue) ? 'text-amber-600 font-medium' :
                      'text-foreground'
                    }`}>
                      {formatDate(client.nextConfirmationDue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Contact:</span>
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
                      {!client.contactEmail && !client.contactPhone && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Assigned:</span>
                    <div className="font-medium">
                      {client.assignedUser?.name || 'Unassigned'}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Active
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {clients.length === 0 && !loading && (
          <div className="p-8 text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No active clients found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </Card>

      {/* Assign User Modal */}
      <AssignUserModal
        client={clientToAssign}
        users={users}
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onSuccess={handleAssignSuccess}
      />

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
    </>
  )
} 