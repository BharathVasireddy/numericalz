'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText,
  User,
  Calendar,
  Mail,
  DollarSign
} from 'lucide-react'

interface Notification {
  id: string
  type: 'deadline' | 'review' | 'assignment' | 'completion' | 'overdue' | 'system' | 'financial'
  title: string
  message: string
  clientName?: string
  clientCode?: string
  priority: 'high' | 'medium' | 'low'
  read: boolean
  createdAt: Date | string
  actionUrl?: string
}

interface NotificationWidgetProps {
  notifications: Notification[]
  title?: string
  showMarkAllRead?: boolean
  onMarkAsRead?: (id: string) => void
  onMarkAllRead?: () => void
}

export function NotificationWidget({ 
  notifications, 
  title = "Recent Notifications",
  showMarkAllRead = true,
  onMarkAsRead,
  onMarkAllRead
}: NotificationWidgetProps) {
  const router = useRouter()

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'deadline':
        return <Calendar className="h-4 w-4 text-orange-500" />
      case 'review':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'assignment':
        return <User className="h-4 w-4 text-green-500" />
      case 'completion':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'system':
        return <Bell className="h-4 w-4 text-gray-500" />
      case 'financial':
        return <DollarSign className="h-4 w-4 text-green-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date()
    const dateObj = new Date(date)
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return dateObj.toLocaleDateString()
  }

  const handleNotificationClick = (notification: Notification) => {
    if (onMarkAsRead && !notification.read) {
      onMarkAsRead(notification.id)
    }
    
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const handleViewAllNotifications = () => {
    router.push('/dashboard/notifications')
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {showMarkAllRead && unreadCount > 0 && onMarkAllRead && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onMarkAllRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.slice(0, 8).map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    notification.read 
                      ? 'hover:bg-accent/50' 
                      : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`font-medium text-sm truncate ${
                          !notification.read ? 'text-blue-900' : ''
                        }`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-xs ${getPriorityColor(notification.priority)}`}>
                            {notification.priority}
                          </Badge>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {notification.clientName && (
                          <span className="truncate">
                            {notification.clientName} ({notification.clientCode})
                          </span>
                        )}
                        <span className="flex-shrink-0">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {notifications.length > 8 && (
              <div className="mt-4 pt-3 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleViewAllNotifications}
                >
                  View all {notifications.length} notifications
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 