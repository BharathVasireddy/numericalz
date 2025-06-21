'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Clock, 
  User, 
  Building, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
  Settings,
  Users,
  Shield,
  Mail,
  Calendar,
  Activity,
  Eye,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut
} from 'lucide-react'
import { showToast } from '@/lib/toast'

interface ActivityLogEntry {
  id: string
  action: string
  timestamp: string
  userId?: string
  clientId?: string
  details?: string
  user?: {
    id: string
    name: string
    email: string
    role: string
  }
  client?: {
    id: string
    companyName: string
    clientCode: string
  }
}

interface ActivityLogViewerProps {
  userId?: string
  clientId?: string
  showFilters?: boolean
  showExport?: boolean
  limit?: number
  title?: string
}

export function ActivityLogViewer({
  userId,
  clientId,
  showFilters = true,
  showExport = true,
  limit = 100,
  title = 'Activity Log'
}: ActivityLogViewerProps) {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [filteredActivities, setFilteredActivities] = useState<ActivityLogEntry[]>([])

  // Fetch activity logs
  const fetchActivityLogs = async () => {
    try {
      setLoading(true)
      let url = '/api/activity-logs'
      
      if (userId) {
        url = `/api/users/${userId}/activity-log`
      } else if (clientId) {
        url = `/api/clients/${clientId}/activity-log`
      }

      const response = await fetch(`${url}?limit=${limit}`)
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs')
      }

      const data = await response.json()
      setActivities(data.activities || [])
    } catch (error) {
      console.error('Error fetching activity logs:', error)
      showToast.error('Failed to load activity logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivityLogs()
  }, [userId, clientId, limit])

  // Filter activities based on search and filters
  useEffect(() => {
    let filtered = activities

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(activity => 
        activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.client?.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (activity.details && activity.details.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(activity => 
        activity.action.includes(actionFilter.toUpperCase())
      )
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      let cutoffDate = new Date()

      switch (dateFilter) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          cutoffDate.setDate(now.getDate() - 7)
          break
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1)
          break
      }

      filtered = filtered.filter(activity => 
        new Date(activity.timestamp) >= cutoffDate
      )
    }

    setFilteredActivities(filtered)
  }, [activities, searchTerm, actionFilter, dateFilter])

  // Get activity icon
  const getActivityIcon = (action: string) => {
    if (action.includes('LOGIN')) return <LogIn className="h-4 w-4" />
    if (action.includes('LOGOUT')) return <LogOut className="h-4 w-4" />
    if (action.includes('CREATED')) return <Plus className="h-4 w-4" />
    if (action.includes('UPDATED')) return <Edit className="h-4 w-4" />
    if (action.includes('DELETED')) return <Trash2 className="h-4 w-4" />
    if (action.includes('VIEWED')) return <Eye className="h-4 w-4" />
    if (action.includes('CLIENT')) return <Building className="h-4 w-4" />
    if (action.includes('USER')) return <User className="h-4 w-4" />
    if (action.includes('WORKFLOW')) return <Activity className="h-4 w-4" />
    if (action.includes('EMAIL')) return <Mail className="h-4 w-4" />
    if (action.includes('FILED')) return <CheckCircle className="h-4 w-4" />
    if (action.includes('ASSIGNED')) return <Users className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  // Get activity color
  const getActivityColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-green-100 text-green-800'
    if (action.includes('UPDATED')) return 'bg-blue-100 text-blue-800'
    if (action.includes('DELETED')) return 'bg-red-100 text-red-800'
    if (action.includes('FILED')) return 'bg-emerald-100 text-emerald-800'
    if (action.includes('LOGIN')) return 'bg-purple-100 text-purple-800'
    if (action.includes('LOGOUT')) return 'bg-gray-100 text-gray-800'
    if (action.includes('ASSIGNED')) return 'bg-yellow-100 text-yellow-800'
    return 'bg-blue-100 text-blue-800'
  }

  // Format activity details
  const formatActivityDetails = (activity: ActivityLogEntry) => {
    try {
      if (activity.details) {
        const details = JSON.parse(activity.details)
        return {
          companyName: details.companyName || activity.client?.companyName,
          comments: details.comments,
          oldStage: details.oldStage,
          newStage: details.newStage,
          assigneeName: details.assigneeName,
          changedFields: details.changedFields,
          ...details
        }
      }
    } catch (error) {
      return {}
    }
    return {}
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Export activity logs
  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Action', 'User', 'Client', 'Details'].join(','),
      ...filteredActivities.map(activity => [
        formatTimestamp(activity.timestamp),
        activity.action,
        activity.user?.name || 'System',
        activity.client?.companyName || '-',
        activity.details ? JSON.stringify(activity.details).replace(/,/g, ';') : '-'
      ].join(','))
    ].join('\\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchActivityLogs}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {showExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={filteredActivities.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <div className="flex items-center gap-2 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="workflow">Workflow</SelectItem>
                <SelectItem value="login">Authentication</SelectItem>
                <SelectItem value="filed">Filing</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading activity logs...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No activity logs found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Showing {filteredActivities.length} of {activities.length} activities
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => {
                  const details = formatActivityDetails(activity)
                  
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="text-sm">
                        {formatTimestamp(activity.timestamp)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getActivityColor(activity.action)}>
                            <div className="flex items-center gap-1">
                              {getActivityIcon(activity.action)}
                              <span className="text-xs">
                                {activity.action.replace(/_/g, ' ').toLowerCase()}
                              </span>
                            </div>
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{activity.user?.name || 'System'}</div>
                          {activity.user?.role && (
                            <div className="text-xs text-muted-foreground">
                              {activity.user.role}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {activity.client ? (
                          <div className="text-sm">
                            <div className="font-medium">{activity.client.companyName}</div>
                            <div className="text-xs text-muted-foreground">
                              {activity.client.clientCode}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      
                      <TableCell className="max-w-[300px]">
                        <div className="text-sm space-y-1">
                          {details.oldStage && details.newStage && (
                            <div className="text-xs">
                              Stage: {details.oldStage} → {details.newStage}
                            </div>
                          )}
                          {details.assigneeName && (
                            <div className="text-xs">
                              Assigned to: {details.assigneeName}
                            </div>
                          )}
                          {details.comments && (
                            <div className="text-xs text-muted-foreground truncate">
                              {details.comments}
                            </div>
                          )}
                          {details.changedFields && details.changedFields.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Changed: {details.changedFields.join(', ')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}