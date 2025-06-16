'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { showToast } from '@/lib/toast'
import { Users, UserX, RefreshCw, Mail, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface BulkOperationsProps {
  selectedClients: string[]
  users: User[]
  onClearSelection: () => void
  onRefreshClients: () => void
}

/**
 * Bulk operations component for client management
 * 
 * Features:
 * - Manager-only access control
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

  // Only show for managers
  if (session?.user?.role !== 'MANAGER' || selectedClients.length === 0) {
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
      console.error('Error assigning clients:', error)
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
      console.error('Error resigning clients:', error)
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
      console.error('Error refreshing clients:', error)
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
      {/* Selection Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 min-w-[600px]">
          <div className="flex items-center gap-2">
            <span className="font-medium">{selectedClients.length} clients selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Assign to User */}
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[180px] bg-white text-black">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              onClick={handleBulkAssign}
              disabled={!selectedUserId || isLoading}
              variant="secondary"
              size="sm"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Users className="h-4 w-4 mr-1" />
              Assign
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowResignModal(true)}
              disabled={isLoading}
              variant="secondary"
              size="sm"
              className="bg-white text-red-600 hover:bg-gray-100"
            >
              <UserX className="h-4 w-4 mr-1" />
              Resign
            </Button>

            <Button
              onClick={handleBulkRefresh}
              disabled={isLoading}
              variant="secondary"
              size="sm"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>

            <Button
              onClick={handleBulkEmail}
              disabled={isLoading}
              variant="secondary"
              size="sm"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <Mail className="h-4 w-4 mr-1" />
              Email
            </Button>
          </div>

          <Button
            onClick={onClearSelection}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-blue-700 ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resign Confirmation Modal */}
      <Dialog open={showResignModal} onOpenChange={setShowResignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Resign</DialogTitle>
            <DialogDescription>
              Are you sure you want to resign {selectedClients.length} selected clients? 
              This will move them to inactive status and they will no longer appear in the active clients list.
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