'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building,
  Users, 
  Crown,
  Shield,
  User,
  Building2,
  Receipt,
  FileText,
  Calculator,
  CheckCircle,
  Calendar
} from 'lucide-react'

interface PartnerDashboardProps {
  userId: string
}

interface DashboardData {
  clientCounts: {
    total: number
    ltd: number
    nonLtd: number
    vat: number
  }
  staffWorkload: Array<{
    id: string
    name: string
    role: string
    clientCount: number
    vatClients: number
    accountsClients: number
  }>
  monthlyDeadlines: {
    accounts: number
    vat: number
    cs: number
    ct: number
  }
  upcomingDeadlines: Array<{
    id: string
    companyName: string
    type: string
    date: string
    daysUntil: number
  }>
  monthName: string
}

export function PartnerDashboard({ userId }: PartnerDashboardProps) {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/dashboard/partner/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const result = await response.json()
      if (result.success && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  if (loading) {
    return (
      <PageLayout maxWidth="xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Partner Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Overview of clients, team workload, and monthly deadlines
            </p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-lg bg-muted h-32" />
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!data || !data.clientCounts || !data.staffWorkload || !data.monthlyDeadlines) {
    return (
      <PageLayout maxWidth="xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Partner Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Overview of clients, team workload, and monthly deadlines
            </p>
          </div>
          <div className="text-center text-muted-foreground">
            {data ? 'Invalid dashboard data structure' : 'Failed to load dashboard data'}
          </div>
        </div>
      </PageLayout>
    )
  }

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

  const getDeadlineTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'accounts': return <FileText className="h-3 w-3 text-blue-600" />
      case 'vat': return <Receipt className="h-3 w-3 text-green-600" />
      case 'confirmation': return <CheckCircle className="h-3 w-3 text-orange-600" />
      case 'corporation tax': return <Calculator className="h-3 w-3 text-purple-600" />
      default: return <Calendar className="h-3 w-3 text-gray-600" />
    }
  }

  const getDeadlineTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'accounts': return 'text-blue-600'
      case 'vat': return 'text-green-600'
      case 'confirmation': return 'text-orange-600'
      case 'corporation tax': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <PageLayout maxWidth="xl">
      <PageContent>
        <div className="space-y-6">
          {/* Header without separator line */}
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Partner Dashboard</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Overview of clients, team workload, and monthly deadlines
            </p>
          </div>

          {/* Client Overview - 4 Compact Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Clients */}
            <Card className="h-full">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Total Clients</p>
                    <p className="text-2xl font-bold">{data.clientCounts.total}</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  All active clients
                </div>
              </CardContent>
            </Card>

            {/* Ltd Companies */}
            <Card className="h-full">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Ltd Companies</p>
                    <p className="text-2xl font-bold">{data.clientCounts.ltd}</p>
                  </div>
                  <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {data.clientCounts.total > 0 ? Math.round((data.clientCounts.ltd / data.clientCounts.total) * 100) : 0}% of total
                </div>
              </CardContent>
            </Card>

            {/* Non-Limited */}
            <Card className="h-full">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Non-Limited</p>
                    <p className="text-2xl font-bold">{data.clientCounts.nonLtd}</p>
                  </div>
                  <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {data.clientCounts.total > 0 ? Math.round((data.clientCounts.nonLtd / data.clientCounts.total) * 100) : 0}% of total
                </div>
              </CardContent>
            </Card>

            {/* VAT Enabled */}
            <Card className="h-full">
              <CardContent className="p-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">VAT Enabled</p>
                    <p className="text-2xl font-bold">{data.clientCounts.vat}</p>
                  </div>
                  <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Receipt className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {data.clientCounts.total > 0 ? Math.round((data.clientCounts.vat / data.clientCounts.total) * 100) : 0}% VAT registered
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Workload, Monthly Deadlines & Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Workload */}
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Team Workload</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.staffWorkload.map((staff) => {
                    const maxClients = Math.max(...data.staffWorkload.map(s => s.clientCount), 1)
                    const vatPercentage = staff.clientCount > 0 ? (staff.vatClients / staff.clientCount) * 100 : 0
                    const accountsPercentage = staff.clientCount > 0 ? (staff.accountsClients / staff.clientCount) * 100 : 0
                    const totalPercentage = (staff.clientCount / maxClients) * 100
                    
                    return (
                      <div key={staff.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {staff.role === 'PARTNER' && <Crown className="h-3 w-3 text-purple-600" />}
                            {staff.role === 'MANAGER' && <Shield className="h-3 w-3 text-blue-600" />}
                            {staff.role === 'STAFF' && <User className="h-3 w-3 text-gray-500" />}
                            <span className="font-medium">{staff.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {staff.vatClients}V • {staff.accountsClients}A
                            </span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                              {staff.clientCount}
                            </Badge>
                          </div>
                        </div>
                        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                          {/* Total workload background */}
                          <div 
                            className="absolute top-0 left-0 h-full bg-gray-300 rounded-full"
                            style={{ width: `${totalPercentage}%` }}
                          />
                          {/* VAT clients overlay */}
                          <div 
                            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                            style={{ width: `${(staff.vatClients / maxClients) * 100}%` }}
                          />
                          {/* Accounts clients overlay */}
                          <div 
                            className="absolute top-0 left-0 h-full bg-green-500 rounded-full ml-px"
                            style={{ 
                              width: `${(staff.accountsClients / maxClients) * 100}%`,
                              left: `${(staff.vatClients / maxClients) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-3 border-t">
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>VAT</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Accounts</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Deadlines Section */}
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="h-4 w-4" />
                  {data.monthName} Deadlines
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  This month's deadlines
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Accounts Due */}
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Accounts Due</p>
                    <p className="text-xs text-muted-foreground">Annual accounts</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-blue-600">{data.monthlyDeadlines.accounts}</p>
                  </div>
                </div>

                {/* VAT Returns Due */}
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Receipt className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">VAT Returns</p>
                    <p className="text-xs text-muted-foreground">Quarterly VAT</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-green-600">{data.monthlyDeadlines.vat}</p>
                  </div>
                </div>

                {/* Confirmations Due */}
                <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                  <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Confirmations</p>
                    <p className="text-xs text-muted-foreground">Company CS</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-orange-600">{data.monthlyDeadlines.cs}</p>
                  </div>
                </div>

                {/* Corporation Tax Due */}
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calculator className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Corporation Tax</p>
                    <p className="text-xs text-muted-foreground">CT600 returns</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-purple-600">{data.monthlyDeadlines.ct}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compact Deadlines Calendar */}
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-4 w-4" />
                  Upcoming Deadlines
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Next 7 days
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.upcomingDeadlines && data.upcomingDeadlines.length > 0 ? (
                  data.upcomingDeadlines.slice(0, 6).map((deadline) => (
                    <div
                      key={deadline.id}
                      className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        {getDeadlineTypeIcon(deadline.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{deadline.companyName}</p>
                        <p className="text-xs text-muted-foreground">{deadline.type}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-xs font-bold ${getDeadlineTypeColor(deadline.type)}`}>
                          {deadline.daysUntil === 0 ? 'Today' : 
                           deadline.daysUntil === 1 ? 'Tomorrow' : 
                           `${deadline.daysUntil}d`}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground text-xs py-4">
                    No upcoming deadlines
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </PageLayout>
  )
} 