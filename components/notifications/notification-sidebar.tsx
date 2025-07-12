'use client'

import { useState, useEffect } from 'react'
import { X, Check, CheckCheck, Clock, User, Building, FileText, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  category: 'VAT' | 'ACCOUNTS' | 'REMINDERS'
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
  }
  client?: {
    id: string
    clientCode: string
    companyName: string
  }
}

interface NotificationSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationSidebar({ isOpen, onClose }: NotificationSidebarProps) {
  const [activeTab, setActiveTab] = useState('ALL')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, activeTab])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const category = activeTab === 'ALL' ? '' : activeTab
      const response = await fetch(`/api/in-app-notifications?category=${category}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.data.notifications || [])
        setUnreadCount(data.data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/in-app-notifications/${notificationId}/read`, {
        method: 'PUT',
      })
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        // Update the notification icon count
        ;(window as any).updateNotificationCount?.(Math.max(0, unreadCount - 1))
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const category = activeTab === 'ALL' ? '' : activeTab
      const response = await fetch(`/api/in-app-notifications/mark-all-read?category=${category}`, {
        method: 'PUT',
      })
      if (response.ok) {
        const data = await response.json()
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true }))
        )
        setUnreadCount(data.data.unreadCount || 0)
        // Update the notification icon count
        ;(window as any).updateNotificationCount?.(data.data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'VAT':
        return <FileText className="h-4 w-4" />
      case 'ACCOUNTS':
        return <Building className="h-4 w-4" />
      case 'REMINDERS':
        return <Clock className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'VAT':
        return 'bg-blue-500'
      case 'ACCOUNTS':
        return 'bg-green-500'
      case 'REMINDERS':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 bg-black/50 lg:hidden z-40"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 h-full w-full bg-background shadow-xl border-l z-50 lg:w-96 lg:left-72">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Notifications</h2>
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-2 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="p-4 border-b">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={activeTab === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('ALL')}
                >
                  All
                </Button>
                <Button
                  variant={activeTab === 'VAT' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('VAT')}
                >
                  VAT
                </Button>
                <Button
                  variant={activeTab === 'ACCOUNTS' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('ACCOUNTS')}
                >
                  Accounts
                </Button>
                <Button
                  variant={activeTab === 'REMINDERS' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('REMINDERS')}
                >
                  Reminders
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(100vh-180px)]">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-3 rounded-lg border transition-colors cursor-pointer",
                          notification.isRead 
                            ? "bg-muted/50 border-muted" 
                            : "bg-background border-border shadow-sm"
                        )}
                        onClick={() => !notification.isRead && markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Category Icon */}
                          <div className={cn(
                            "rounded-full p-2 text-white",
                            getCategoryColor(notification.category)
                          )}>
                            {getCategoryIcon(notification.category)}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={cn(
                                "text-sm font-medium truncate",
                                notification.isRead && "text-muted-foreground"
                              )}>
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                              )}
                            </div>
                            
                            <p className={cn(
                              "text-xs text-muted-foreground mb-2 line-clamp-2",
                              notification.isRead && "opacity-70"
                            )}>
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {notification.client && (
                                  <Badge variant="outline" className="text-xs">
                                    {notification.client.clientCode}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  {notification.category}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Mark as read button */}
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsRead(notification.id)
                              }}
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </>
      )}
    </>
  )
} 