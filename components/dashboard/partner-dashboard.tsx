'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { DeadlineSummaryCard } from './widgets/deadline-summary-card'
import { WorkloadDistributionWidget } from './widgets/workload-distribution-widget'
import { WorkflowStageWidget } from './widgets/workflow-stage-widget'
import { NotificationWidget } from './widgets/notification-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useRouter } from 'next/navigation'
import { 
  Building,
  Users, 
  TrendingUp, 
  RefreshCw,
  BarChart3,
  PieChart,
  Briefcase
} from 'lucide-react'

interface PartnerDashboardProps {
  userId: string
}

interface PartnerDashboardData {
  firmOverview: {
    totalClients: number
    activeClients: number
    teamMembers: number
  }
  performanceMetrics: {
    averageCompletionTime: number
    teamUtilization: number
    clientSatisfactionScore: number
  }
  clientDistribution: {
    byType: Array<{
      type: string
      count: number
      percentage: number
    }>
    bySize: Array<{
      size: string
      count: number
      percentage: number
    }>
  }
  teamPerformance: Array<{
    id: string
    name: string
    role: 'PARTNER' | 'MANAGER' | 'STAFF'
    email: string
    clientCount: number
    overdueCount: number
    completedThisMonth: number
    workloadPercentage: number
    status: 'available' | 'busy' | 'overloaded'
    efficiency: number
  }>
  workflowAnalytics: {
    vat: Array<{
      stage: string
      label: string
      count: number
      percentage: number
      color: string
      avgDaysInStage: number
      efficiency: number
    }>
  }
  deadlines: {
    vat: { overdue: number; dueSoon: number; upcoming: number; completed: number }
    accounts: { overdue: number; dueSoon: number; upcoming: number; completed: number }
    ct: { overdue: number; dueSoon: number; upcoming: number; completed: number }
    confirmation: { overdue: number; dueSoon: number; upcoming: number; completed: number }
  }
  notifications: Array<{
    id: string
    type: 'deadline' | 'review' | 'assignment' | 'completion' | 'overdue' | 'system'
    title: string
    message: string
    clientName?: string
    clientCode?: string
    priority: 'high' | 'medium' | 'low'
    read: boolean
    createdAt: Date
    actionUrl?: string
  }>
}

export function PartnerDashboard({ userId }: PartnerDashboardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PartnerDashboardData | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/partner/${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching partner dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [userId])

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      })
      
      if (data) {
        setData({
          ...data,
          notifications: data.notifications.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        })
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }



  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <PageHeader 
          title="Partner Dashboard"
          description="Loading executive overview..."
        />
        <PageContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </PageContent>
      </PageLayout>
    )
  }

  if (!data) {
    return (
      <PageLayout maxWidth="2xl">
        <PageHeader 
          title="Partner Dashboard"
          description="Error loading dashboard data"
        />
        <PageContent>
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">Failed to load dashboard data</p>
              <Button onClick={fetchDashboardData}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </PageContent>
      </PageLayout>
    )
  }

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader 
        title={`Executive Dashboard - ${session?.user?.name}`}
        description="Firm-wide insights, performance analytics, and strategic overview"
      >
        <Button 
          variant="outline" 
          onClick={fetchDashboardData}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      <PageContent>
        {/* Key Operational Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.firmOverview.activeClients}</div>
              <p className="text-xs text-muted-foreground">
                {data.firmOverview.totalClients} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.firmOverview.teamMembers}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round(data.performanceMetrics.teamUtilization)}% utilization
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Workflow Efficiency</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(data.performanceMetrics.teamUtilization)}%</div>
              <p className="text-xs text-muted-foreground">Overall efficiency</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="team">Team Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Deadline Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <DeadlineSummaryCard
                title="VAT Returns"
                type="vat"
                stats={data.deadlines.vat}
                color="blue"
              />
              <DeadlineSummaryCard
                title="Annual Accounts"
                type="accounts"
                stats={data.deadlines.accounts}
                color="green"
              />
              <DeadlineSummaryCard
                title="Corporation Tax"
                type="ct"
                stats={data.deadlines.ct}
                color="purple"
              />
              <DeadlineSummaryCard
                title="Confirmations"
                type="confirmation"
                stats={data.deadlines.confirmation}
                color="orange"
              />
            </div>

            {/* Client Distribution */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Client Distribution by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.clientDistribution.byType.map((item, index) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                          />
                          <span className="text-sm font-medium">{item.type}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{item.count} clients</p>
                          <p className="text-xs text-muted-foreground">
                            {item.percentage.toFixed(1)}% of total
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Client Distribution by Size
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.clientDistribution.bySize.map((item, index) => (
                      <div key={item.size} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.size}</span>
                          <span className="text-sm">{item.count} clients</span>
                        </div>
                        <Progress value={item.percentage} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {item.percentage.toFixed(1)}% of total clients
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notifications */}
            <NotificationWidget
              notifications={data.notifications}
              title="Executive Notifications"
              onMarkAsRead={handleMarkNotificationRead}
            />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Key Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Client Satisfaction</span>
                    <div className="flex items-center gap-2">
                      <Progress value={data.performanceMetrics.clientSatisfactionScore} className="w-20 h-2" />
                      <span className="text-sm font-medium">{data.performanceMetrics.clientSatisfactionScore}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Team Utilization</span>
                    <div className="flex items-center gap-2">
                      <Progress value={data.performanceMetrics.teamUtilization} className="w-20 h-2" />
                      <span className="text-sm font-medium">{data.performanceMetrics.teamUtilization}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Completion Time</span>
                    <span className="text-sm font-medium">{data.performanceMetrics.averageCompletionTime} days</span>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                <WorkflowStageWidget
                  stages={data.workflowAnalytics.vat}
                  title="VAT Workflow Efficiency Analysis"
                  type="vat"
                  totalClients={data.workflowAnalytics.vat.reduce((sum, stage) => sum + stage.count, 0)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Team Analytics Tab */}
          <TabsContent value="team" className="space-y-6">
            <WorkloadDistributionWidget 
              teamMembers={data.teamPerformance}
              title="Team Performance & Workload Analysis"
            />
          </TabsContent>


        </Tabs>

        {/* Quick Actions */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Executive Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/staff')}
                >
                  <Users className="h-5 w-5" />
                  Team Management
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/clients')}
                >
                  <Building className="h-5 w-5" />
                  Client Portfolio
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/clients/vat-analytics')}
                >
                  <BarChart3 className="h-5 w-5" />
                  Analytics
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/settings')}
                >
                  <Briefcase className="h-5 w-5" />
                  Firm Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageLayout>
  )
} 