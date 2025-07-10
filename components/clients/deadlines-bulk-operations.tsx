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
import { UserPlus, Mail, Send, Users, AlertTriangle, X } from 'lucide-react'
import { showToast } from '@/lib/toast'

interface DeadlinesBulkOperationsProps {
  selectedItems: string[]
  users: Array<{ id: string; name: string; email: string; role: string }>
  onClearSelection: () => void
  onRefreshData: () => void
  type: 'vat' | 'ltd'  // Specify which type of deadlines table
}

/**
 * Bulk operations component for deadlines tables (VAT and Ltd)
 * 
 * Features:
 * - Partner and Manager access control
 * - Bulk assign users to VAT quarters or Ltd workflows
 * - Bulk email sending with template selection
 * - Confirmation dialogs for actions
 * - Selection count display
 * - Extensible for future bulk operations
 */
export function DeadlinesBulkOperations({ 
  selectedItems, 
  users, 
  onClearSelection, 
  onRefreshData,
  type 
}: DeadlinesBulkOperationsProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { data: session } = useSession()

  // Only show for partners and managers
  if ((session?.user?.role !== 'PARTNER' && session?.user?.role !== 'MANAGER') || selectedItems.length === 0) {
    return null
  }

  const entityName = type === 'vat' ? 'VAT quarter' : 'Ltd workflow'
  const entityNamePlural = type === 'vat' ? 'VAT quarters' : 'Ltd workflows'

  const handleBulkAssign = async () => {
    if (!selectedUserId) {
      showToast.error('Please select a user to assign to')
      return
    }

    setIsLoading(true)
    try {
      const endpoint = type === 'vat' 
        ? '/api/vat-quarters/bulk'
        : '/api/clients/ltd-deadlines/bulk'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [type === 'vat' ? 'quarterIds' : 'clientIds']: selectedItems,
          operation: 'assign',
          assignedUserId: selectedUserId
        })
      })

      if (response.ok) {
        const data = await response.json()
        const selectedUser = users.find(u => u.id === selectedUserId)
        showToast.success(`Successfully assigned ${selectedItems.length} ${entityNamePlural} to ${selectedUser?.name}`)
        onClearSelection()
        onRefreshData()
        setSelectedUserId('')
        setShowAssignModal(false)
      } else {
        const data = await response.json()
        showToast.error(data.error || `Failed to assign ${entityNamePlural}`)
      }
    } catch (error) {
      showToast.error(`Failed to assign ${entityNamePlural}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBulkEmail = async () => {
    // For now, show a coming soon message
    // This will be enhanced with template selection in future
    showToast.info('Bulk email functionality will be implemented next')
    setShowEmailModal(false)
  }

  return (
    <>
      <Card className="mb-4 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {selectedItems.length} selected
              </Badge>
              <span className="text-sm text-muted-foreground">
                Bulk operations for {entityNamePlural}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {/* Bulk Assign Button */}
              <Button
                size="sm"
                onClick={() => setShowAssignModal(true)}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Assign User
              </Button>

              {/* Bulk Email Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowEmailModal(true)}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Send Email
              </Button>

              {/* Clear Selection */}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSelection}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Assign Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Assign {entityNamePlural}
            </DialogTitle>
            <DialogDescription>
              Select a user to assign all {selectedItems.length} selected {entityNamePlural} to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="user-select" className="text-sm font-medium">
                Select User
              </label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user to assign to" />
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
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignModal(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!selectedUserId || isLoading}
            >
              {isLoading ? 'Assigning...' : `Assign ${selectedItems.length} ${entityNamePlural}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Modal */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              Send Bulk Email
            </DialogTitle>
            <DialogDescription>
              Send emails to all {selectedItems.length} selected {entityNamePlural}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Coming Soon</span>
              </div>
              <p className="text-sm text-blue-600 mt-2">
                Email template selection and bulk sending functionality will be implemented in the next iteration.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailModal(false)}
              disabled={isLoading}
            >
              Close
            </Button>
            <Button
              onClick={handleBulkEmail}
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Emails'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 