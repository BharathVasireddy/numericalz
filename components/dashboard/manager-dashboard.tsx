'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { DeadlineSummaryCard } from './widgets/deadline-summary-card'
import { WorkReviewWidget } from './widgets/work-review-widget'
import { WorkloadDistributionWidget } from './widgets/workload-distribution-widget'
import { WorkflowStageWidget } from './widgets/workflow-stage-widget'
import { NotificationWidget } from './widgets/notification-widget'
import { WorkflowReviewNotificationWidget } from './widgets/workflow-review-notification-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  FileCheck, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  Clock
} from 'lucide-react'

interface ManagerDashboardProps {
  userId: string
}

interface ManagerDashboardData {
  teamOverview: {
    totalTeamMembers: number
    activeMembers: number
    overloadedMembers: number
    totalClientsManaged: number
  }
  workReview: Array<{
    id: string
    clientName: string
    clientCode: string
    type: 'vat' | 'accounts' | 'ct'
    stage: string
    submittedBy: string
    submittedDate: Date
    daysWaiting: number
    priority: 'high' | 'medium' | 'low'
  }>
  teamMembers: Array<{
    id: string
    name: string
    role: 'PARTNER' | 'MANAGER' | 'STAFF'
    email: string
    clientCount: number
    overdueCount: number
    completedThisMonth: number
    workloadPercentage: number
    status: 'available' | 'busy' | 'overloaded'
  }>
  workflowStages: {
    vat: Array<{
      stage: string
      label: string
      count: number
      percentage: number
      color: string
      icon: React.ReactNode
      avgDaysInStage: number
    }>
    accounts: Array<{
      stage: string
      label: string
      count: number
      percentage: number
      color: string
      icon: React.ReactNode
      avgDaysInStage: number
    }>
  }
  deadlines: {
    vat: {
      overdue: number
      dueSoon: number
      upcoming: number
      completed: number
    }
    accounts: {
      overdue: number
      dueSoon: number
      upcoming: number
      completed: number
    }
    ct: {
      overdue: number
      dueSoon: number
      upcoming: number
      completed: number
    }
    confirmation: {
      overdue: number
      dueSoon: number
      upcoming: number
      completed: number
    }
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
  workflowReviews: Array<{
    id: string
    type: 'vat' | 'ltd'
    clientId: string
    clientName: string
    clientCode: string
    workflowId: string
    currentStage: string
    stageLabel: string
    assignedUser: {
      id: string
      name: string
      role: string
    }
    submittedDate: Date | string
    daysWaiting: number
    priority: 'high' | 'medium' | 'low'
    quarterPeriod?: string
    filingPeriod?: string
  }>
  analytics: {
    completionRate: number
    averageProcessingTime: number
    teamEfficiency: number
    clientSatisfaction: number
  }
}

export function ManagerDashboard({ userId }: ManagerDashboardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ManagerDashboardData | null>(null)
  const [workflowReviews, setWorkflowReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/manager/${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching manager dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkflowReviews = async () => {
    try {
      setReviewsLoading(true)
      const response = await fetch('/api/notifications/workflow-reviews?role=MANAGER')
      const result = await response.json()
      
      if (result.success) {
        setWorkflowReviews(result.data.reviewItems)
      }
    } catch (error) {
      console.error('Error fetching workflow reviews:', error)
    } finally {
      setReviewsLoading(false)
    }
  }

  const handleReviewComplete = () => {
    // Refresh both dashboard data and workflow reviews
    fetchDashboardData()
    fetchWorkflowReviews()
  }

  useEffect(() => {
    fetchDashboardData()
    fetchWorkflowReviews()
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

  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH'
      })
      
      if (data) {
        setData({
          ...data,
          notifications: data.notifications.map(n => ({ ...n, read: true }))
        })
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <PageHeader 
          title="Manager Dashboard"
          description="Loading your management overview..."
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
          title="Manager Dashboard"
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
        title={`Manager Dashboard - ${session?.user?.name}`}
        description="Team oversight, work review, and performance analytics"
      >
        <Button 
          variant="outline" 
          onClick={() => {
            fetchDashboardData()
            fetchWorkflowReviews()
          }}
          disabled={loading || reviewsLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading || reviewsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      <PageContent>
        {/* Key Metrics Row */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.teamOverview.totalTeamMembers}</div>
              <p className="text-xs text-muted-foreground">
                {data.teamOverview.activeMembers} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Work Pending Review</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.workReview.length}</div>
              <p className="text-xs text-muted-foreground">
                {data.workReview.filter(w => w.priority === 'high').length} high priority
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.teamOverview.totalClientsManaged}</div>
              <p className="text-xs text-muted-foreground">
                Under management
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Efficiency</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.analytics.teamEfficiency}%</div>
              <p className="text-xs text-muted-foreground">
                Overall performance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts Row */}
        {data.teamOverview.overloadedMembers > 0 && (
          <div className="mb-6">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-900">
                      {data.teamOverview.overloadedMembers} team member(s) are overloaded
                    </p>
                    <p className="text-sm text-orange-700">
                      Consider redistributing workload or providing additional support
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto"
                    onClick={() => router.push('/dashboard/staff')}
                  >
                    Manage Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Workflow Review Notifications - Top Priority */}
        {workflowReviews.length > 0 && (
          <div className="mb-6">
            <WorkflowReviewNotificationWidget
              items={workflowReviews}
              userRole="MANAGER"
              onReviewComplete={handleReviewComplete}
            />
          </div>
        )}

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="review">Work Review</TabsTrigger>
            <TabsTrigger value="team">Team Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Deadline Cards */}
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

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <WorkflowStageWidget
                  stages={data.workflowStages.vat}
                  title="VAT Workflow Distribution"
                  type="vat"
                  totalClients={data.workflowStages.vat.reduce((sum, stage) => sum + stage.count, 0)}
                />
              </div>
              <div className="lg:col-span-1">
                <NotificationWidget
                  notifications={data.notifications.slice(0, 6)}
                  title="Priority Notifications"
                  onMarkAsRead={handleMarkNotificationRead}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                />
              </div>
            </div>
          </TabsContent>

          {/* Work Review Tab */}
          <TabsContent value="review" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <WorkReviewWidget items={data.workReview} />
              </div>
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Review Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">High Priority</span>
                      <Badge variant="destructive">
                        {data.workReview.filter(w => w.priority === 'high').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Medium Priority</span>
                      <Badge variant="secondary">
                        {data.workReview.filter(w => w.priority === 'medium').length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Low Priority</span>
                      <Badge variant="outline">
                        {data.workReview.filter(w => w.priority === 'low').length}
                      </Badge>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Avg. Wait Time</span>
                        <span className="text-sm">
                          {Math.round(data.workReview.reduce((sum, w) => sum + w.daysWaiting, 0) / data.workReview.length || 0)} days
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Team Management Tab */}
          <TabsContent value="team" className="space-y-6">
            <WorkloadDistributionWidget 
              teamMembers={data.teamMembers}
              title="Team Workload Overview"
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.analytics.completionRate}%</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.analytics.averageProcessingTime}</div>
                  <p className="text-xs text-muted-foreground">Days per task</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Efficiency</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.analytics.teamEfficiency}%</div>
                  <p className="text-xs text-muted-foreground">Overall score</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Client Satisfaction</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.analytics.clientSatisfaction}%</div>
                  <p className="text-xs text-muted-foreground">Satisfaction rate</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <WorkflowStageWidget
                stages={data.workflowStages.vat}
                title="VAT Workflow Analysis"
                type="vat"
                totalClients={data.workflowStages.vat.reduce((sum, stage) => sum + stage.count, 0)}
              />
              <WorkflowStageWidget
                stages={data.workflowStages.accounts}
                title="Accounts Workflow Analysis"
                type="accounts"
                totalClients={data.workflowStages.accounts.reduce((sum, stage) => sum + stage.count, 0)}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/staff')}
                >
                  <Users className="h-5 w-5" />
                  Manage Team
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/clients/vat-dt')}
                >
                  <FileCheck className="h-5 w-5" />
                  Review Work
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/calendar')}
                >
                  <Calendar className="h-5 w-5" />
                  View Calendar
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/clients')}
                >
                  <BarChart3 className="h-5 w-5" />
                  Client Overview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageLayout>
  )
} 