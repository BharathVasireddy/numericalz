'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DashboardNavigation } from '@/components/dashboard/navigation'
import { LondonTime } from '@/components/ui/london-time'
import { Loader2 } from 'lucide-react'

/**
 * Dashboard layout component with authentication guards
 * 
 * Features:
 * - Authentication verification before rendering
 * - Prevents layout shifts by showing loading state
 * - Sidebar navigation with full height
 * - London time display in top-right corner
 * - Responsive design without horizontal scrolling
 * - Consistent layout for all dashboard pages
 * - Proper overflow handling
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
  }, [session, status, router])

  // Show loading spinner while checking authentication
  if (status === 'loading') {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (middleware should handle this, but just in case)
  if (status === 'unauthenticated') {
    return null
  }

  // Render dashboard layout for authenticated users
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <DashboardNavigation />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with London time */}
        <div className="flex-shrink-0 flex justify-end items-center p-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <LondonTime />
        </div>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
} 