'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'

interface NotificationIconProps {
  onClick: () => void
  className?: string
  isOpen?: boolean
}

export function NotificationIcon({ onClick, className }: NotificationIconProps) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/in-app-notifications?limit=1&isRead=false')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  // Expose function to update count from parent
  ;(NotificationIcon as any).updateUnreadCount = setUnreadCount

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`
        relative h-10 w-10 p-0 
        hover:bg-primary/10 hover:text-primary 
        transition-all duration-200 
        border border-transparent hover:border-primary/20
        ${unreadCount > 0 ? 'text-primary animate-pulse' : ''}
        ${className}
      `}
      title="Notifications"
    >
      <Bell className={`${unreadCount > 0 ? 'h-5 w-5' : 'h-4 w-4'} transition-all duration-200`} />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center min-w-[20px] animate-bounce"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  )
} 