'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { showToast } from '@/lib/toast'
import { useErrorHandler } from '@/lib/hooks/useErrorHandler'
import { UserPlus, Save, User } from 'lucide-react'
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
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('unassigned')
  const { handleApiError } = useErrorHandler()

  // Debug: Log users array when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('AssignUserModal opened with users:', users)
      console.log('Current session:', session?.user)
    }
  }, [isOpen, users, session])

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
      // Handle "me" option
      const userIdToAssign = selectedUserId === 'me' ? session?.user?.id : selectedUserId
      
      const response = await fetch(`/api/clients/${client.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: userIdToAssign === 'unassigned' ? null : userIdToAssign }),
      })

      const data = await response.json()

      if (data.success) {
        let assignedUserName = ''
        if (selectedUserId === 'me') {
          assignedUserName = session?.user?.name || 'yourself'
        } else if (selectedUserId !== 'unassigned') {
          const assignedUser = users.find(u => u.id === selectedUserId)
          assignedUserName = assignedUser?.name || 'selected user'
        }

        showToast.success(
          selectedUserId === 'unassigned' 
            ? 'Client unassigned successfully'
            : selectedUserId === 'me'
            ? 'Client assigned to you successfully'
            : `Client assigned to ${assignedUserName} successfully`
        )
        onSuccess()
        onClose()
      } else {
        showToast.error(data.error || 'Failed to assign user')
      }
    } catch (error: any) {
      handleApiError(error, 'Failed to assign user')
    } finally {
      setIsLoading(false)
    }
  }

  if (!client) return null

  // Check if current user is in the users list
  const currentUserInList = users.find(u => u.id === session?.user?.id)
  
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
                <SelectItem value="unassigned">
                  <div className="flex items-center gap-2">
                    <span>Unassigned</span>
                  </div>
                </SelectItem>
                
                {/* Assign to Me option */}
                {session?.user && (
                  <SelectItem value="me">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Assign to Me</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({session.user.role})
                      </span>
                    </div>
                  </SelectItem>
                )}
                
                {/* Other users */}
                {users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({user.role})
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-users" disabled>
                    <span className="text-muted-foreground">No other users available</span>
                  </SelectItem>
                )}
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
                  {selectedUserId === 'me' 
                    ? 'You will be assigned to this client'
                    : `${users.find(u => u.id === selectedUserId)?.name} will be assigned to this client`
                  }
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                {selectedUserId === 'me' 
                  ? 'You will receive access to view and manage this client\'s information'
                  : 'They will receive access to view and manage this client\'s information'
                }
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