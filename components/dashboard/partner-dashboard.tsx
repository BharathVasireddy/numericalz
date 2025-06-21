'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building,
  Users, 
  RefreshCw,
  Crown,
  Shield,
  User,
  Building2,
  Receipt,
  FileText,
  Calendar,
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  UserPlus,
  Target,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

// TailAdmin Badge Component (exactly matching their design)
interface TailAdminBadgeProps {
  variant?: 'light' | 'solid'
  color?: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark'
  size?: 'sm' | 'md'
  children: React.ReactNode
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

const TailAdminBadge = ({ 
  variant = 'light', 
  color = 'primary', 
  size = 'md', 
  children, 
  startIcon, 
  endIcon 
}: TailAdminBadgeProps) => {
  const baseStyles = "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium"
  
  const sizeStyles = {
    sm: "text-xs",
    md: "text-sm",
  }
  
  const variants = {
    light: {
      primary: "bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400",
      success: "bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-500",
      error: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-500",
      warning: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
      info: "bg-cyan-50 text-cyan-500 dark:bg-cyan-500/15 dark:text-cyan-500",
      light: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80",
      dark: "bg-gray-500 text-white dark:bg-white/5 dark:text-white",
    },
    solid: {
      primary: "bg-blue-500 text-white dark:text-white",
      success: "bg-green-500 text-white dark:text-white",
      error: "bg-red-500 text-white dark:text-white",
      warning: "bg-orange-500 text-white dark:text-white",
      info: "bg-cyan-500 text-white dark:text-white",
      light: "bg-gray-400 dark:bg-white/5 text-white dark:text-white/80",
      dark: "bg-gray-700 text-white dark:text-white",
    }
  }
  
  const sizeClass = sizeStyles[size]
  const colorStyles = variants[variant][color]
  
  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  )
}

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
  const [viewMode, setViewMode] = useState<'simple' | 'tailadmin'>('tailadmin')

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
      <PageLayout maxWidth="2xl">
        <PageHeader title="Partner Dashboard" />
        <PageContent>
          <div className="space-y-6">
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-gray-200 h-32" />
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
      <PageLayout maxWidth="2xl">
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

  // TailAdmin Style Dashboard
  return (
    <PageLayout maxWidth="2xl">
      <PageHeader title="Partner Dashboard">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'simple' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('simple')}
          >
            Simple View
          </Button>
          <Button
            variant={viewMode === 'tailadmin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tailadmin')}
          >
            TailAdmin Style
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </PageHeader>
      
      <PageContent>
        {viewMode === 'tailadmin' ? (
          // TailAdmin Style Implementation
          <div className="grid grid-cols-12 gap-4 md:gap-6">
            {/* Client Overview Section - Exactly matching TailAdmin EcommerceMetrics */}
            <div className="col-span-12 space-y-6 xl:col-span-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
                {/* Total Clients - TailAdmin Style Card */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                    <Users className="text-gray-800 size-6 dark:text-white/90" />
                  </div>
                  <div className="flex items-end justify-between mt-5">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Total Clients
                      </span>
                      <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                        {data.clientCounts.total}
                      </h4>
                    </div>
                    <TailAdminBadge color="success" startIcon={<TrendingUp className="h-3 w-3" />}>
                      8.5%
                    </TailAdminBadge>
                  </div>
                </div>

                {/* Ltd Companies */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                    <Building2 className="text-gray-800 size-6 dark:text-white/90" />
                  </div>
                  <div className="flex items-end justify-between mt-5">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Ltd Companies
                      </span>
                      <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                        {data.clientCounts.ltd}
                      </h4>
                    </div>
                    <TailAdminBadge color="info" startIcon={<Activity className="h-3 w-3" />}>
                      12.3%
                    </TailAdminBadge>
                  </div>
                </div>

                {/* Non-Limited */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                    <Building className="text-gray-800 size-6 dark:text-white/90" />
                  </div>
                  <div className="flex items-end justify-between mt-5">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Non-Limited
                      </span>
                      <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                        {data.clientCounts.nonLtd}
                      </h4>
                    </div>
                    <TailAdminBadge color="warning" startIcon={<Target className="h-3 w-3" />}>
                      5.2%
                    </TailAdminBadge>
                  </div>
                </div>

                {/* VAT Clients */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                    <Receipt className="text-gray-800 size-6 dark:text-white/90" />
                  </div>
                  <div className="flex items-end justify-between mt-5">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        VAT Clients
                      </span>
                      <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                        {data.clientCounts.vat}
                      </h4>
                    </div>
                    <TailAdminBadge color="success" startIcon={<CheckCircle className="h-3 w-3" />}>
                      15.8%
                    </TailAdminBadge>
                  </div>
                </div>
              </div>

              {/* Monthly Deadlines Section */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    This Month's Deadlines
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Overview of upcoming deadlines for current month
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Accounts Due */}
                  <div className="p-4 bg-gray-50 rounded-xl dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg dark:bg-blue-500/20">
                        <FileText className="text-blue-600 size-5 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Accounts</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white/90">
                          {data.monthlyDeadlines.accounts}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* VAT Returns Due */}
                  <div className="p-4 bg-gray-50 rounded-xl dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg dark:bg-green-500/20">
                        <Receipt className="text-green-600 size-5 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">VAT Returns</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white/90">
                          {data.monthlyDeadlines.vat}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Confirmations Due */}
                  <div className="p-4 bg-gray-50 rounded-xl dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg dark:bg-orange-500/20">
                        <CheckCircle className="text-orange-600 size-5 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Confirmations</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white/90">
                          {data.monthlyDeadlines.cs}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Corporation Tax Due */}
                  <div className="p-4 bg-gray-50 rounded-xl dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg dark:bg-purple-500/20">
                        <Calculator className="text-purple-600 size-5 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Corp Tax</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white/90">
                          {data.monthlyDeadlines.ct}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff Workload Section */}
            <div className="col-span-12 xl:col-span-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    Team Workload
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Current client distribution across team members
                  </p>
                </div>

                <div className="space-y-4">
                  {data.staffWorkload.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl dark:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm dark:bg-gray-700">
                          {getRoleIcon(member.role)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white/90">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                            {member.role}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800 dark:text-white/90">
                          {member.clientCount}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          clients
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Simple View (Original)
          <div className="space-y-6">
            {/* Client Overview */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Client Overview</h2>
              <div className="partner-metrics-grid">
                <Card className="partner-metric-card">
                  <CardContent className="partner-metric-content">
                    <div className="partner-metric-header">
                      <Users className="partner-metric-icon text-blue-600" />
                      <span className="partner-metric-label">Total Clients</span>
                    </div>
                    <div className="partner-metric-value">{data.clientCounts.total}</div>
                  </CardContent>
                </Card>

                <Card className="partner-metric-card">
                  <CardContent className="partner-metric-content">
                    <div className="partner-metric-header">
                      <Building2 className="partner-metric-icon text-green-600" />
                      <span className="partner-metric-label">Ltd Companies</span>
                    </div>
                    <div className="partner-metric-value">{data.clientCounts.ltd}</div>
                  </CardContent>
                </Card>

                <Card className="partner-metric-card">
                  <CardContent className="partner-metric-content">
                    <div className="partner-metric-header">
                      <Building className="partner-metric-icon text-orange-600" />
                      <span className="partner-metric-label">Non-Limited</span>
                    </div>
                    <div className="partner-metric-value">{data.clientCounts.nonLtd}</div>
                  </CardContent>
                </Card>

                <Card className="partner-metric-card">
                  <CardContent className="partner-metric-content">
                    <div className="partner-metric-header">
                      <Receipt className="partner-metric-icon text-purple-600" />
                      <span className="partner-metric-label">VAT Clients</span>
                    </div>
                    <div className="partner-metric-value">{data.clientCounts.vat}</div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Staff Workload */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Staff Workload</h2>
              <div className="partner-staff-grid">
                {data.staffWorkload.map((member) => (
                  <Card key={member.id} className="partner-staff-card">
                    <CardContent className="partner-staff-content">
                      <div className="partner-staff-header">
                        {getRoleIcon(member.role)}
                        <div className="partner-staff-info">
                          <div className="partner-staff-name">{member.name}</div>
                          <div className="partner-staff-role">{member.role}</div>
                        </div>
                      </div>
                      <div className="partner-staff-count">{member.clientCount}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Monthly Deadlines */}
            <section>
              <h2 className="text-lg font-semibold mb-4">Monthly Deadlines</h2>
              <div className="partner-deadlines-grid">
                <Card className="partner-deadline-card">
                  <CardContent className="partner-deadline-content">
                    <div className="partner-deadline-header">
                      <FileText className="partner-deadline-icon text-blue-600" />
                      <span className="partner-deadline-label">Accounts</span>
                    </div>
                    <div className="partner-deadline-value">{data.monthlyDeadlines.accounts}</div>
                  </CardContent>
                </Card>

                <Card className="partner-deadline-card">
                  <CardContent className="partner-deadline-content">
                    <div className="partner-deadline-header">
                      <Receipt className="partner-deadline-icon text-green-600" />
                      <span className="partner-deadline-label">VAT Returns</span>
                    </div>
                    <div className="partner-deadline-value">{data.monthlyDeadlines.vat}</div>
                  </CardContent>
                </Card>

                <Card className="partner-deadline-card">
                  <CardContent className="partner-deadline-content">
                    <div className="partner-deadline-header">
                      <CheckCircle className="partner-deadline-icon text-orange-600" />
                      <span className="partner-deadline-label">Confirmations</span>
                    </div>
                    <div className="partner-deadline-value">{data.monthlyDeadlines.cs}</div>
                  </CardContent>
                </Card>

                <Card className="partner-deadline-card">
                  <CardContent className="partner-deadline-content">
                    <div className="partner-deadline-header">
                      <Calculator className="partner-deadline-icon text-purple-600" />
                      <span className="partner-deadline-label">Corp Tax</span>
                    </div>
                    <div className="partner-deadline-value">{data.monthlyDeadlines.ct}</div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        )}
      </PageContent>
    </PageLayout>
  )
} 