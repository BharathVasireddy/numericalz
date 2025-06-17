'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { 
  RotateCcw, 
  Trash2, 
  AlertTriangle,
  Building2,
  User,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  companyType: string
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

export function InactiveClientsTable({ clients }: InactiveClientsTableProps) {
  const router = useRouter()
  const [isReassigning, setIsReassigning] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    client: InactiveClient | null
  }>({
    isOpen: false,
    client: null
  })
  const [isDeleting, setIsDeleting] = useState(false)

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
      // Error reassigning client
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
      // Error deleting client
      showToast.error('Failed to delete client')
    } finally {
      setIsDeleting(false)
    }
  }

  const getCompanyTypeLabel = (type: string) => {
    switch (type) {
      case 'LIMITED_COMPANY':
        return 'Limited Company'
      case 'NON_LIMITED_COMPANY':
        return 'Non Limited Company'
      case 'DIRECTOR':
        return 'Director'
      case 'SUB_CONTRACTOR':
        return 'Sub Contractor'
      default:
        return type
    }
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Inactive Clients</h3>
          <p className="text-sm text-muted-foreground text-center">
            There are no resigned or inactive clients at the moment.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Inactive Clients ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Company Number</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Resigned Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.clientCode || 'No code'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {getCompanyTypeLabel(client.companyType)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {client.companyNumber || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {client.assignedUser?.name || 'Unassigned'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {format(new Date(client.updatedAt), 'dd/MM/yyyy')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReassign(client.id)}
                          disabled={isReassigning === client.id}
                          className="btn-outline"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          {isReassigning === client.id ? 'Reassigning...' : 'Reassign'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteDialog({ isOpen: true, client })}
                          className="btn-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {clients.map((client) => (
              <Card key={client.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{client.companyName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {client.clientCode || 'No code'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{getCompanyTypeLabel(client.companyType)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{client.assignedUser?.name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(client.updatedAt), 'dd/MM/yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">Company #:</span>
                        <span className="text-xs">{client.companyNumber || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReassign(client.id)}
                        disabled={isReassigning === client.id}
                        className="btn-outline flex-1"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {isReassigning === client.id ? 'Reassigning...' : 'Reassign'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialog({ isOpen: true, client })}
                        className="btn-destructive flex-1"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
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
    </>
  )
} 