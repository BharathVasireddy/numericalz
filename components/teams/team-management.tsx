'use client'

import { useState } from 'react'
import { showToast } from '@/lib/toast'
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Building2,
  Calendar,
  AlertTriangle,
  Shield,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CreateTeamMemberForm } from './create-team-member-form'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  assignedClients: Array<{
    id: string
    companyName: string
    companyType: string
    nextAccountsDue: Date | null
    nextConfirmationDue: Date | null
  }>
  _count: {
    assignedClients: number
  }
}

interface TeamManagementProps {
  users: TeamMember[]
}

export function TeamManagement({ users: initialUsers }: TeamManagementProps) {
  const [users, setUsers] = useState<TeamMember[]>(initialUsers)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<TeamMember | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refreshUsers = async () => {
    try {
      const response = await fetch('/api/users/team')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error refreshing users:', error)
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showToast.success('Team member deleted successfully')
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id))
        setShowDeleteDialog(false)
        setUserToDelete(null)
      } else {
        const data = await response.json()
        showToast.error(data.error || 'Failed to delete team member')
      }
    } catch (error) {
      showToast.error('Failed to delete team member')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        showToast.success(`Team member ${!isActive ? 'activated' : 'deactivated'} successfully`)
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, isActive: !isActive } : u
        ))
      } else {
        showToast.error('Failed to update team member status')
      }
    } catch (error) {
      showToast.error('Failed to update team member status')
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatLastLogin = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 48) return 'Yesterday'
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getUpcomingDeadlines = (user: TeamMember) => {
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    
    let upcomingAccounts = 0
    let upcomingCS = 0
    let overdueAccounts = 0
    let overdueCS = 0
    
    user.assignedClients.forEach(client => {
      if (client.nextAccountsDue) {
        const accountsDate = new Date(client.nextAccountsDue)
        if (accountsDate < now) {
          overdueAccounts++
        } else if (accountsDate <= thirtyDaysFromNow) {
          upcomingAccounts++
        }
      }
      
      if (client.nextConfirmationDue) {
        const csDate = new Date(client.nextConfirmationDue)
        if (csDate < now) {
          overdueCS++
        } else if (csDate <= thirtyDaysFromNow) {
          upcomingCS++
        }
      }
    })
    
    return { upcomingAccounts, upcomingCS, overdueAccounts, overdueCS }
  }

  const getDailyWorkload = (user: TeamMember) => {
    const deadlines = getUpcomingDeadlines(user)
    const totalUrgent = deadlines.overdueAccounts + deadlines.overdueCS
    const totalUpcoming = deadlines.upcomingAccounts + deadlines.upcomingCS
    
    // Estimate daily tasks based on client count and upcoming deadlines
    const baseDaily = Math.ceil(user._count.assignedClients / 30) // Assume monthly touch-base
    const urgentDaily = totalUrgent // Urgent items need immediate attention
    const upcomingDaily = Math.ceil(totalUpcoming / 7) // Spread upcoming over a week
    
    return Math.max(1, baseDaily + urgentDaily + upcomingDaily)
  }

  const isDateOverdue = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return new Date(date) < today
  }

  const getWorkloadColor = (count: number) => {
    if (count === 0) return 'bg-gray-100 text-gray-600'
    if (count <= 3) return 'bg-green-100 text-green-700'
    if (count <= 6) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  const activeUsers = users.filter(u => u.isActive)
  const inactiveUsers = users.filter(u => !u.isActive)

  const totalClients = activeUsers.reduce((sum, user) => sum + user._count.assignedClients, 0)
  const totalUpcomingDeadlines = activeUsers.reduce((sum, user) => {
    const deadlines = getUpcomingDeadlines(user)
    return sum + deadlines.upcomingAccounts + deadlines.upcomingCS
  }, 0)
  const totalOverdueDeadlines = activeUsers.reduce((sum, user) => {
    const deadlines = getUpcomingDeadlines(user)
    return sum + deadlines.overdueAccounts + deadlines.overdueCS
  }, 0)

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Team Management</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Manage team members and view their workload statistics
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              {inactiveUsers.length} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">
              Assigned to team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{totalUpcomingDeadlines}</div>
            <p className="text-xs text-muted-foreground">
              {totalOverdueDeadlines > 0 && (
                <span className="text-red-600 font-medium">{totalOverdueDeadlines} overdue</span>
              )}
              {totalOverdueDeadlines === 0 && "All on track"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members ({users.length})
          </CardTitle>
          <CardDescription>
            View team member workload statistics and manage assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Daily Load</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Deadlines</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const deadlines = getUpcomingDeadlines(user)
                  const dailyLoad = getDailyWorkload(user)
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'MANAGER' ? 'default' : 'secondary'}>
                          {user.role === 'MANAGER' ? (
                            <Shield className="h-3 w-3 mr-1" />
                          ) : (
                            <User className="h-3 w-3 mr-1" />
                          )}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{user._count.assignedClients}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{dailyLoad}</span>
                          <Badge className={getWorkloadColor(dailyLoad)}>
                            {dailyLoad <= 3 ? 'Light' :
                             dailyLoad <= 6 ? 'Moderate' : 'Heavy'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${
                          user.lastLoginAt && new Date(user.lastLoginAt).getTime() > Date.now() - (24 * 60 * 60 * 1000)
                            ? 'text-green-600' 
                            : user.lastLoginAt 
                              ? 'text-muted-foreground'
                              : 'text-red-500'
                        }`}>
                          {formatLastLogin(user.lastLoginAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(deadlines.overdueAccounts > 0 || deadlines.overdueCS > 0) && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              <span className="text-xs text-red-600 font-medium">
                                {deadlines.overdueAccounts + deadlines.overdueCS} overdue
                              </span>
                            </div>
                          )}
                          {(deadlines.upcomingAccounts > 0 || deadlines.upcomingCS > 0) && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-amber-500" />
                              <span className="text-xs text-amber-600">
                                {deadlines.upcomingAccounts + deadlines.upcomingCS} upcoming
                              </span>
                            </div>
                          )}
                          {deadlines.overdueAccounts === 0 && deadlines.overdueCS === 0 && 
                           deadlines.upcomingAccounts === 0 && deadlines.upcomingCS === 0 && (
                            <span className="text-xs text-green-600">All clear</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                            >
                              {user.isActive ? (
                                <>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            {user.role !== 'MANAGER' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToDelete(user)
                                  setShowDeleteDialog(true)
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {users.map((user) => {
              const deadlines = getUpcomingDeadlines(user)
              const dailyLoad = getDailyWorkload(user)
              
              return (
                <Card key={user.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        {user.role !== 'MANAGER' && (
                          <DropdownMenuItem
                            onClick={() => {
                              setUserToDelete(user)
                              setShowDeleteDialog(true)
                            }}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Role:</span>
                      <Badge variant={user.role === 'MANAGER' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Clients:</span>
                      <span className="font-medium">{user._count.assignedClients}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Daily Load:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{dailyLoad}</span>
                        <Badge className={getWorkloadColor(dailyLoad)}>
                          {dailyLoad <= 3 ? 'Light' :
                           dailyLoad <= 6 ? 'Moderate' : 'Heavy'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Last Login:</span>
                      <span className={`text-xs ${
                        user.lastLoginAt && new Date(user.lastLoginAt).getTime() > Date.now() - (24 * 60 * 60 * 1000)
                          ? 'text-green-600' 
                          : user.lastLoginAt 
                            ? 'text-muted-foreground'
                            : 'text-red-500'
                      }`}>
                        {formatLastLogin(user.lastLoginAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Deadlines:</span>
                      <div className="text-xs">
                        {(() => {
                          const overdue = deadlines.overdueAccounts + deadlines.overdueCS
                          const upcoming = deadlines.upcomingAccounts + deadlines.upcomingCS
                          
                          if (overdue > 0) {
                            return <span className="text-red-600 font-medium">{overdue} overdue</span>
                          }
                          if (upcoming > 0) {
                            return <span className="text-amber-600">{upcoming} upcoming</span>
                          }
                          return <span className="text-green-600">All clear</span>
                        })()}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Team Member Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-md">
          <CreateTeamMemberForm
            onSuccess={() => {
              setShowCreateForm(false)
              refreshUsers()
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong>? 
              This action cannot be undone. All their assigned clients will become unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 