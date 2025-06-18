import { DashboardNavigation } from '@/components/dashboard/navigation'

/**
 * Dashboard layout component
 * 
 * Features:
 * - Sidebar navigation with full height
 * - Responsive design without horizontal scrolling
 * - Consistent layout for all dashboard pages
 * - Proper overflow handling
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <DashboardNavigation />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
} 