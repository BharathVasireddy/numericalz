'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  FileText,
  Target,
  Mail,
  Building2,
  DollarSign,
  Activity,
  Timer,
  Award,
  Zap,
  PieChart,
  RefreshCw
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { VAT_WORKFLOW_STAGE_NAMES } from '@/lib/vat-workflow'

interface VATAnalytics {
  overview: {
    totalClients: number
    activeWorkflows: number
    completedThisMonth: number
    overdueReturns: number
    averageCompletionTime: number
    workflowEfficiency: number
  }
  stageBreakdown: Array<{
    stage: string
    count: number
    percentage: number
    averageDaysInStage: number
  }>
  userPerformance: Array<{
    userId: string
    userName: string
    userEmail: string
    assignedCount: number
    completedCount: number
    averageCompletionTime: number
    efficiency: number
  }>
  timeAnalysis: {
    quarterlyTrends: Array<{
      quarter: string
      completed: number
      onTime: number
      late: number
    }>
    monthlyWorkload: Array<{
      month: string
      created: number
      completed: number
      backlog: number
    }>
  }
  clientInsights: {
    frequencyDistribution: Array<{
      frequency: string
      count: number
      percentage: number
    }>
    quarterGroupDistribution: Array<{
      quarterGroup: string
      count: number
      percentage: number
    }>
  }
}

export function VATAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<VATAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('current_quarter')

  const fetchAnalytics = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) setRefreshing(true)
      else setLoading(true)

      const response = await fetch(`/api/vat-quarters/analytics?period=${selectedPeriod}`)
      const data = await response.json()

      if (data.success) {
        setAnalytics(data.analytics)
        if (showRefreshToast) {
          showToast.success('Analytics refreshed successfully')
        }
      } else {
        showToast.error('Failed to fetch VAT analytics')
      }
    } catch (error) {
      console.error('Error fetching VAT analytics:', error)
      showToast.error('Failed to fetch VAT analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedPeriod])

  const getStageIcon = (stage: string) => {
    const stageMap: { [key: string]: React.ReactNode } = {
      'CLIENT_BOOKKEEPING': <FileText className="h-4 w-4" />,
      'WORK_IN_PROGRESS': <TrendingUp className="h-4 w-4" />,
      'QUERIES_PENDING': <AlertTriangle className="h-4 w-4" />,
      'REVIEW_PENDING_MANAGER': <Users className="h-4 w-4" />,
      'REVIEW_PENDING_PARTNER': <Target className="h-4 w-4" />,
      'EMAILED_TO_PARTNER': <Mail className="h-4 w-4" />,
      'EMAILED_TO_CLIENT': <Mail className="h-4 w-4" />,
      'CLIENT_APPROVED': <CheckCircle className="h-4 w-4" />,
      'FILED_TO_HMRC': <CheckCircle className="h-4 w-4" />
    }
    return stageMap[stage] || <Clock className="h-4 w-4" />
  }

  const getPerformanceColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-600'
    if (efficiency >= 75) return 'text-blue-600'
    if (efficiency >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBadge = (efficiency: number) => {
    if (efficiency >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>
    if (efficiency >= 75) return <Badge className="bg-blue-100 text-blue-800">Good</Badge>
    if (efficiency >= 60) return <Badge className="bg-yellow-100 text-yellow-800">Average</Badge>
    return <Badge className="bg-red-100 text-red-800">Needs Improvement</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">VAT Analytics Dashboard</h2>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Failed to load analytics data</p>
        <Button onClick={() => fetchAnalytics()} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            VAT Analytics Dashboard
          </h2>
          <p className="text-muted-foreground">
            Comprehensive insights into VAT workflow performance and trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total VAT Clients</p>
                <p className="text-3xl font-bold">{analytics.overview.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
                <p className="text-3xl font-bold">{analytics.overview.activeWorkflows}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed This Month</p>
                <p className="text-3xl font-bold">{analytics.overview.completedThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue Returns</p>
                <p className="text-3xl font-bold text-red-600">{analytics.overview.overdueReturns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Average Completion Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {analytics.overview.averageCompletionTime}
              </div>
              <div className="text-sm text-muted-foreground">Days per VAT return</div>
              <Progress 
                value={Math.max(0, 100 - (analytics.overview.averageCompletionTime / 30 * 100))} 
                className="mt-4" 
              />
              <div className="text-xs text-muted-foreground mt-2">
                Target: Under 21 days
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Workflow Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getPerformanceColor(analytics.overview.workflowEfficiency)}`}>
                {analytics.overview.workflowEfficiency}%
              </div>
              <div className="mb-4">{getPerformanceBadge(analytics.overview.workflowEfficiency)}</div>
              <Progress value={analytics.overview.workflowEfficiency} className="mt-4" />
              <div className="text-xs text-muted-foreground mt-2">
                On-time completion rate
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="workflow" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflow">Workflow Stages</TabsTrigger>
          <TabsTrigger value="performance">Team Performance</TabsTrigger>
          <TabsTrigger value="trends">Time Trends</TabsTrigger>
          <TabsTrigger value="insights">Client Insights</TabsTrigger>
        </TabsList>

        {/* Workflow Stages Analysis */}
        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Stage Breakdown</CardTitle>
              <CardDescription>
                Current distribution of VAT returns across workflow stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.stageBreakdown.map((stage) => (
                  <div key={stage.stage} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-48">
                      {getStageIcon(stage.stage)}
                      <span className="text-sm font-medium">
                        {VAT_WORKFLOW_STAGE_NAMES[stage.stage as keyof typeof VAT_WORKFLOW_STAGE_NAMES]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-muted-foreground">
                          {stage.count} returns ({stage.percentage}%)
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Avg: {stage.averageDaysInStage} days
                        </span>
                      </div>
                      <Progress value={stage.percentage} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Performance Analysis */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Metrics</CardTitle>
              <CardDescription>
                Individual performance analysis for VAT workflow management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.userPerformance.map((user) => (
                  <div key={user.userId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{user.userName}</h4>
                        <p className="text-sm text-muted-foreground">{user.userEmail}</p>
                      </div>
                      <div className="text-right">
                        {getPerformanceBadge(user.efficiency)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Assigned</p>
                        <p className="font-medium">{user.assignedCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Completed</p>
                        <p className="font-medium">{user.completedCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Time</p>
                        <p className="font-medium">{user.averageCompletionTime} days</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Efficiency</p>
                        <p className={`font-medium ${getPerformanceColor(user.efficiency)}`}>
                          {user.efficiency}%
                        </p>
                      </div>
                    </div>
                    <Progress value={user.efficiency} className="mt-3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Trends Analysis */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quarterly Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.timeAnalysis.quarterlyTrends.map((quarter) => (
                    <div key={quarter.quarter} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{quarter.quarter}</span>
                        <span className="text-sm text-muted-foreground">
                          {quarter.completed} completed
                        </span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div 
                          className="bg-green-500 rounded-l"
                          style={{ width: `${(quarter.onTime / quarter.completed) * 100}%` }}
                        />
                        <div 
                          className="bg-red-500 rounded-r"
                          style={{ width: `${(quarter.late / quarter.completed) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>On Time: {quarter.onTime}</span>
                        <span>Late: {quarter.late}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Workload Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.timeAnalysis.monthlyWorkload.map((month) => (
                    <div key={month.month} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{month.month}</span>
                        <span className="text-sm text-muted-foreground">
                          Backlog: {month.backlog}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="font-medium">{month.created}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed:</span>
                          <span className="font-medium">{month.completed}</span>
                        </div>
                      </div>
                      <Progress 
                        value={(month.completed / Math.max(month.created, 1)) * 100} 
                        className="h-2" 
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Client Insights */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  VAT Frequency Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.clientInsights.frequencyDistribution.map((freq) => (
                    <div key={freq.frequency} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium">
                        {freq.frequency === 'QUARTERLY' ? 'Quarterly' :
                         freq.frequency === 'MONTHLY' ? 'Monthly' :
                         freq.frequency === 'ANNUALLY' ? 'Annually' : freq.frequency}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-muted-foreground">
                            {freq.count} clients
                          </span>
                          <span className="text-sm font-medium">
                            {freq.percentage}%
                          </span>
                        </div>
                        <Progress value={freq.percentage} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Quarter Group Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.clientInsights.quarterGroupDistribution.map((group) => (
                    <div key={group.quarterGroup} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium">
                        Group {group.quarterGroup}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-muted-foreground">
                            {group.count} clients
                          </span>
                          <span className="text-sm font-medium">
                            {group.percentage}%
                          </span>
                        </div>
                        <Progress value={group.percentage} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}