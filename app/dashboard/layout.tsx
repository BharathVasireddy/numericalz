import { DashboardNavigation } from '@/components/dashboard/navigation'

/**
 * Dashboard layout component
 * 
 * Features:
 * - Sidebar navigation
 * - Responsive design
 * - Consistent layout for all dashboard pages
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex">
      <DashboardNavigation />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
} 