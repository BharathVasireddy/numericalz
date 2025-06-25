'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageContent } from '@/components/layout/page-layout'
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
  Building2,
  Receipt,
  Calculator,
  AlertTriangle
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

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'vat': return <Receipt className="h-3 w-3 text-green-600" />
      case 'accounts': return <FileText className="h-3 w-3 text-blue-600" />
      case 'ct': return <Calculator className="h-3 w-3 text-purple-600" />
      default: return <Building className="h-3 w-3 text-gray-600" />
    }
  }

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'vat': return 'text-green-600'
      case 'accounts': return 'text-blue-600'
      case 'ct': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Staff Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your work overview and upcoming deadlines
            </p>
          </div>
          <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="rounded-lg bg-muted h-32" />
              ))}
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-lg bg-muted h-48" />
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-lg bg-muted h-64" />
            </div>
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
            <h1 className="text-xl md:text-2xl font-bold">Staff Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your work overview and upcoming deadlines
            </p>
          </div>
          <div className="text-center text-muted-foreground">
            Failed to load dashboard data
          </div>
        </div>
      </PageLayout>
    )
  }

  const totalOverdueAndDueSoon = 
    data.deadlines.vat.overdue + data.deadlines.vat.dueSoon +
    data.deadlines.accounts.overdue + data.deadlines.accounts.dueSoon +
    data.deadlines.ct.overdue + data.deadlines.ct.dueSoon +
    data.deadlines.confirmation.overdue + data.deadlines.confirmation.dueSoon

  return (
    <PageLayout maxWidth="2xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Welcome back, {session?.user?.name}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your work overview and upcoming deadlines
          </p>
        </div>

        {/* Urgent Deadlines Alert */}
        {totalOverdueAndDueSoon > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">
                    You have {totalOverdueAndDueSoon} urgent deadline{totalOverdueAndDueSoon !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-red-700">
                    Review your deadlines and prioritize your work accordingly
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto"
                  onClick={() => router.push('/dashboard/clients')}
                >
                  View Deadlines
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard Grid - Column-based Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Your Statistics */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Your Statistics Widget */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Your Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <div className="flex items-center justify-between">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      <span className="text-lg font-bold text-blue-700">{data.stats.totalClients}</span>
                    </div>
                    <p className="text-xs text-blue-600 font-medium mt-1">Total Clients</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-green-50">
                    <div className="flex items-center justify-between">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-bold text-green-700">{data.stats.activeClients}</span>
                    </div>
                    <p className="text-xs text-green-600 font-medium mt-1">Active</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-purple-50">
                    <div className="flex items-center justify-between">
                      <CheckCircle className="h-4 w-4 text-purple-600" />
                      <span className="text-lg font-bold text-purple-700">{data.stats.completedThisMonth}</span>
                    </div>
                    <p className="text-xs text-purple-600 font-medium mt-1">Completed</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-orange-50">
                    <div className="flex items-center justify-between">
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                      <span className="text-lg font-bold text-orange-700">{data.stats.overallProgress}%</span>
                    </div>
                    <p className="text-xs text-orange-600 font-medium mt-1">Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Priority Notifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Priority Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className={`p-3 rounded-lg border ${notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        {notification.clientName && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {notification.clientName}
                          </Badge>
                        )}
                      </div>
                      <Badge 
                        variant={notification.priority === 'high' ? 'destructive' : notification.priority === 'medium' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {notification.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
                {data.notifications.length === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-muted-foreground">All caught up!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Recent Activity */}
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentActivity.slice(0, 8).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    {getActivityTypeIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.clientName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
                {data.recentActivity.length === 0 && (
                  <div className="text-center py-6">
                    <Clock className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Your Deadlines */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Your Deadlines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Your Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-3 w-3 text-red-600" />
                        <span className="text-sm font-medium text-red-800">VAT Returns</span>
                      </div>
                      <span className="text-lg font-bold text-red-700">
                        {data.deadlines.vat.overdue + data.deadlines.vat.dueSoon}
                      </span>
                    </div>
                    <div className="text-xs text-red-600">
                      {data.deadlines.vat.overdue} overdue • {data.deadlines.vat.dueSoon} due soon
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3 w-3 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Accounts</span>
                      </div>
                      <span className="text-lg font-bold text-blue-700">
                        {data.deadlines.accounts.overdue + data.deadlines.accounts.dueSoon}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600">
                      {data.deadlines.accounts.overdue} overdue • {data.deadlines.accounts.dueSoon} due soon
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-3 w-3 text-purple-600" />
                        <span className="text-sm font-medium text-purple-800">Corp Tax</span>
                      </div>
                      <span className="text-lg font-bold text-purple-700">
                        {data.deadlines.ct.overdue + data.deadlines.ct.dueSoon}
                      </span>
                    </div>
                    <div className="text-xs text-purple-600">
                      {data.deadlines.ct.overdue} overdue • {data.deadlines.ct.dueSoon} due soon
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">Confirmations</span>
                      </div>
                      <span className="text-lg font-bold text-orange-700">
                        {data.deadlines.confirmation.overdue + data.deadlines.confirmation.dueSoon}
                      </span>
                    </div>
                    <div className="text-xs text-orange-600">
                      {data.deadlines.confirmation.overdue} overdue • {data.deadlines.confirmation.dueSoon} due soon
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => router.push('/dashboard/clients')}
              >
                <Building className="h-4 w-4" />
                <span className="text-xs">My Clients</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => router.push('/dashboard/clients/vat-dt')}
              >
                <Receipt className="h-4 w-4" />
                <span className="text-xs">VAT Returns</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => router.push('/dashboard/clients/ltd-companies')}
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs">Accounts</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => router.push('/dashboard/calendar')}
              >
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Calendar</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
} 