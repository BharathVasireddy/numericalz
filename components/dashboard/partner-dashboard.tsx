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

  // No caching - real-time updates

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
        <div className="space-y-4 md:space-y-6">
          {/* Header */}
          <div className="px-4 lg:px-0">
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold">Partner Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of clients, team workload, and monthly deadlines
            </p>
          </div>

          {/* Client Overview - Mobile-First Responsive Grid */}
          <div className="px-4 lg:px-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Clients */}
              <Card className="h-full">
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Total Clients</p>
                      <p className="text-xl md:text-2xl font-bold">{data.clientCounts.total}</p>
                    </div>
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
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
                      <p className="text-xl md:text-2xl font-bold">{data.clientCounts.ltd}</p>
                    </div>
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {data.clientCounts.total > 0 
                      ? `${Math.round((data.clientCounts.ltd / data.clientCounts.total) * 100)}% of total`
                      : '0% of total'
                    }
                  </div>
                </CardContent>
              </Card>

              {/* Non-Limited */}
              <Card className="h-full">
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Non-Limited</p>
                      <p className="text-xl md:text-2xl font-bold">{data.clientCounts.nonLtd}</p>
                    </div>
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building className="h-4 w-4 md:h-5 md:w-5 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {data.clientCounts.total > 0 
                      ? `${Math.round((data.clientCounts.nonLtd / data.clientCounts.total) * 100)}% of total`
                      : '0% of total'
                    }
                  </div>
                </CardContent>
              </Card>

              {/* VAT Enabled */}
              <Card className="h-full">
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">VAT Enabled</p>
                      <p className="text-xl md:text-2xl font-bold">{data.clientCounts.vat}</p>
                    </div>
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Receipt className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {data.clientCounts.total > 0 
                      ? `${Math.round((data.clientCounts.vat / data.clientCounts.total) * 100)}% VAT registered`
                      : '0% VAT registered'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Team Workload and Monthly Deadlines - Mobile Stack */}
          <div className="px-4 lg:px-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Team Workload */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Users className="h-4 w-4 md:h-5 md:w-5" />
                    Team Workload
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {data.staffWorkload.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No staff workload data available
                      </p>
                    ) : (
                      data.staffWorkload.map((staff) => (
                        <div key={staff.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {getRoleIcon(staff.role)}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">{staff.name}</div>
                              <Badge 
                                variant={getRoleBadgeVariant(staff.role)} 
                                className="text-xs h-5 px-2"
                              >
                                {staff.role}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <div className="text-sm font-semibold">
                              {staff.vatClients}V • {staff.accountsClients}A
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {staff.clientCount} total
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Deadlines */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                    {data.monthName} Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-blue-50 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <FileText className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">Accounts</span>
                      </div>
                      <div className="text-lg font-bold text-blue-700">{data.monthlyDeadlines.accounts}</div>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-green-50 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Receipt className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600">VAT</span>
                      </div>
                      <div className="text-lg font-bold text-green-700">{data.monthlyDeadlines.vat}</div>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-orange-50 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle className="h-3 w-3 text-orange-600" />
                        <span className="text-xs font-medium text-orange-600">CS</span>
                      </div>
                      <div className="text-lg font-bold text-orange-700">{data.monthlyDeadlines.cs}</div>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-purple-50 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Calculator className="h-3 w-3 text-purple-600" />
                        <span className="text-xs font-medium text-purple-600">CT</span>
                      </div>
                      <div className="text-lg font-bold text-purple-700">{data.monthlyDeadlines.ct}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Upcoming Deadlines - Full Width Mobile */}
          {data.upcomingDeadlines && data.upcomingDeadlines.length > 0 && (
            <div className="px-4 lg:px-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {data.upcomingDeadlines.slice(0, 8).map((deadline) => (
                      <div key={deadline.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {getDeadlineTypeIcon(deadline.type)}
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{deadline.companyName}</div>
                            <div className={`text-xs ${getDeadlineTypeColor(deadline.type)}`}>
                              {deadline.type}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-sm font-medium">
                            {new Date(deadline.date).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: 'short' 
                            })}
                          </div>
                          <div className={`text-xs ${
                            deadline.daysUntil <= 7 ? 'text-red-600 font-medium' : 
                            deadline.daysUntil <= 14 ? 'text-orange-600' : 'text-muted-foreground'
                          }`}>
                            {deadline.daysUntil === 0 ? 'Today' : 
                             deadline.daysUntil === 1 ? '1 day' : 
                             `${deadline.daysUntil} days`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </PageContent>
    </PageLayout>
  )
} 