'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
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
  CheckCircle,
  Crown,
  Activity,
  Eye
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
  DialogTrigger
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  assignedClients?: Array<{
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
  users: StaffMember[]
}

export function TeamManagement({ users: initialUsers }: TeamManagementProps) {
  const { data: session } = useSession()
  const [users, setUsers] = useState<StaffMember[]>(initialUsers)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUserLog, setShowUserLog] = useState(false)
  const [userToEdit, setUserToEdit] = useState<StaffMember | null>(null)
  const [userToDelete, setUserToDelete] = useState<StaffMember | null>(null)
  const [userForLog, setUserForLog] = useState<StaffMember | null>(null)
  const [userActivities, setUserActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLog, setIsLoadingLog] = useState(false)

  const refreshUsers = async () => {
    try {
      const response = await fetch('/api/users/staff')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error refreshing users:', error)
    }
  }

  const handleEditUser = (user: StaffMember) => {
    setUserToEdit(user)
    setShowEditForm(true)
  }

  const handleViewUserLog = async (user: StaffMember) => {
    setUserForLog(user)
    setShowUserLog(true)
    setIsLoadingLog(true)
    
    try {
      // Fetch real activity logs from API
      const response = await fetch(`/api/users/${user.id}/activity-log`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUserActivities(data.data)
        } else {
          setUserActivities([])
        }
      } else {
        setUserActivities([])
      }
    } catch (error) {
      console.error('Failed to fetch user activity log:', error)
      setUserActivities([])
    } finally {
      setIsLoadingLog(false)
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
        showToast.success('Staff member deleted successfully')
        setUsers(prev => prev.filter(u => u.id !== userToDelete.id))
        setShowDeleteDialog(false)
        setUserToDelete(null)
      } else {
        const data = await response.json()
        showToast.error(data.error || 'Failed to delete staff member')
      }
    } catch (error) {
      showToast.error('Failed to delete staff member')
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
        showToast.success(`Staff member ${!isActive ? 'activated' : 'deactivated'} successfully`)
        setUsers(prev => prev.map(u => 
          u.id === userId ? { ...u, isActive: !isActive } : u
        ))
      } else {
        showToast.error('Failed to update staff member status')
      }
    } catch (error) {
      showToast.error('Failed to update staff member status')
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

  const canDeleteUser = (user: StaffMember) => {
    // PARTNER can delete any account including other PARTNERs
    if (session?.user?.role === 'PARTNER') {
      return true
    }
    
    // MANAGER can delete STAFF accounts only
    if (session?.user?.role === 'MANAGER') {
      return user.role === 'STAFF'
    }
    
    // STAFF cannot delete any accounts
    return false
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          {/* Header */}
          <div className="page-header">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Team Management</h1>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Manage team members and view their assignments
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
                <div className="overflow-auto">
                  <table className="table-fixed-layout">
                    <thead>
                      <tr className="table-header-row">
                        <th className="table-header-cell col-member">
                          Member
                        </th>
                        <th className="table-header-cell col-role">
                          Role
                        </th>
                        <th className="table-header-cell col-status">
                          Status
                        </th>
                        <th className="table-header-cell col-clients">
                          Clients
                        </th>
                        <th className="table-header-cell col-last-login">
                          Last Login
                        </th>
                        <th className="table-header-cell col-actions text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        return (
                          <tr key={user.id} className="table-body-row">
                            <td className="table-body-cell">
                              <div>
                                <p className="font-medium text-sm">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                              </div>
                            </td>
                            <td className="table-body-cell">
                              <Badge 
                                variant={user.role === 'PARTNER' ? 'default' : 'secondary'}
                                className={
                                  user.role === 'PARTNER' 
                                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                    : user.role === 'MANAGER' 
                                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                      : 'bg-gray-600 text-white hover:bg-gray-700'
                                }
                              >
                                {user.role === 'PARTNER' ? (
                                  <Crown className="h-3 w-3 mr-1.5" />
                                ) : user.role === 'MANAGER' ? (
                                  <Shield className="h-3 w-3 mr-1.5" />
                                ) : (
                                  <User className="h-3 w-3 mr-1.5" />
                                )}
                                {user.role}
                              </Badge>
                            </td>
                            <td className="table-body-cell">
                              <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="table-body-cell">
                              <span className="font-medium text-sm">{user._count.assignedClients}</span>
                            </td>
                            <td className="table-body-cell">
                              <span className={`text-xs ${
                                user.lastLoginAt && new Date(user.lastLoginAt).getTime() > Date.now() - (24 * 60 * 60 * 1000)
                                  ? 'text-green-600' 
                                  : user.lastLoginAt 
                                    ? 'text-muted-foreground'
                                    : 'text-red-500'
                              }`}>
                                {formatLastLogin(user.lastLoginAt)}
                              </span>
                            </td>
                            <td className="table-actions-cell">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="action-trigger-button">
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
                                  <DropdownMenuItem 
                                    onClick={() => handleViewUserLog(user)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Activity className="h-4 w-4" />
                                    View Log
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
                                    disabled={
                                      !canDeleteUser(user)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                    {user.role === 'PARTNER' ? (
                                      <Crown className="h-3 w-3 ml-1" />
                                    ) : user.role === 'MANAGER' && user._count.assignedClients > 0 && (
                                      <AlertTriangle className="h-3 w-3 ml-1" />
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {users.map((user) => {
                  return (
                    <Card key={user.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{user.name}</h3>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-1 hover:bg-muted/50 flex items-center justify-center">
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
                          <DropdownMenuItem 
                            onClick={() => handleViewUserLog(user)}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Activity className="h-4 w-4" />
                            View Log
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
                            disabled={
                              !canDeleteUser(user)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                            {user.role === 'PARTNER' ? (
                              <Crown className="h-3 w-3 ml-1" />
                            ) : user.role === 'MANAGER' && user._count.assignedClients > 0 && (
                              <AlertTriangle className="h-3 w-3 ml-1" />
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Role:</span>
                        <Badge 
                          variant={user.role === 'PARTNER' ? 'default' : 'secondary'}
                          className={
                            user.role === 'PARTNER' 
                              ? 'bg-purple-600 text-white hover:bg-purple-700' 
                              : user.role === 'MANAGER' 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-gray-600 text-white hover:bg-gray-700'
                          }
                        >
                          {user.role === 'PARTNER' ? (
                            <Crown className="h-3 w-3 mr-1.5" />
                          ) : user.role === 'MANAGER' ? (
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
                  
                  {userToDelete?.role === 'PARTNER' ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                      <div className="flex items-center gap-2 text-red-800 mb-2">
                        <Crown className="h-4 w-4" />
                        <span className="font-medium">Cannot Delete Partner</span>
                      </div>
                      <p className="text-sm text-red-700">
                        Partner accounts cannot be deleted as they have the highest system privileges. 
                        Please contact system administrator if you need to remove this account.
                      </p>
                    </div>
                  ) : userToDelete?.role === 'MANAGER' && userToDelete._count.assignedClients > 0 ? (
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
                  disabled={
                    isLoading || 
                    (userToDelete?.role === 'PARTNER') ||
                    (userToDelete?.role === 'MANAGER' && userToDelete._count.assignedClients > 0)
                  }
                >
                  {isLoading ? 'Deleting...' : 'Delete Member'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* User Activity Log Dialog */}
          <Dialog open={showUserLog} onOpenChange={setShowUserLog}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Activity Log - {userForLog?.name}
                </DialogTitle>
                <DialogDescription>
                  Complete activity history for {userForLog?.email}
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto max-h-96">
                {isLoadingLog ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-primary"></div>
                      Loading activity log...
                    </div>
                  </div>
                ) : userActivities.length > 0 ? (
                  <div className="space-y-3">
                    {userActivities.map((activity) => (
                      <div key={activity.id} className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              activity.resource === 'Client' ? 'bg-blue-500' :
                              activity.resource === 'Document' ? 'bg-green-500' :
                              activity.resource === 'Assignment' ? 'bg-purple-500' :
                              activity.resource === 'System' ? 'bg-gray-500' :
                              'bg-orange-500'
                            }`} />
                            <span className="font-medium text-sm">{activity.action}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {activity.resource}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            <strong>{activity.resourceName}</strong>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.details}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(activity.timestamp).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No activity found for this user</p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUserLog(false)
                    setUserForLog(null)
                    setUserActivities([])
                  }}
                >
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
} 