'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageContent } from '@/components/layout/page-layout'
import { PendingToChaseWidget } from './widgets/pending-to-chase-widget'
import { VATUnassignedWidget } from './widgets/vat-unassigned-widget'
import { ReviewWidget } from './widgets/review-widget'
import { UpcomingDeadlinesWidget } from './widgets/upcoming-deadlines-widget'
import { UnassignedClientsWidget } from './widgets/unassigned-clients-widget'
import { ClientOverviewWidget } from './widgets/client-overview-widget'
import { MonthlyDeadlinesWidget } from './widgets/monthly-deadlines-widget'
import { TeamWorkloadWidget } from './widgets/team-workload-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { 
  Crown,
  Shield,
  User,
  Users,
  Receipt,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface ManagerDashboardProps {
  userId: string
}

export function ManagerDashboard({ userId }: ManagerDashboardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Enhanced navigation handlers for unassigned clients
  const handleUnassignedNavigation = (type: 'ltd' | 'nonLtd' | 'vat') => {
    switch (type) {
      case 'ltd':
        router.push('/dashboard/clients/ltd-companies?filter=unassigned')
        break
      case 'nonLtd':
        router.push('/dashboard/clients/non-ltd-companies?filter=unassigned')
        break
      case 'vat':
        router.push('/dashboard/clients/vat-dt?filter=unassigned&tab=all')
        break
    }
  }

  useEffect(() => {
    // Simulate loading for consistency
    const timer = setTimeout(() => {
      setLoading(false)
      setLastUpdated(new Date().toLocaleTimeString())
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Team management and workflow oversight
            </p>
          </div>
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-lg bg-muted h-32" />
              ))}
            </div>
            <div className="rounded-lg bg-muted h-48" />
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout maxWidth="2xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Team management and workflow oversight
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdated}
          </div>
        </div>

        {/* Row 1: Review Widget (Top Priority) */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <ReviewWidget userRole="MANAGER" />
          </Card>
        </div>

        {/* Row 2: Client Overview, Monthly Deadlines, Unassigned Clients */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <ClientOverviewWidget />
          </Card>
          <Card>
            <MonthlyDeadlinesWidget />
          </Card>
          <Card>
            <UnassignedClientsWidget onNavigate={handleUnassignedNavigation} />
          </Card>
        </div>

        {/* Row 3: VAT Unassigned, Pending to Chase, Upcoming Deadlines */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <VATUnassignedWidget compact={true} />
          </Card>
          <Card>
            <PendingToChaseWidget userRole="MANAGER" userId={userId} />
          </Card>
          <Card>
            <UpcomingDeadlinesWidget />
          </Card>
        </div>

        {/* Row 4: Team Workload (Single Column) */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <TeamWorkloadWidget />
          </Card>
        </div>
      </div>
    </PageLayout>
  )
} 