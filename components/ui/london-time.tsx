'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

/**
 * London Time Component
 * 
 * Features:
 * - Shows current London time (Europe/London timezone)
 * - Updates every second
 * - Compact display suitable for top-right corner
 * - Handles BST/GMT transitions automatically
 * - Responsive design
 */
export function LondonTime() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    // Set initial time
    setTime(new Date())

    // Update time every second
    const interval = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Don't render anything on server-side to avoid hydration mismatch
  if (!time) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="font-mono">--:--:--</span>
      </div>
    )
  }

  // Format time in London timezone
  const londonTime = time.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const londonDate = time.toLocaleDateString('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })

  // Check if it's BST or GMT
  const timeZoneOffset = time.toLocaleString('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'short'
  }).split(' ').pop()

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4 flex-shrink-0" />
      <div className="flex flex-col leading-tight">
        <span className="font-mono font-medium text-foreground">{londonTime}</span>
        <span className="text-xs">{londonDate} {timeZoneOffset}</span>
      </div>
    </div>
  )
} 