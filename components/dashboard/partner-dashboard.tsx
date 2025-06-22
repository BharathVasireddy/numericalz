'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
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
  TrendingUp, 
  Activity,
  Target,
  CheckCircle
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
  }>
  monthlyDeadlines: {
    accounts: number
    vat: number
    cs: number
    ct: number
  }
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
        <PageHeader title="Partner Dashboard" />
        <PageContent>
          <div className="space-y-6">
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-lg bg-muted h-32" />
                ))}
              </div>
            </div>
          </div>
        </PageContent>
      </PageLayout>
    )
  }

  if (!data || !data.clientCounts || !data.staffWorkload || !data.monthlyDeadlines) {
    return (
      <PageLayout maxWidth="xl">
        <PageHeader title="Partner Dashboard" />
        <PageContent>
          <div className="text-center text-muted-foreground">
            {data ? 'Invalid dashboard data structure' : 'Failed to load dashboard data'}
          </div>
        </PageContent>
      </PageLayout>
    )
  }

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'partner': return <Crown className="h-4 w-4 text-purple-600" />
      case 'manager': return <Shield className="h-4 w-4 text-blue-600" />
      default: return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'partner': return 'default'
      case 'manager': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <PageLayout maxWidth="xl">
      <PageHeader title="Partner Dashboard" />

      <PageContent>
        <div className="content-sections">
          {/* Client Overview Section */}
          <section>
            <div className="page-header">
              <h2 className="text-xl font-semibold">Client Overview</h2>
              <p className="text-sm text-muted-foreground">Overview of all clients in the system</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Clients */}
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                      <p className="text-3xl font-bold">{data.clientCounts.total}</p>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 font-medium">8.5%</span>
                    <span className="text-muted-foreground ml-1">from last month</span>
                  </div>
            </CardContent>
          </Card>

              {/* Ltd Companies */}
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Ltd Companies</p>
                      <p className="text-3xl font-bold">{data.clientCounts.ltd}</p>
                    </div>
                    <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <Activity className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-blue-600 font-medium">12.3%</span>
                    <span className="text-muted-foreground ml-1">of total</span>
                  </div>
            </CardContent>
          </Card>

              {/* Non-Limited */}
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Non-Limited</p>
                      <p className="text-3xl font-bold">{data.clientCounts.nonLtd}</p>
                    </div>
                    <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Building className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-sm">
                    <Target className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-orange-600 font-medium">5.2%</span>
                    <span className="text-muted-foreground ml-1">growth</span>
                  </div>
            </CardContent>
          </Card>

              {/* VAT Clients */}
              <Card className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">VAT Clients</p>
                      <p className="text-3xl font-bold">{data.clientCounts.vat}</p>
            </div>
                    <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                  <div className="mt-4 flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-600 font-medium">15.8%</span>
                    <span className="text-muted-foreground ml-1">registered</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Team Workload & Monthly Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Workload Section */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Workload
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Current client distribution across team members
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.staffWorkload.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover-lift"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-background rounded-lg flex items-center justify-center shadow-sm">
                          {getRoleIcon(member.role)}
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{member.clientCount}</p>
                        <p className="text-xs text-muted-foreground">clients</p>
                      </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </section>

            {/* Monthly Deadlines Section */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    This Month's Deadlines
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Overview of upcoming deadlines for current month
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Accounts Due */}
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Accounts Due</p>
                      <p className="text-sm text-muted-foreground">Annual accounts filings</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{data.monthlyDeadlines.accounts}</p>
                    </div>
                  </div>

                  {/* VAT Returns Due */}
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                    <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">VAT Returns Due</p>
                      <p className="text-sm text-muted-foreground">Quarterly VAT submissions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{data.monthlyDeadlines.vat}</p>
                    </div>
                  </div>

                  {/* Confirmations Due */}
                  <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg">
                    <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Confirmations Due</p>
                      <p className="text-sm text-muted-foreground">Company confirmations</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">{data.monthlyDeadlines.cs}</p>
                    </div>
                  </div>

                  {/* Corporation Tax Due */}
                  <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Calculator className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Corporation Tax Due</p>
                      <p className="text-sm text-muted-foreground">CT600 submissions</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-600">{data.monthlyDeadlines.ct}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
              </div>
        </div>
      </PageContent>
    </PageLayout>
  )
} 