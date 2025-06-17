'use client'

import { useState } from 'react'
import { showToast } from '@/lib/toast'
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Settings,
  Building2,
  Calendar,
  AlertTriangle,
  Shield,
  User,
  Clock,
  FileText,
  CheckCircle
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
  DropdownMenuSeparator,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { CreateTeamMemberForm } from './create-team-member-form'
import { EditTeamMemberForm } from './edit-team-member-form'

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
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToEdit, setUserToEdit] = useState<TeamMember | null>(null)
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

  const handleEditUser = (user: TeamMember) => {
    setUserToEdit(user)
    setShowEditForm(true)
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
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    let overdueAccounts = 0
    let overdueCS = 0
    let upcomingAccounts = 0
    let upcomingCS = 0

    user.assignedClients.forEach(client => {
      if (client.nextAccountsDue) {
        const accountsDue = new Date(client.nextAccountsDue)
        if (accountsDue < now) {
          overdueAccounts++
        } else if (accountsDue <= sevenDaysFromNow) {
          upcomingAccounts++
        }
      }

      if (client.nextConfirmationDue) {
        const confirmationDue = new Date(client.nextConfirmationDue)
        if (confirmationDue < now) {
          overdueCS++
        } else if (confirmationDue <= sevenDaysFromNow) {
          upcomingCS++
        }
      }
    })

    return { overdueAccounts, overdueCS, upcomingAccounts, upcomingCS }
  }

  const getClientsDueThisMonth = (user: TeamMember) => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const accountsDueThisMonth: Array<{ name: string; dueDate: Date; type: 'accounts' }> = []
    const confirmationsDueThisMonth: Array<{ name: string; dueDate: Date; type: 'confirmation' }> = []

    user.assignedClients.forEach(client => {
      if (client.nextAccountsDue) {
        const accountsDue = new Date(client.nextAccountsDue)
        if (accountsDue.getMonth() === currentMonth && accountsDue.getFullYear() === currentYear) {
          accountsDueThisMonth.push({
            name: client.companyName,
            dueDate: accountsDue,
            type: 'accounts'
          })
        }
      }

      if (client.nextConfirmationDue) {
        const confirmationDue = new Date(client.nextConfirmationDue)
        if (confirmationDue.getMonth() === currentMonth && confirmationDue.getFullYear() === currentYear) {
          confirmationsDueThisMonth.push({
            name: client.companyName,
            dueDate: confirmationDue,
            type: 'confirmation'
          })
        }
      }
    })

    // Sort by due date
    const allDueThisMonth = [...accountsDueThisMonth, ...confirmationsDueThisMonth]
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

    return {
      accountsDueThisMonth,
      confirmationsDueThisMonth,
      allDueThisMonth,
      totalCount: allDueThisMonth.length
    }
  }

  const getDailyWorkload = (user: TeamMember) => {
    const clientCount = user._count.assignedClients
    if (clientCount === 0) return 'No clients'
    if (clientCount <= 5) return 'Light'
    if (clientCount <= 10) return 'Moderate'
    return 'Heavy'
  }

  const getWorkloadColor = (clientCount: number) => {
    if (clientCount === 0) return 'bg-gray-100 text-gray-800'
    if (clientCount <= 5) return 'bg-green-100 text-green-800'
    if (clientCount <= 10) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const activeUsers = users.filter(u => u.isActive)
  const inactiveUsers = users.filter(u => !u.isActive)
  const totalClients = users.reduce((sum, user) => sum + user._count.assignedClients, 0)

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
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
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
            <CardTitle className="text-sm font-medium">Avg. Workload</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeUsers.length > 0 ? Math.round(totalClients / activeUsers.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Clients per active member
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            Manage team member details, roles, and client assignments
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
                  <TableHead>Due This Month</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Deadlines</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const deadlines = getUpcomingDeadlines(user)
                  const dailyLoad = getDailyWorkload(user)
                  const dueThisMonth = getClientsDueThisMonth(user)
                  
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
                            <Shield className="h-3 w-3 mr-1.5" />
                          ) : (
                            <User className="h-3 w-3 mr-1.5" />
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
                        <Badge className={getWorkloadColor(user._count.assignedClients)}>
                          {dailyLoad}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          {dueThisMonth.totalCount > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 cursor-help">
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {dueThisMonth.totalCount}
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-2">
                                  <p className="font-semibold text-sm">Due This Month:</p>
                                  {dueThisMonth.allDueThisMonth.slice(0, 5).map((item, index) => (
                                    <div key={index} className="flex items-center justify-between text-xs">
                                      <span className="truncate max-w-32">{item.name}</span>
                                      <div className="flex items-center gap-1 ml-2">
                                        {item.type === 'accounts' ? (
                                          <FileText className="h-3 w-3 text-blue-500" />
                                        ) : (
                                          <CheckCircle className="h-3 w-3 text-green-500" />
                                        )}
                                        <span className="text-muted-foreground">
                                          {item.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {dueThisMonth.allDueThisMonth.length > 5 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{dueThisMonth.allDueThisMonth.length - 5} more...
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-600">
                              None
                            </Badge>
                          )}
                        </TooltipProvider>
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
                        <div className="flex items-center gap-1">
                          {(() => {
                            const overdue = deadlines.overdueAccounts + deadlines.overdueCS
                            const upcoming = deadlines.upcomingAccounts + deadlines.upcomingCS
                            
                            if (overdue > 0) {
                              return (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {overdue} overdue
                                </Badge>
                              )
                            }
                            if (upcoming > 0) {
                              return (
                                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {upcoming} upcoming
                                </Badge>
                              )
                            }
                            return (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                All clear
                              </Badge>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-muted/50">
                              <Settings className="action-trigger-icon" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => handleEditUser(user)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Edit className="h-4 w-4" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              {user.isActive ? (
                                <>
                                  <Trash2 className="h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setUserToDelete(user)
                          setShowDeleteDialog(true)
                        }}
                        className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                        disabled={user.role === 'MANAGER' && user._count.assignedClients > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                        {user.role === 'MANAGER' && user._count.assignedClients > 0 && (
                          <AlertTriangle className="h-3 w-3 ml-1" />
                        )}
                      </DropdownMenuItem>
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
              const dueThisMonth = getClientsDueThisMonth(user)
              
              return (
                <Card key={user.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-muted/50">
                        <Settings className="action-trigger-icon" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={() => handleEditUser(user)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        {user.isActive ? (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setUserToDelete(user)
                          setShowDeleteDialog(true)
                        }}
                        className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                        disabled={user.role === 'MANAGER' && user._count.assignedClients > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                        {user.role === 'MANAGER' && user._count.assignedClients > 0 && (
                          <AlertTriangle className="h-3 w-3 ml-1" />
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Role:</span>
                    <Badge variant={user.role === 'MANAGER' ? 'default' : 'secondary'}>
                      {user.role === 'MANAGER' ? (
                        <Shield className="h-3 w-3 mr-1.5" />
                      ) : (
                        <User className="h-3 w-3 mr-1.5" />
                      )}
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
                    <span className="text-xs text-muted-foreground">Workload:</span>
                    <Badge className={getWorkloadColor(user._count.assignedClients)}>
                      {getDailyWorkload(user)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Due This Month:</span>
                    <TooltipProvider>
                      {dueThisMonth.totalCount > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-help">
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                <Clock className="h-3 w-3 mr-1" />
                                {dueThisMonth.totalCount}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2">
                              <p className="font-semibold text-sm">Due This Month:</p>
                              {dueThisMonth.allDueThisMonth.slice(0, 3).map((item, index) => (
                                <div key={index} className="flex items-center justify-between text-xs">
                                  <span className="truncate max-w-24">{item.name}</span>
                                  <div className="flex items-center gap-1 ml-2">
                                    {item.type === 'accounts' ? (
                                      <FileText className="h-3 w-3 text-blue-500" />
                                    ) : (
                                      <CheckCircle className="h-3 w-3 text-green-500" />
                                    )}
                                    <span className="text-muted-foreground">
                                      {item.dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {dueThisMonth.allDueThisMonth.length > 3 && (
                                <p className="text-xs text-muted-foreground">
                                  +{dueThisMonth.allDueThisMonth.length - 3} more...
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-600">
                          None
                        </Badge>
                      )}
                    </TooltipProvider>
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
                        const deadlines = getUpcomingDeadlines(user)
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

      {/* Edit Team Member Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-md">
          {userToEdit && (
            <EditTeamMemberForm
              user={userToEdit}
              onSuccess={() => {
                setShowEditForm(false)
                setUserToEdit(null)
                refreshUsers()
              }}
              onCancel={() => {
                setShowEditForm(false)
                setUserToEdit(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Team Member
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <div>
                Are you sure you want to delete <strong>{userToDelete?.name}</strong>? 
                This action cannot be undone.
              </div>
              
              {userToDelete?.role === 'MANAGER' && userToDelete._count.assignedClients > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                  <div className="flex items-center gap-2 text-amber-800 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Cannot Delete Manager</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    This manager has <strong>{userToDelete._count.assignedClients} assigned client(s)</strong>. 
                    Please reassign all clients to another staff member or manager before deletion.
                  </p>
                </div>
              ) : userToDelete?.role === 'MANAGER' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                  <div className="flex items-center gap-2 text-red-800 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Deleting Manager Account</span>
                  </div>
                  <p className="text-sm text-red-700">
                    You are about to delete a manager account. This will remove all their permissions and access to the system.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground mt-2">
                  {userToDelete?._count.assignedClients && userToDelete._count.assignedClients > 0 
                    ? `All ${userToDelete._count.assignedClients} assigned clients will become unassigned.`
                    : 'This user has no assigned clients.'
                  }
                </div>
              )}
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
              disabled={isLoading || (userToDelete?.role === 'MANAGER' && userToDelete._count.assignedClients > 0)}
            >
              {isLoading ? 'Deleting...' : 'Delete Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 