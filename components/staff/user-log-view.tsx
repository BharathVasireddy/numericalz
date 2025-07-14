'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  User,
  Clock,
  FileText,
  Building2,
  Receipt,
  Users,
  Calendar,
  Eye,
  Settings,
  Activity
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ActivityLog {
  id: string
  action: string
  details: string | null
  timestamp: Date
  client: {
    id: string
    clientCode: string
    companyName: string
  } | null
}

interface LogData {
  user: {
    id: string
    name: string
    email: string
    role: string
    joinedDate: Date
  }
  activities: ActivityLog[]
}

interface UserLogViewProps {
  logData: LogData
}

export function UserLogView({ logData }: UserLogViewProps) {
  const router = useRouter()

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getActionIcon = (action: string) => {
    if (action.includes('CLIENT')) {
      return <Building2 className="h-4 w-4" />
    }
    if (action.includes('VAT')) {
      return <Receipt className="h-4 w-4" />
    }
    if (action.includes('ACCOUNTS') || action.includes('LTD') || action.includes('NON_LTD')) {
      return <FileText className="h-4 w-4" />
    }
    if (action.includes('USER')) {
      return <User className="h-4 w-4" />
    }
    return <Activity className="h-4 w-4" />
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) {
      return 'bg-green-100 text-green-800'
    }
    if (action.includes('UPDATE') || action.includes('MODIFY')) {
      return 'bg-blue-100 text-blue-800'
    }
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'bg-red-100 text-red-800'
    }
    if (action.includes('ASSIGN')) {
      return 'bg-purple-100 text-purple-800'
    }
    if (action.includes('COMPLETE') || action.includes('FINISH')) {
      return 'bg-emerald-100 text-emerald-800'
    }
    return 'bg-gray-100 text-gray-800'
  }

  const getEntityName = (activity: ActivityLog) => {
    if (activity.client) {
      return `${activity.client.companyName} (${activity.client.clientCode})`
    }
    return 'System Activity'
  }

  const getEntityTypeLabel = (action: string) => {
    if (action.includes('CLIENT')) {
      return 'Client'
    }
    if (action.includes('VAT')) {
      return 'VAT'
    }
    if (action.includes('ACCOUNTS') || action.includes('LTD') || action.includes('NON_LTD')) {
      return 'Accounts'
    }
    if (action.includes('USER')) {
      return 'User'
    }
    return 'System'
  }

  const handleViewEntity = (activity: ActivityLog) => {
    if (activity.client) {
      router.push(`/dashboard/clients/${activity.client.id}`)
    }
  }

  const groupActivitiesByDate = (activities: ActivityLog[]) => {
    const groups: Record<string, ActivityLog[]> = {}
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(activity)
    })
    
    return Object.entries(groups).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    )
  }

  const groupedActivities = groupActivitiesByDate(logData.activities)

  return (
    <div className="space-y-6">
      {/* User Summary Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {logData.user.role === 'PARTNER' && <User className="h-6 w-6 text-purple-600" />}
                {logData.user.role === 'MANAGER' && <User className="h-6 w-6 text-blue-600" />}
                {logData.user.role === 'STAFF' && <User className="h-6 w-6 text-gray-600" />}
                <div>
                  <h2 className="text-xl font-bold">{logData.user.name}</h2>
                  <p className="text-sm text-muted-foreground">{logData.user.email}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {logData.activities.length}
              </div>
              <p className="text-sm text-muted-foreground">Total Activities</p>
              <p className="text-xs text-muted-foreground">
                Joined {new Date(logData.user.joinedDate).toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logData.activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No activity recorded yet</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedActivities.map(([date, activities]) => (
                <div key={date} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">{date}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {activities.map((activity, index) => (
                      <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                        {/* Timeline dot */}
                        <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full mt-2"></div>
                        
                        {/* Activity content */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                                                       <div className="flex items-center gap-2">
                             <div className="text-muted-foreground">
                               {getActionIcon(activity.action)}
                             </div>
                             <Badge variant="outline" className={`text-xs ${getActionColor(activity.action)}`}>
                               {activity.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                             </Badge>
                             <Badge variant="secondary" className="text-xs">
                               {getEntityTypeLabel(activity.action)}
                             </Badge>
                           </div>
                           <div className="flex items-center gap-2 text-sm text-muted-foreground">
                             <Clock className="h-3 w-3" />
                             {formatDate(activity.timestamp)}
                           </div>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="font-medium">
                              {getEntityName(activity)}
                            </p>
                            {activity.details && (
                              <p className="text-sm text-muted-foreground">
                                {activity.details}
                              </p>
                            )}
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewEntity(activity)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 