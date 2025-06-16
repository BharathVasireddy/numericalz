'use client'

import { useState, useEffect } from 'react'
import { showToast } from '@/lib/toast'
import { UserPlus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

interface Client {
  id: string
  companyName: string
  clientCode: string | null
  assignedUser?: {
    id: string
    name: string
    email: string
  }
}

interface AssignUserModalProps {
  client: Client | null
  users: User[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AssignUserModal({ client, users, isOpen, onClose, onSuccess }: AssignUserModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('unassigned')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen && client) {
      setSelectedUserId(client.assignedUser?.id || 'unassigned')
    }
  }, [isOpen, client])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client) return

    setIsLoading(true)
    
    try {
      const response = await fetch(`/api/clients/${client.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignedUserId: selectedUserId === 'unassigned' ? null : selectedUserId }),
      })

      const data = await response.json()

      if (data.success) {
        const assignedUser = users.find(u => u.id === selectedUserId)
        showToast.success(
          selectedUserId === 'unassigned' 
            ? 'Client unassigned successfully'
            : `Client assigned to ${assignedUser?.name} successfully`
        )
        onSuccess()
        onClose()
      } else {
        showToast.error(data.error || 'Failed to assign user')
      }
    } catch (error: any) {
      showToast.error('Error assigning user')
    } finally {
      setIsLoading(false)
    }
  }

  if (!client) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign User
          </DialogTitle>
          <DialogDescription>
            Assign <strong>{client.companyName}</strong> to a team member
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assignedUser">Assigned User</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
            >
              <SelectTrigger className="input-field">
                <SelectValue placeholder="Select a user or leave unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({user.role})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Current assignment: {client.assignedUser?.name || 'Unassigned'}
            </p>
          </div>

          {selectedUserId && selectedUserId !== 'unassigned' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-sm">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {users.find(u => u.id === selectedUserId)?.name} will be assigned to this client
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                They will receive access to view and manage this client's information
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="btn-outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Assigning...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 