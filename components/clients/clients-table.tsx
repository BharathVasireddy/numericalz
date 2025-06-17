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
  Phone
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
 * Clients table component
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
 */
export function ClientsTable({ searchQuery, filters }: ClientsTableProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('companyName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

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
    if (session?.user?.role === 'MANAGER') {
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
    setSelectedClient(client)
    setAssignModalOpen(true)
  }

  const handleResignClient = async (client: Client) => {
    if (!window.confirm(`Are you sure you want to resign ${client.companyName}? This will deactivate the client and remove any assignments.`)) {
      return
    }

    try {
      const loadingToast = showToast.loading('Resigning client...')
      
      const response = await fetch(`/api/clients/${client.id}/resign`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        showToast.dismiss(loadingToast)
        showToast.success('Client resigned successfully')
        // Refresh the clients list to remove the resigned client
        fetchClients()
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
      {session?.user?.role === 'MANAGER' && (
        <BulkOperations
          selectedClients={selectedClients}
          onClearSelection={handleClearSelection}
          onRefreshClients={fetchClients}
          users={users}
        />
      )}

      <Card className="overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {session?.user?.role === 'MANAGER' && (
                  <th className="text-left p-3 w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all clients"
                    />
                  </th>
                )}
                <th 
                  className="text-left p-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('clientCode')}
                >
                  Client Code
                </th>
                <th 
                  className="text-left p-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('companyNumber')}
                >
                  Company No.
                </th>
                <th 
                  className="text-left p-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('companyName')}
                >
                  Company Name
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                  Year End
                </th>
                <th 
                  className="text-left p-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('nextAccountsDue')}
                >
                  Accounts Due
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                  CT Due
                </th>
                <th 
                  className="text-left p-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('nextConfirmationDue')}
                >
                  CS Due
                </th>
                <th 
                  className="text-left p-3 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => handleSort('contactEmail')}
                >
                  Email
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                  Work Status
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                  Assigned To
                </th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-border hover:bg-muted/30">
                  {session?.user?.role === 'MANAGER' && (
                    <td className="p-3">
                      <Checkbox
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                        aria-label={`Select ${client.companyName}`}
                      />
                    </td>
                  )}
                  <td className="p-3">
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {client.clientCode || 'N/A'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-mono text-xs">
                      {client.companyNumber || '-'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="max-w-[200px]">
                      <div className="font-medium text-sm truncate">{client.companyName}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.companyType === 'LIMITED_COMPANY' ? 'Ltd Co' :
                         client.companyType === 'NON_LIMITED_COMPANY' ? 'Non Ltd' :
                         client.companyType === 'DIRECTOR' ? 'Director' :
                         client.companyType === 'SUB_CONTRACTOR' ? 'Sub Con' :
                         client.companyType}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-mono">
                      {getYearEnd(client.accountingReferenceDate)}
                    </span>
                  </td>
                  <td className="p-3">
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
                  <td className="p-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      {calculateCTDue(client.nextAccountsDue)}
                    </span>
                  </td>
                  <td className="p-3">
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
                  <td className="p-3">
                    <div className="max-w-[150px]">
                      <span className="text-xs truncate block">
                        {client.contactEmail === 'contact@tobeupdated.com' || !client.contactEmail ? 'TBU' : client.contactEmail}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`status-badge text-xs ${
                      client.isActive 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    {client.assignedUser ? (
                      <div className="max-w-[120px]">
                        <div className="text-xs font-medium truncate">{client.assignedUser.name}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-9 w-9 p-1 hover:bg-muted/50 flex items-center justify-center">
                          <span className="sr-only">Open menu</span>
                          <Settings className="action-trigger-icon" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                          View Client
                        </DropdownMenuItem>
                        {session?.user?.role === 'MANAGER' && (
                          <>
                            <DropdownMenuSeparator />
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
                            {client.isActive && (
                              <DropdownMenuItem 
                                onClick={() => handleResignClient(client)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <UserX className="h-4 w-4" />
                                Resign Client
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {client.companyNumber && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleRefreshCompaniesHouse(client)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Refresh from Companies House
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tablet View */}
        <div className="hidden md:block lg:hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {session?.user?.role === 'MANAGER' && (
                  <th className="text-left p-3 w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all clients"
                    />
                  </th>
                )}
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                  Client Details
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                  Due Dates
                </th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">
                  Assignment
                </th>
                <th className="text-right p-3 text-xs font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-border hover:bg-muted/30">
                  {session?.user?.role === 'MANAGER' && (
                    <td className="p-3">
                      <Checkbox
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                        aria-label={`Select ${client.companyName}`}
                      />
                    </td>
                  )}
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-sm">{client.companyName}</div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Code: {client.clientCode || 'N/A'}</div>
                        <div>No: {client.companyNumber || '-'}</div>
                        <div>{client.contactEmail === 'contact@tobeupdated.com' || !client.contactEmail ? 'TBU' : client.contactEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Accounts:</span>
                        {isDateOverdue(client.nextAccountsDue) && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                        <span className={isDateOverdue(client.nextAccountsDue) ? 'text-red-600 font-medium' : ''}>
                          {formatDate(client.nextAccountsDue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">CS:</span>
                        {isDateOverdue(client.nextConfirmationDue) && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                        <span className={isDateOverdue(client.nextConfirmationDue) ? 'text-red-600 font-medium' : ''}>
                          {formatDate(client.nextConfirmationDue)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div>
                      <span className={`status-badge text-xs ${
                        client.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {client.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div className="text-xs text-muted-foreground mt-1">
                        {client.assignedUser?.name || 'Unassigned'}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-9 w-9 p-1 hover:bg-muted/50 flex items-center justify-center">
                          <span className="sr-only">Open menu</span>
                          <Settings className="action-trigger-icon" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Eye className="h-4 w-4" />
                          View Client
                        </DropdownMenuItem>
                        {session?.user?.role === 'MANAGER' && (
                          <>
                            <DropdownMenuSeparator />
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
                            {client.isActive && (
                              <DropdownMenuItem 
                                onClick={() => handleResignClient(client)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <UserX className="h-4 w-4" />
                                Resign Client
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {client.companyNumber && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleRefreshCompaniesHouse(client)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <RefreshCw className="h-4 w-4" />
                              Refresh from Companies House
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4 p-4">
          {clients.map((client) => (
            <Card key={client.id} className="p-4 hover-lift">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {session?.user?.role === 'MANAGER' && (
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={(checked) => handleSelectClient(client.id, checked as boolean)}
                      aria-label={`Select ${client.companyName}`}
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{client.companyName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {client.clientCode || 'No code'} • {client.companyNumber || 'No number'}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-9 w-9 p-1 hover:bg-muted/50 flex items-center justify-center">
                      <span className="sr-only">Open menu</span>
                      <Settings className="action-trigger-icon" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Eye className="h-4 w-4" />
                      View Client
                    </DropdownMenuItem>
                    {session?.user?.role === 'MANAGER' && (
                      <>
                        <DropdownMenuSeparator />
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
                        {client.isActive && (
                          <DropdownMenuItem 
                            onClick={() => handleResignClient(client)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <UserX className="h-4 w-4" />
                            Resign Client
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                    {client.companyNumber && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleRefreshCompaniesHouse(client)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Refresh from Companies House
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{client.contactEmail === 'contact@tobeupdated.com' || !client.contactEmail ? 'TBU' : client.contactEmail}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Accounts Due:</span>
                    <div className={`font-mono ${isDateOverdue(client.nextAccountsDue) ? 'text-red-600 font-medium' : ''}`}>
                      {formatDate(client.nextAccountsDue)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CS Due:</span>
                    <div className={`font-mono ${isDateOverdue(client.nextConfirmationDue) ? 'text-red-600 font-medium' : ''}`}>
                      {formatDate(client.nextConfirmationDue)}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className={`status-badge text-xs ${
                    client.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                  
                  {client.assignedUser && (
                    <span className="text-xs text-muted-foreground">
                      {client.assignedUser.name}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Assign User Modal */}
      {selectedClient && (
        <AssignUserModal
          client={selectedClient}
          users={users}
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false)
            setSelectedClient(null)
          }}
          onSuccess={handleAssignSuccess}
        />
      )}
    </>
  )
} 