'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { showToast } from '@/lib/toast'
import { ArrowLeft, UserPlus, Save, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { z } from 'zod'

interface AssignUserFormProps {
  client: any
  users: any[]
}

export function AssignUserForm({ client, users }: AssignUserFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState(client.assignedUserId || 'unassigned')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        showToast.success('User assigned successfully')
        router.push(`/dashboard/clients/${client.id}`)
      } else {
        showToast.error(data.error || 'Failed to assign user')
      }
    } catch (error: any) {
      showToast.error('Error assigning user')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          {/* Header */}
          <div className="page-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                  className="btn-outline"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Client
                </Button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold">Assign User</h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Assign {client.companyName} to a team member
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Client Information */}
            <Card className="shadow-professional">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Client Information</CardTitle>
                <CardDescription>Details about the client being assigned</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <div className="p-3 bg-muted rounded-sm border border-border">
                      <span className="text-sm font-medium">{client.companyName}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Client Code</Label>
                    <div className="p-3 bg-muted rounded-sm border border-border">
                      <span className="text-sm font-mono">{client.clientCode || 'Not assigned'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Company Number</Label>
                    <div className="p-3 bg-muted rounded-sm border border-border">
                      <span className="text-sm font-mono">{client.companyNumber || 'Not applicable'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Current Assignment</Label>
                    <div className="p-3 bg-muted rounded-sm border border-border">
                      <span className="text-sm">
                        {client.assignedUser ? client.assignedUser.name : 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Assignment */}
            <Card className="shadow-professional">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Assign to User</CardTitle>
                <CardDescription>Select a team member to assign this client to</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                          <User className="h-4 w-4 text-gray-400" />
                          <span>Unassigned</span>
                        </div>
                      </SelectItem>
                      {session?.user?.id && (
                        <SelectItem value={session.user.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-600">Assign to Me</span>
                            <span className="text-xs text-blue-500">({session.user.role})</span>
                          </div>
                        </SelectItem>
                      )}
                      {users
                        .filter(user => user.id !== session?.user?.id)
                        .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-600" />
                            <span>{user.name}</span>
                            <span className="text-xs text-muted-foreground">({user.role})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select a user to assign this client to, or leave unassigned
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
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/clients/${client.id}`)}
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
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 