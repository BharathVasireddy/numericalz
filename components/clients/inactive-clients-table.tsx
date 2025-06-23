'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { 
  RotateCcw, 
  Trash2, 
  AlertTriangle,
  Building2,
  ChevronUp,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { showToast } from '@/lib/toast'

interface InactiveClient {
  id: string
  clientCode: string | null
  companyName: string
  companyType: string | null
  companyNumber: string | null
  updatedAt: Date
  assignedUser: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface InactiveClientsTableProps {
  clients: InactiveClient[]
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

export function InactiveClientsTable({ clients }: InactiveClientsTableProps) {
  const router = useRouter()
  const [isReassigning, setIsReassigning] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<string>('companyName')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    client: InactiveClient | null
  }>({
    isOpen: false,
    client: null
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteAllDialog, setDeleteAllDialog] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const handleReassign = async (clientId: string) => {
    setIsReassigning(clientId)
    try {
      const response = await fetch(`/api/clients/${clientId}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        showToast.success('Client reassigned successfully')
        router.refresh()
      } else {
        const data = await response.json()
        showToast.error(data.error || 'Failed to reassign client')
      }
    } catch (error) {
      showToast.error('Failed to reassign client')
    } finally {
      setIsReassigning(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.client) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/clients/${deleteDialog.client.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        showToast.success('Client deleted permanently')
        setDeleteDialog({ isOpen: false, client: null })
        router.refresh()
      } else {
        const data = await response.json()
        showToast.error(data.error || 'Failed to delete client')
      }
    } catch (error) {
      showToast.error('Failed to delete client')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAll = async () => {
    setIsDeletingAll(true)
    try {
      const clientIds = clients.map(client => client.id)
      
      // Use the optimized bulk delete endpoint
      const response = await fetch('/api/clients/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientIds })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        if (data.success) {
          showToast.success(data.message)
        } else {
          showToast.error(data.error || 'Some deletions failed')
        }
      } else {
        showToast.error(data.error || 'Failed to delete clients')
      }
      
      setDeleteAllDialog(false)
      router.refresh()
    } catch (error) {
      showToast.error('Failed to delete clients')
    } finally {
      setIsDeletingAll(false)
    }
  }

  const getCompanyTypeLabel = (type: string | null) => {
    if (!type) return 'Unknown'
    
    switch (type) {
      case 'LIMITED_COMPANY':
        return 'Ltd'
      case 'NON_LIMITED_COMPANY':
        return 'Non-Ltd'
      case 'DIRECTOR':
        return 'Director'
      case 'SUB_CONTRACTOR':
        return 'Sub Con'
      default:
        return type
    }
  }

  // Sort clients based on current sort settings
  const sortedClients = [...clients].sort((a, b) => {
    let aValue: any = a[sortBy as keyof InactiveClient]
    let bValue: any = b[sortBy as keyof InactiveClient]
    
    // Handle nested assignedUser sorting
    if (sortBy === 'assignedUser') {
      aValue = a.assignedUser?.name || ''
      bValue = b.assignedUser?.name || ''
    }
    
    // Handle date sorting
    if (sortBy === 'updatedAt') {
      aValue = new Date(a.updatedAt).getTime()
      bValue = new Date(b.updatedAt).getTime()
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

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Building2 className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="font-medium mb-1">No Inactive Clients</h3>
          <p className="text-sm text-muted-foreground text-center">
            No resigned or inactive clients found.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Inactive Clients ({clients.length})
            </CardTitle>
            {clients.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteAllDialog(true)}
                className="text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Compact Desktop Table */}
          <div className="hidden md:block">
            <table className="table-fixed-layout">
              <thead>
                <tr className="table-header-row">
                  <SortableHeader sortKey="clientCode" currentSort={sortBy} sortOrder={sortOrder} onSort={handleSort} className="col-client-code">
                    Code
                  </SortableHeader>
                  <SortableHeader sortKey="companyName" currentSort={sortBy} sortOrder={sortOrder} onSort={handleSort} className="col-company-name">
                    Company
                  </SortableHeader>
                  <SortableHeader sortKey="companyType" currentSort={sortBy} sortOrder={sortOrder} onSort={handleSort} className="col-role">
                    Type
                  </SortableHeader>
                  <SortableHeader sortKey="companyNumber" currentSort={sortBy} sortOrder={sortOrder} onSort={handleSort} className="col-company-number">
                    Co. No.
                  </SortableHeader>
                  <SortableHeader sortKey="updatedAt" currentSort={sortBy} sortOrder={sortOrder} onSort={handleSort} className="col-date">
                    Resigned
                  </SortableHeader>
                  <th className="table-header-cell col-actions text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map((client) => (
                  <tr key={client.id} className="table-body-row">
                    <td className="table-body-cell">
                      <span className="text-xs font-mono">
                        {client.clientCode || 'N/A'}
                      </span>
                    </td>
                    <td className="table-body-cell">
                      <div className="truncate">
                        <span className="font-medium text-sm" title={client.companyName}>
                          {client.companyName}
                        </span>
                      </div>
                    </td>
                    <td className="table-body-cell">
                      <span className="text-xs">
                        {getCompanyTypeLabel(client.companyType)}
                      </span>
                    </td>
                    <td className="table-body-cell">
                      <span className="text-xs font-mono">
                        {client.companyNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="table-body-cell">
                      <span className="text-xs">
                        {format(new Date(client.updatedAt), 'dd/MM/yy')}
                      </span>
                    </td>
                    <td className="table-actions-cell">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReassign(client.id)}
                          disabled={isReassigning === client.id}
                          className="h-7 px-2 text-xs hover:bg-green-50 hover:border-green-300"
                        >
                          <RotateCcw className="h-3 w-3 mr-1 text-green-600" />
                          {isReassigning === client.id ? 'Wait' : 'Reassign'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteDialog({ isOpen: true, client })}
                          className="h-7 px-2 text-xs hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="h-3 w-3 mr-1 text-red-600" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Compact Mobile Cards */}
          <div className="md:hidden space-y-3">
            {sortedClients.map((client) => (
              <Card key={client.id} className="border">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">{client.companyName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {client.clientCode || 'No code'} • {getCompanyTypeLabel(client.companyType)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="text-muted-foreground">Resigned:</span>{' '}
                      <span>{format(new Date(client.updatedAt), 'dd/MM/yyyy')}</span>
                      {client.companyNumber && (
                        <>
                          {' • '}
                          <span className="text-muted-foreground">Co. No:</span>{' '}
                          <span>{client.companyNumber}</span>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReassign(client.id)}
                        disabled={isReassigning === client.id}
                        className="flex-1 h-8 text-xs hover:bg-green-50 hover:border-green-300"
                      >
                        <RotateCcw className="h-3 w-3 mr-1 text-green-600" />
                        {isReassigning === client.id ? 'Wait' : 'Reassign'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteDialog({ isOpen: true, client })}
                        className="flex-1 h-8 text-xs hover:bg-red-50 hover:border-red-300"
                      >
                        <Trash2 className="h-3 w-3 mr-1 text-red-600" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => 
        setDeleteDialog({ isOpen: open, client: deleteDialog.client })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{' '}
              <span className="font-medium">{deleteDialog.client?.companyName}</span>?
              This action cannot be undone and will remove all client data permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ isOpen: false, client: null })}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <Dialog open={deleteAllDialog} onOpenChange={setDeleteAllDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete All Inactive Clients
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <span className="font-medium">ALL {clients.length} inactive clients</span>?
              This action cannot be undone and will remove all inactive client data permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteAllDialog(false)}
              disabled={isDeletingAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isDeletingAll}
            >
              {isDeletingAll ? 'Deleting All...' : `Delete All ${clients.length} Clients`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 