'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, AlertTriangle, CheckCircle, Clock, Building2, Eye, Mail, Phone, MoreHorizontal, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { showToast } from '@/lib/toast'

interface VATClient {
  id: string
  clientCode: string
  companyName: string
  companyType: string
  contactEmail: string
  contactPhone?: string
  vatNumber?: string
  vatReturnsFrequency?: string
  nextVatReturnDue?: string
  isVatEnabled: boolean
  assignedUser?: {
    id: string
    name: string
    email: string
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

export function VATDeadlineTable() {
  const { data: session } = useSession()
  const router = useRouter()
  const [vatClients, setVatClients] = useState<VATClient[]>([])
  const [loading, setLoading] = useState(true)
  const hasFetchedRef = useRef(false)
  const [currentSort, setCurrentSort] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

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

  useEffect(() => {
    // Only fetch if we have a session and haven't fetched yet
    if (session?.user?.id && !hasFetchedRef.current) {
      fetchVATClients()
    }
  }, [session?.user?.id, fetchVATClients])

  // Function to force refresh data (can be called when needed)
  const refreshVATClients = useCallback(() => {
    hasFetchedRef.current = false
    fetchVATClients()
  }, [fetchVATClients])

  const getDeadlineStatus = (nextVatReturnDue?: string) => {
    if (!nextVatReturnDue) return 'unknown'
    
    const dueDate = new Date(nextVatReturnDue)
    const today = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0) return 'overdue'
    if (daysUntilDue <= 7) return 'urgent'
    if (daysUntilDue <= 30) return 'upcoming'
    return 'future'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </Badge>
      case 'urgent':
        return <Badge variant="destructive" className="flex items-center gap-1 bg-orange-100 text-orange-800 border-orange-200">
          <Clock className="h-3 w-3" />
          Due Soon
        </Badge>
      case 'upcoming':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Upcoming
        </Badge>
      case 'future':
        return <Badge variant="outline" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Future
        </Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getFrequencyBadge = (frequency?: string) => {
    if (!frequency) return <Badge variant="outline">Not set</Badge>
    
    const colors = {
      'QUARTERLY': 'bg-blue-100 text-blue-800 border-blue-200',
      'MONTHLY': 'bg-green-100 text-green-800 border-green-200',
      'ANNUALLY': 'bg-purple-100 text-purple-800 border-purple-200'
    }
    
    return <Badge variant="outline" className={colors[frequency as keyof typeof colors] || ''}>
      {frequency.charAt(0) + frequency.slice(1).toLowerCase()}
    </Badge>
  }

  const sortClients = (key: string) => {
    if (currentSort === key) {
      setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setCurrentSort(key)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            VAT Deadline Tracker
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Track VAT deadlines and quarters for all VAT-enabled clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshVATClients}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild size="sm" className="flex items-center gap-2">
            <Link href="/dashboard/clients/add">
              <Plus className="h-4 w-4" />
              Add Client
            </Link>
          </Button>
        </div>
      </div>

      {/* VAT Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total VAT Clients</p>
                <p className="text-2xl font-bold">{vatClients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {vatClients.filter(c => getDeadlineStatus(c.nextVatReturnDue) === 'overdue').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Due Soon</p>
                <p className="text-2xl font-bold text-orange-600">
                  {vatClients.filter(c => getDeadlineStatus(c.nextVatReturnDue) === 'urgent').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Upcoming</p>
                <p className="text-2xl font-bold text-green-600">
                  {vatClients.filter(c => getDeadlineStatus(c.nextVatReturnDue) === 'upcoming').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VAT Deadlines Table */}
      <Card>
        <CardHeader>
          <CardTitle>VAT Deadlines</CardTitle>
          <CardDescription>Upcoming VAT submission deadlines for your clients</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Loading VAT clients...</p>
            </div>
          ) : vatClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No VAT-enabled clients found.</p>
              <p className="text-sm mt-2">
                VAT clients will appear here when you create clients with VAT enabled in the post-creation questionnaire.
              </p>
            </div>
          ) : (
            <div className="clients-table-container">
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <table className="table-fixed-layout">
                  <thead>
                    <tr className="table-header-row">
                      <SortableHeader sortKey="clientCode" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients}>
                        Client Code
                      </SortableHeader>
                      <SortableHeader sortKey="companyName" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients}>
                        Company Name
                      </SortableHeader>
                      <SortableHeader sortKey="vatNumber" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients} className="w-32">
                        VAT Number
                      </SortableHeader>
                      <SortableHeader sortKey="vatReturnsFrequency" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients} className="w-24">
                        Frequency
                      </SortableHeader>
                      <SortableHeader sortKey="nextVatReturnDue" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients}>
                        Next Due
                      </SortableHeader>
                      <SortableHeader sortKey="status" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients}>
                        Status
                      </SortableHeader>
                      <SortableHeader sortKey="contactEmail" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients} className="col-contact">
                        Contact
                      </SortableHeader>
                      <SortableHeader sortKey="assignedUser" currentSort={currentSort} sortOrder={sortOrder} onSort={sortClients} className="col-assigned-to">
                        Assigned To
                      </SortableHeader>
                      <th className="table-header-cell col-actions text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {vatClients
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
                            <span className="font-mono text-xs">
                              {client.vatNumber || 'Not set'}
                            </span>
                          </td>
                          <td className="table-body-cell">
                            {getFrequencyBadge(client.vatReturnsFrequency)}
                          </td>
                          <td className="table-body-cell">
                            <div className="flex items-center gap-1">
                              {getDeadlineStatus(client.nextVatReturnDue) === 'overdue' && (
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                              )}
                              <span className={`text-xs font-mono ${
                                getDeadlineStatus(client.nextVatReturnDue) === 'overdue' ? 'text-red-600 font-medium' :
                                getDeadlineStatus(client.nextVatReturnDue) === 'urgent' ? 'text-amber-600 font-medium' :
                                'text-foreground'
                              }`}>
                                {formatDate(client.nextVatReturnDue)}
                              </span>
                            </div>
                          </td>
                          <td className="table-body-cell">
                            {getStatusBadge(getDeadlineStatus(client.nextVatReturnDue))}
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
                {vatClients
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
                            {getStatusBadge(getDeadlineStatus(client.nextVatReturnDue))}
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">VAT Number:</span>
                            <span className="font-mono">{client.vatNumber || 'Not set'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Frequency:</span>
                            {getFrequencyBadge(client.vatReturnsFrequency)}
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
                            onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                            className="text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
