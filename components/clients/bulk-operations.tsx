'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UserPlus, UserX, RefreshCw, AlertTriangle, Users } from 'lucide-react'
import { showToast } from '@/lib/toast'

interface BulkOperationsProps {
  selectedClients: string[]
  users: Array<{ id: string; name: string; email: string; role: string }>
  onClearSelection: () => void
  onRefreshClients: () => void
}

/**
 * Bulk operations component for client management
 * 
 * Features:
 * - Partner and Manager access control
 * - Bulk assign clients to team members
 * - Bulk resign clients (move to inactive status)
 * - Bulk refresh Companies House data
 * - Bulk email placeholder for future implementation
 * - Confirmation dialogs for destructive actions
 * - Selection count display
 */
export function BulkOperations({ 
  selectedClients, 
  users, 
  onClearSelection, 
  onRefreshClients 
}: BulkOperationsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [showResignModal, setShowResignModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()

  // Only show for partners and managers
  if ((session?.user?.role !== 'PARTNER' && session?.user?.role !== 'MANAGER') || selectedClients.length === 0) {
    return null
  }

  const handleBulkAssign = async () => {
    if (!selectedUserId) {
      showToast.error('Please select a user to assign clients to')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/clients/bulk-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientIds: selectedClients,
          assignedUserId: selectedUserId
        })
      })

      if (response.ok) {
        const selectedUser = users.find(u => u.id === selectedUserId)
        showToast.success(`Successfully assigned ${selectedClients.length} clients to ${selectedUser?.name}`)
        onClearSelection()
        onRefreshClients()
        setSelectedUserId('')
      } else {
        const data = await response.json()
        showToast.error(data.error || 'Failed to assign clients')
      }
    } catch (error) {
      // Error assigning clients
      showToast.error('Failed to assign clients')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkResign = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/clients/bulk-resign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientIds: selectedClients
        })
      })

      if (response.ok) {
        showToast.success(`Successfully resigned ${selectedClients.length} clients`)
        onClearSelection()
        onRefreshClients()
        setShowResignModal(false)
      } else {
        const data = await response.json()
        showToast.error(data.error || 'Failed to resign clients')
      }
    } catch (error) {
      // Error resigning clients
      showToast.error('Failed to resign clients')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkRefresh = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/clients/bulk-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientIds: selectedClients
        })
      })

      if (response.ok) {
        showToast.success(`Successfully refreshed ${selectedClients.length} clients from Companies House`)
        onClearSelection()
        onRefreshClients()
      } else {
        const data = await response.json()
        showToast.error(data.error || 'Failed to refresh clients')
      }
    } catch (error) {
      // Error refreshing clients
      showToast.error('Failed to refresh clients')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkEmail = () => {
    showToast.info('Bulk email functionality coming soon')
  }

  return (
    <>
      <Card className="mb-4 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {selectedClients.length} selected
              </Badge>
              <span className="text-sm text-muted-foreground">
                Bulk operations available
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {/* Bulk Assign */}
              <div className="flex items-center gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select user to assign" />
                  </SelectTrigger>
                  <SelectContent>
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
                      .map(user => (
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
                <Button
                  size="sm"
                  onClick={handleBulkAssign}
                  disabled={!selectedUserId || isLoading}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Assign
                </Button>
              </div>

              {/* Bulk Refresh */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkRefresh}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh CH
              </Button>

              {/* Bulk Resign */}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowResignModal(true)}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <UserX className="h-4 w-4" />
                Resign
              </Button>

              {/* Clear Selection */}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSelection}
                disabled={isLoading}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resign Confirmation Modal */}
      <Dialog open={showResignModal} onOpenChange={setShowResignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Confirm Bulk Resignation
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to resign {selectedClients.length} selected clients? 
              This will move them to inactive status and they will no longer appear in the main clients list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResignModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkResign}
              disabled={isLoading}
            >
              {isLoading ? 'Resigning...' : 'Resign Clients'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 