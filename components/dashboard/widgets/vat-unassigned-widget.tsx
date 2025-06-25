'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Calendar, Clock, User, UserPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface UnassignedVATClient {
  id: string
  clientId: string
  clientCode: string
  companyName: string
  quarterPeriod: string
  quarterEndDate: string
  filingDueDate: string
  currentStage: string
  daysSinceQuarterEnd: number
  priority: 'low' | 'medium' | 'high'
  generalAssignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  vatAssignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface AvailableUser {
  id: string
  name: string
  email: string
  role: string
}

export function VATUnassignedWidget() {
  const [unassignedClients, setUnassignedClients] = useState<UnassignedVATClient[]>([])
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [currentMonth, setCurrentMonth] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [assigningClient, setAssigningClient] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchUnassignedClients = async () => {
    try {
      const response = await fetch('/api/dashboard/vat-unassigned')
      const data = await response.json()

      if (data.success) {
        setUnassignedClients(data.clients || [])
        setCurrentMonth(data.currentMonth || '')
      } else {
        console.error('Failed to fetch unassigned VAT clients:', data.error)
      }
    } catch (error) {
      console.error('Error fetching unassigned VAT clients:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()

      if (data.success) {
        // Filter to only show staff, managers, and partners
        const filteredUsers = data.users.filter((user: AvailableUser) => 
          ['STAFF', 'MANAGER', 'PARTNER'].includes(user.role)
        )
        setAvailableUsers(filteredUsers)
      }
    } catch (error) {
      console.error('Error fetching available users:', error)
    }
  }

  useEffect(() => {
    fetchUnassignedClients()
    fetchAvailableUsers()
  }, [])

  const handleAssignClient = async (vatQuarterId: string, assignedUserId: string) => {
    if (!assignedUserId || assignedUserId === 'select-user') return

    setAssigningClient(vatQuarterId)

    try {
      const response = await fetch('/api/dashboard/vat-unassigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vatQuarterId,
          assignedUserId
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message
        })
        // Refresh the list
        await fetchUnassignedClients()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to assign VAT quarter',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error assigning VAT quarter:', error)
      toast({
        title: 'Error',
        description: 'Failed to assign VAT quarter. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setAssigningClient(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-green-100 text-green-800 border-green-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') return <AlertTriangle className="h-3 w-3" />
    return <Clock className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">VAT Unassigned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          VAT Unassigned
          {currentMonth && (
            <Badge variant="outline" className="text-xs">
              {currentMonth}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {unassignedClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <User className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              All VAT clients assigned for this month
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {unassignedClients.map((client) => (
              <div key={client.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate">
                        {client.companyName}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs flex items-center gap-1 ${getPriorityColor(client.priority)}`}
                      >
                        {getPriorityIcon(client.priority)}
                        {client.priority}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Quarter ended: {client.quarterEndDate}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {client.daysSinceQuarterEnd} days since quarter end
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(value) => handleAssignClient(client.id, value)}
                    disabled={assigningClient === client.id}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select-user" disabled>
                        Select user...
                      </SelectItem>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span>{user.name || user.email}</span>
                            <Badge variant="outline" className="text-xs">
                              {user.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {assigningClient === client.id && (
                    <div className="text-xs text-muted-foreground">
                      Assigning...
                    </div>
                  )}
                </div>

                {/* Show suggested assignees if available */}
                {(client.vatAssignedUser || client.generalAssignedUser) && (
                  <div className="text-xs text-muted-foreground">
                    Suggested: {client.vatAssignedUser?.name || client.generalAssignedUser?.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 