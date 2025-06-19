'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { DeadlineSummaryCard } from './widgets/deadline-summary-card'
import { NotificationWidget } from './widgets/notification-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { 
  Calendar, 
  FileText, 
  Building, 
  CheckCircle, 
  Clock,
  TrendingUp,
  User,
  RefreshCw
} from 'lucide-react'

interface StaffDashboardProps {
  userId: string
}

interface DashboardData {
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
  stats: {
    totalClients: number
    activeClients: number
    completedThisMonth: number
    overallProgress: number
  }
  recentActivity: Array<{
    id: string
    action: string
    clientName: string
    timestamp: Date | string
    type: 'vat' | 'accounts' | 'ct' | 'general'
  }>
}

export function StaffDashboard({ userId }: StaffDashboardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/staff/${userId}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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
      
      // Update local state
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
      
      // Update local state
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
      <PageLayout maxWidth="xl">
        <PageHeader 
          title="Staff Dashboard"
          description="Loading your dashboard..."
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
      <PageLayout maxWidth="xl">
        <PageHeader 
          title="Staff Dashboard"
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
    <PageLayout maxWidth="xl">
      <PageHeader 
        title={`Welcome back, ${session?.user?.name}!`}
        description="Here's your work overview and upcoming deadlines"
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
        {/* Key Stats Row */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Clients</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">
                {data.stats.activeClients} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.completedThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                Tasks completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.overallProgress}%</div>
              <p className="text-xs text-muted-foreground">
                On track
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              <Badge variant="destructive">
                {data.notifications.filter(n => !n.read).length}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.notifications.length}</div>
              <p className="text-xs text-muted-foreground">
                Total notifications
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Deadline Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <DeadlineSummaryCard
            title="VAT Returns"
            type="vat"
            stats={data.deadlines.vat}
            icon={<FileText className="h-5 w-5" />}
            color="blue"
          />
          
          <DeadlineSummaryCard
            title="Annual Accounts"
            type="accounts"
            stats={data.deadlines.accounts}
            icon={<Building className="h-5 w-5" />}
            color="green"
          />
          
          <DeadlineSummaryCard
            title="Corporation Tax"
            type="ct"
            stats={data.deadlines.ct}
            icon={<Calendar className="h-5 w-5" />}
            color="purple"
          />
          
          <DeadlineSummaryCard
            title="Confirmations"
            type="confirmation"
            stats={data.deadlines.confirmation}
            icon={<CheckCircle className="h-5 w-5" />}
            color="orange"
          />
        </div>

        {/* Main Content Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Notifications - Takes 1/3 */}
          <div className="lg:col-span-1">
            <NotificationWidget
              notifications={data.notifications}
              onMarkAsRead={handleMarkNotificationRead}
              onMarkAllRead={handleMarkAllNotificationsRead}
            />
          </div>

          {/* Recent Activity - Takes 2/3 */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        <div className="flex-shrink-0">
                          {activity.type === 'vat' && <FileText className="h-4 w-4 text-blue-500" />}
                          {activity.type === 'accounts' && <Building className="h-4 w-4 text-green-500" />}
                          {activity.type === 'ct' && <Calendar className="h-4 w-4 text-purple-500" />}
                          {activity.type === 'general' && <Clock className="h-4 w-4 text-gray-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.clientName} • {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/clients/vat-dt')}
                >
                  <FileText className="h-5 w-5" />
                  VAT Deadlines
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/calendar')}
                >
                  <Calendar className="h-5 w-5" />
                  Calendar View
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-16 flex-col gap-2"
                  onClick={() => router.push('/dashboard/clients')}
                >
                  <User className="h-5 w-5" />
                  My Clients
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageLayout>
  )
} 