'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageContent } from '@/components/layout/page-layout'
import { PendingToChaseWidget } from './widgets/pending-to-chase-widget'
import { VATUnassignedWidget } from './widgets/vat-unassigned-widget'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  FileCheck, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  Crown,
  Shield,
  User,
  Building2,
  Receipt,
  CheckCircle,
  Calculator,
  BarChart3,
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

  useEffect(() => {
    fetchDashboardData()
  }, [userId])

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'partner': return <Crown className="h-3 w-3 text-purple-600" />
      case 'manager': return <Shield className="h-3 w-3 text-blue-600" />
      default: return <User className="h-3 w-3 text-gray-600" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'partner': return 'default'
      case 'manager': return 'secondary'
      default: return 'outline'
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
          <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-lg bg-muted h-32" />
              ))}
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-lg bg-muted h-48" />
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
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Team management and workflow oversight
          </p>
        </div>

        {/* Team Overload Alert */}
        {data.teamOverview.overloadedMembers > 0 && (
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
        )}

        {/* Main Dashboard Grid - Column-based Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Team Overview */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Team Overview Widget */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <div className="flex items-center justify-between">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-lg font-bold text-blue-700">{data.teamOverview.totalTeamMembers}</span>
                    </div>
                    <p className="text-xs text-blue-600 font-medium mt-1">Team Members</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-green-50">
                    <div className="flex items-center justify-between">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-bold text-green-700">{data.teamOverview.activeMembers}</span>
                    </div>
                    <p className="text-xs text-green-600 font-medium mt-1">Active</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-purple-50">
                    <div className="flex items-center justify-between">
                      <Building2 className="h-4 w-4 text-purple-600" />
                      <span className="text-lg font-bold text-purple-700">{data.teamOverview.totalClientsManaged}</span>
                    </div>
                    <p className="text-xs text-purple-600 font-medium mt-1">Total Clients</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-orange-50">
                    <div className="flex items-center justify-between">
                      <FileCheck className="h-4 w-4 text-orange-600" />
                      <span className="text-lg font-bold text-orange-700">{data.workReview.length}</span>
                    </div>
                    <p className="text-xs text-orange-600 font-medium mt-1">Pending Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Completion</span>
                    </div>
                    <div className="text-xl font-bold text-blue-700">{data.analytics.completionRate}%</div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-green-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Avg. Time</span>
                    </div>
                    <div className="text-xl font-bold text-green-700">{data.analytics.averageProcessingTime}d</div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-purple-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="h-3 w-3 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600">Efficiency</span>
                    </div>
                    <div className="text-xl font-bold text-purple-700">{data.analytics.teamEfficiency}%</div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-orange-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="h-3 w-3 text-orange-600" />
                      <span className="text-xs font-medium text-orange-600">Satisfaction</span>
                    </div>
                    <div className="text-xl font-bold text-orange-700">{data.analytics.clientSatisfaction}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Staff Workload */}
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Staff Workload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.teamMembers.slice(0, 8).map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      {getRoleIcon(member.role)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{member.name}</span>
                          <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {member.clientCount} clients • {member.overdueCount} overdue
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{member.completedThisMonth}</div>
                      <p className="text-xs text-muted-foreground">completed</p>
                    </div>
                  </div>
                ))}
                {data.teamMembers.length > 8 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => router.push('/dashboard/staff')}
                  >
                    View All Team Members
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Pending to Chase & Deadlines */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Pending to Chase Widget */}
            <PendingToChaseWidget userRole="MANAGER" userId={userId} />

            {/* Monthly Deadlines */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Monthly Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Receipt className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">VAT</span>
                    </div>
                    <div className="text-xl font-bold text-blue-700">
                      {data.deadlines.vat.overdue + data.deadlines.vat.dueSoon}
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-green-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <FileCheck className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Accounts</span>
                    </div>
                    <div className="text-xl font-bold text-green-700">
                      {data.deadlines.accounts.overdue + data.deadlines.accounts.dueSoon}
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-purple-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Calculator className="h-3 w-3 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600">Corp Tax</span>
                    </div>
                    <div className="text-xl font-bold text-purple-700">
                      {data.deadlines.ct.overdue + data.deadlines.ct.dueSoon}
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-orange-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle className="h-3 w-3 text-orange-600" />
                      <span className="text-xs font-medium text-orange-600">Confirm.</span>
                    </div>
                    <div className="text-xl font-bold text-orange-700">
                      {data.deadlines.confirmation.overdue + data.deadlines.confirmation.dueSoon}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VAT Unassigned Widget */}
            <VATUnassignedWidget />
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
                onClick={() => router.push('/dashboard/staff')}
              >
                <Users className="h-4 w-4" />
                <span className="text-xs">Manage Team</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => router.push('/dashboard/clients/vat-dt')}
              >
                <FileCheck className="h-4 w-4" />
                <span className="text-xs">Review Work</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => router.push('/dashboard/calendar')}
              >
                <Calendar className="h-4 w-4" />
                <span className="text-xs">View Calendar</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-16 flex-col gap-2"
                onClick={() => router.push('/dashboard/clients')}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">Client Overview</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
} 