'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Inter } from 'next/font/google'
import { DashboardNavigation } from '@/components/dashboard/navigation'
import { Toaster } from '@/components/ui/toaster'
import { SimpleToaster } from '@/components/ui/simple-toaster'
import { LondonTime } from '@/components/ui/london-time'
import { Loader2 } from 'lucide-react'

/**
 * Dashboard layout component with authentication guards
 * 
 * Features:
 * - Authentication verification before rendering
 * - Prevents layout shifts by showing loading state
 * - Mobile-first responsive design with mobile header
 * - Sidebar navigation with full height on desktop
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
    <div className="min-h-screen bg-background">
      {/* Mobile and Desktop Layout */}
      <div className="lg:flex">
        <DashboardNavigation />
        
        <div className="flex-1 lg:ml-72">
          <main>
            {children}
          </main>
        </div>
      </div>
      
      <Toaster />
      <SimpleToaster />
    </div>
  )
} 