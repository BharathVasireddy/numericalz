'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Users, 
  Loader2,
  CheckCircle,
  Info,
  Shield,
  Crown,
  User
} from 'lucide-react'
import { showToast } from '@/lib/toast'

interface ChaseTeamAssignmentProps {
  isOpen: boolean
  onComplete: (updatedClient: any) => void
  client: {
    id: string
    companyName: string
    companyNumber?: string
    clientCode: string
    companyType: string
  }
  compact?: boolean // New prop for compact mode in wizard
}

interface ChaseUser {
  id: string
  name: string
  email: string
  role: string
}

export function ChaseTeamAssignment({ 
  isOpen, 
  onComplete, 
  client,
  compact = false 
}: ChaseTeamAssignmentProps) {
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [availableUsers, setAvailableUsers] = useState<ChaseUser[]>([])
  const [selectedChaseTeam, setSelectedChaseTeam] = useState<string[]>([])

  // Fetch available users for chase team selection
  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers()
    }
  }, [isOpen])

  const fetchAvailableUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        const users = data.users || []
        
        // Filter to partners and managers only
        const chaseEligibleUsers = users.filter((user: any) => 
          user.role === 'PARTNER' || user.role === 'MANAGER'
        )
        
        setAvailableUsers(chaseEligibleUsers)
        
        // Pre-select default chase team (Mukul and George)
        const defaultChaseUsers = chaseEligibleUsers.filter((user: any) => 
          user.email === 'mukul@numericalz.com' || user.email === 'george@numericalz.com'
        )
        
        const defaultSelectedIds = defaultChaseUsers.map((user: any) => user.id)
        setSelectedChaseTeam(defaultSelectedIds)
        
        console.log('🎯 Default chase team selected:', defaultChaseUsers.map((u: ChaseUser) => u.name))
      } else {
        throw new Error(data.error || 'Failed to fetch users')
      }
    } catch (error: any) {
      console.error('Error fetching users:', error)
      showToast.error('Failed to load team members')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleUserToggle = (userId: string, checked: boolean) => {
    setSelectedChaseTeam(prev => {
      if (checked) {
        return [...prev, userId]
      } else {
        return prev.filter(id => id !== userId)
      }
    })
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const requestData = {
        chaseTeamUserIds: selectedChaseTeam
      }

      console.log('🔍 Sending chase team data:', requestData)

      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Chase team assigned successfully')
        onComplete(data.client)
      } else {
        throw new Error(data.error || 'Failed to assign chase team')
      }
    } catch (error: any) {
      console.error('Error assigning chase team:', error)
      showToast.error('Failed to assign chase team')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Skip chase team assignment and proceed with original client data
    onComplete(client)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PARTNER':
        return <Crown className="h-3 w-3 text-purple-600" />
      case 'MANAGER':
        return <Shield className="h-3 w-3 text-blue-600" />
      default:
        return <User className="h-3 w-3 text-gray-600" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'PARTNER':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const containerClass = compact ? 'sm:max-w-md' : 'sm:max-w-lg'
  const spacingClass = compact ? 'space-y-3' : 'space-y-6'
  const paddingClass = compact ? 'p-3' : 'p-6'

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className={containerClass}>
        <DialogHeader className={compact ? 'pb-2' : ''}>
          <DialogTitle className={`flex items-center gap-2 ${compact ? 'text-lg' : ''}`}>
            <Users className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
            Chase Team Assignment
          </DialogTitle>
          <p className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
            Select partners or managers to chase "{client.companyName}" for paperwork.
          </p>
        </DialogHeader>

        <div className={spacingClass}>
          {compact ? (
            // Compact version for wizard
            <div className="space-y-3">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="ml-2 text-xs text-muted-foreground">Loading...</span>
                </div>
              ) : (
                <>
                  {availableUsers.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-700">Select Chase Team Members:</Label>
                      {availableUsers.map((user) => (
                        <div key={user.id} className="flex items-center space-x-2 p-2 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                          <Checkbox
                            id={user.id}
                            checked={selectedChaseTeam.includes(user.id)}
                            onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getRoleIcon(user.role)}
                              <div>
                                <Label htmlFor={user.id} className="text-xs font-medium cursor-pointer">
                                  {user.name}
                                </Label>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <div className={`px-1.5 py-0.5 rounded text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                              {user.role}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Users className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                      <p className="text-xs text-muted-foreground">No partners or managers available</p>
                    </div>
                  )}

                  {selectedChaseTeam.length > 0 && (
                    <div className="p-2 bg-blue-50 rounded border border-blue-200">
                      <div className="flex items-center gap-1 text-blue-800">
                        <CheckCircle className="h-3 w-3" />
                        <span className="text-xs font-medium">Selected: {selectedChaseTeam.length} member{selectedChaseTeam.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedChaseTeam.map(userId => {
                          const user = availableUsers.find(u => u.id === userId)
                          return user ? (
                            <span key={userId} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                              {getRoleIcon(user.role)}
                              {user.name.split(' ')[0]}
                            </span>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            // Full version for edit forms
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                  Chase Team Selection
                </CardTitle>
                <CardDescription>
                  Select partners or managers who will chase this client for paperwork
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading team members...</span>
                  </div>
                ) : (
                  <>
                    {availableUsers.length > 0 ? (
                      <div className="space-y-3">
                        {availableUsers.map((user) => (
                          <div key={user.id} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                            <Checkbox
                              id={user.id}
                              checked={selectedChaseTeam.includes(user.id)}
                              onCheckedChange={(checked) => handleUserToggle(user.id, checked as boolean)}
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getRoleIcon(user.role)}
                                <div>
                                  <Label htmlFor={user.id} className="font-medium cursor-pointer">
                                    {user.name}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                              <div className={`px-2 py-1 rounded-md text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                                {user.role}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-muted-foreground">No partners or managers available</p>
                      </div>
                    )}

                    {selectedChaseTeam.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-800">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">Selected Chase Team</span>
                        </div>
                        <p className="text-blue-700 mt-1">
                          {selectedChaseTeam.length} member{selectedChaseTeam.length !== 1 ? 's' : ''} will be responsible for chasing paperwork from this client.
                        </p>
                        <div className="mt-2 space-x-2">
                          {selectedChaseTeam.map(userId => {
                            const user = availableUsers.find(u => u.id === userId)
                            return user ? (
                              <span key={userId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                                {getRoleIcon(user.role)}
                                {user.name}
                              </span>
                            ) : null
                          })}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 text-amber-800">
                        <Info className="h-4 w-4" />
                        <span className="font-medium">Important</span>
                      </div>
                      <p className="text-amber-700 mt-1 text-sm">
                        Chase team members will see clients with "Pending to Chase" status on their dashboard and will receive workflow notifications.
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className={`flex justify-between ${compact ? 'pt-2 border-t' : 'pt-4 border-t'}`}>
            <Button 
              variant="ghost" 
              onClick={handleSkip} 
              disabled={loading}
              size={compact ? "sm" : "default"}
            >
              Skip Assignment
            </Button>
            
            <Button 
              onClick={handleComplete} 
              disabled={loading || loadingUsers || selectedChaseTeam.length === 0}
              size={compact ? "sm" : "default"}
            >
              {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              {loading ? 'Assigning...' : 'Continue'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 