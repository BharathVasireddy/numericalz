'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageContent } from '@/components/layout/page-layout'
import { PendingToChaseWidget } from './widgets/pending-to-chase-widget'
import { VATUnassignedWidget } from './widgets/vat-unassigned-widget'
import { ReviewWidget } from './widgets/review-widget'
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

interface CombinedDashboardData {
  clientCounts: {
    total: number
    ltd: number
    nonLtd: number
    vat: number
  }
  unassignedCounts: {
    ltd: number
    nonLtd: number
    vat: number
  }
  monthlyDeadlines: {
    accounts: number
    vat: number
    cs: number
    ct: number
  }
  upcomingDeadlines: {
    vat: {
      days7: number
      days15: number
      days30: number
      days60: number
      days90: number
    }
    accounts: {
      days7: number
      days15: number
      days30: number
      days60: number
      days90: number
    }
  }
  teamWorkload: Array<{
    id: string
    name: string
    role: string
    clientCount: number
    generalAssignments: number
    ltdAssignments: number
    nonLtdAssignments: number
    activeVATQuarters: number
    activeLtdWorkflows: number
  }>
  monthName: string
  cachedAt: string
}

export function ManagerDashboard({ userId }: ManagerDashboardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [data, setData] = useState<CombinedDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  const fetchData = async () => {
    try {
      setLoading(true)
      // PERFORMANCE: Use combined dashboard API instead of individual widget calls
      const response = await fetch('/api/dashboard/combined-widgets', {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=30'
        }
      })
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setLastUpdated(new Date().toLocaleTimeString())
      } else {
        console.error('Failed to fetch dashboard data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchData, 120000)
    return () => clearInterval(interval)
  }, [])

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

  if (!data) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Team management and workflow oversight
            </p>
          </div>
          <div className="text-center text-muted-foreground">
            Failed to load dashboard data
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
          {/* Client Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{data.clientCounts.total}</div>
                    <div className="text-sm text-muted-foreground">Total Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{data.clientCounts.vat}</div>
                    <div className="text-sm text-muted-foreground">VAT Clients</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{data.clientCounts.ltd}</div>
                    <div className="text-sm text-muted-foreground">Ltd Companies</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{data.clientCounts.nonLtd}</div>
                    <div className="text-sm text-muted-foreground">Non-Limited</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Deadlines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {data.monthName} Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Accounts Due</span>
                  <Badge variant="outline">{data.monthlyDeadlines.accounts}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">VAT Returns</span>
                  <Badge variant="outline">{data.monthlyDeadlines.vat}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Corporation Tax</span>
                  <Badge variant="outline">{data.monthlyDeadlines.ct}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Confirmations</span>
                  <Badge variant="outline">{data.monthlyDeadlines.cs}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unassigned Clients */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Unassigned Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => handleUnassignedNavigation('ltd')}
                >
                  <span>Ltd Companies</span>
                  <Badge variant="secondary">{data.unassignedCounts.ltd}</Badge>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => handleUnassignedNavigation('nonLtd')}
                >
                  <span>Non-Limited</span>
                  <Badge variant="secondary">{data.unassignedCounts.nonLtd}</Badge>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => handleUnassignedNavigation('vat')}
                >
                  <span>VAT Quarters</span>
                  <Badge variant="secondary">{data.unassignedCounts.vat}</Badge>
                </Button>
              </div>
            </CardContent>
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
          
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm font-medium">VAT Returns</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Next 7 days</span>
                    <Badge variant="destructive" className="h-5">{data.upcomingDeadlines.vat.days7}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Next 15 days</span>
                    <Badge variant="secondary" className="h-5">{data.upcomingDeadlines.vat.days15}</Badge>
                  </div>
                </div>
                
                <div className="text-sm font-medium pt-2">Accounts</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Next 7 days</span>
                    <Badge variant="destructive" className="h-5">{data.upcomingDeadlines.accounts.days7}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Next 15 days</span>
                    <Badge variant="secondary" className="h-5">{data.upcomingDeadlines.accounts.days15}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Team Workload */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Workload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.teamWorkload.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {member.role === 'PARTNER' && <Crown className="h-4 w-4 text-purple-600" />}
                        {member.role === 'MANAGER' && <Shield className="h-4 w-4 text-blue-600" />}
                        {member.role === 'STAFF' && <User className="h-4 w-4 text-gray-600" />}
                        <span className="font-medium">{member.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <div className="font-medium">{member.clientCount}</div>
                        <div className="text-xs text-muted-foreground">Clients</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-blue-600">{member.activeVATQuarters}</div>
                        <div className="text-xs text-muted-foreground">VAT</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-green-600">{member.activeLtdWorkflows}</div>
                        <div className="text-xs text-muted-foreground">Ltd</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
} 