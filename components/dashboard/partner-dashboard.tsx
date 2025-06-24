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
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkflowReviewNotificationWidget } from './widgets/workflow-review-notification-widget'

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
  unassignedClients: {
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
  const [workflowReviews, setWorkflowReviews] = useState<any[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/partner/${userId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        console.error('Failed to fetch dashboard data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkflowReviews = async () => {
    try {
      setReviewsLoading(true)
      const response = await fetch('/api/notifications/workflow-reviews?role=PARTNER')
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
    fetchData()
    fetchWorkflowReviews()
  }

  useEffect(() => {
    fetchData()
    fetchWorkflowReviews()
  }, [userId])

  // Enhanced navigation handlers for unassigned clients
  const handleUnassignedNavigation = (type: 'ltd' | 'nonLtd' | 'vat') => {
    switch (type) {
      case 'ltd':
        window.location.href = '/dashboard/clients/ltd-companies?filter=unassigned'
        break
      case 'nonLtd':
        window.location.href = '/dashboard/clients/non-ltd-companies?filter=unassigned'
        break
      case 'vat':
        // For VAT, we need to navigate to the VAT deadline table with unassigned filter
        // Since unassigned VAT clients might be in different months, we'll go to the main page
        // and let the user filter by unassigned, then they can switch months as needed
        window.location.href = '/dashboard/clients/vat-dt?filter=unassigned&tab=all'
        break
    }
  }

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

  if (!data || !data.clientCounts || !data.unassignedClients || !data.staffWorkload || !data.monthlyDeadlines) {
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

          {/* Workflow Review Notifications - Top Priority */}
          {workflowReviews.length > 0 && (
            <div className="px-4 lg:px-0">
              <WorkflowReviewNotificationWidget
                items={workflowReviews}
                userRole="PARTNER"
                onReviewComplete={handleReviewComplete}
              />
            </div>
          )}

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

          {/* Unassigned Clients Widget - Enhanced Clickable */}
          <div className="px-4 lg:px-0">
            <Card className="border-amber-200 bg-amber-50/50 hover:bg-amber-50/70 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                    <CardTitle className="text-sm font-medium text-amber-800">
                      Unassigned Clients
                    </CardTitle>
                  </div>
                  <div className="text-xs text-amber-700">
                    {data.unassignedClients.ltd + data.unassignedClients.nonLtd + data.unassignedClients.vat} total
                  </div>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  Click on any section below to view and assign clients
                </p>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="grid grid-cols-3 gap-2">
                  {/* Unassigned Ltd Companies - Clickable */}
                  <div 
                    className={`text-center p-3 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
                      data.unassignedClients.ltd > 0 
                        ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer hover:shadow-sm' 
                        : 'opacity-60'
                    }`}
                    onClick={() => data.unassignedClients.ltd > 0 && handleUnassignedNavigation('ltd')}
                  >
                    <div className="text-xl font-bold text-amber-900">
                      {data.unassignedClients.ltd}
                    </div>
                    <div className="text-xs text-amber-700 leading-tight">
                      Ltd Accounts
                    </div>
                    {data.unassignedClients.ltd > 0 && (
                      <div className="text-xs text-amber-600 mt-1 font-medium">
                        Click to assign →
                      </div>
                    )}
                  </div>

                  {/* Unassigned Non-Ltd Companies - Clickable */}
                  <div 
                    className={`text-center p-3 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
                      data.unassignedClients.nonLtd > 0 
                        ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer hover:shadow-sm' 
                        : 'opacity-60'
                    }`}
                    onClick={() => data.unassignedClients.nonLtd > 0 && handleUnassignedNavigation('nonLtd')}
                  >
                    <div className="text-xl font-bold text-amber-900">
                      {data.unassignedClients.nonLtd}
                    </div>
                    <div className="text-xs text-amber-700 leading-tight">
                      Non-Ltd Accounts
                    </div>
                    {data.unassignedClients.nonLtd > 0 && (
                      <div className="text-xs text-amber-600 mt-1 font-medium">
                        Click to assign →
                      </div>
                    )}
                  </div>

                  {/* Unassigned VAT Clients - Clickable with Special Handling */}
                  <div 
                    className={`text-center p-3 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
                      data.unassignedClients.vat > 0 
                        ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer hover:shadow-sm' 
                        : 'opacity-60'
                    }`}
                    onClick={() => data.unassignedClients.vat > 0 && handleUnassignedNavigation('vat')}
                  >
                    <div className="text-xl font-bold text-amber-900">
                      {data.unassignedClients.vat}
                    </div>
                    <div className="text-xs text-amber-700 leading-tight">
                      VAT Returns
                    </div>
                    {data.unassignedClients.vat > 0 && (
                      <div className="text-xs text-amber-600 mt-1 font-medium">
                        Click to assign →
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Enhanced Action Message */}
                {(data.unassignedClients.ltd > 0 || data.unassignedClients.nonLtd > 0 || data.unassignedClients.vat > 0) && (
                  <div className="mt-3 pt-2 border-t border-amber-200">
                    <div className="text-xs text-amber-700 text-center">
                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                      These clients need immediate assignment for proper workflow management
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Team Workload - Bar Chart Visualization */}
          <div className="px-4 lg:px-0">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <Users className="h-4 w-4 md:h-5 md:w-5" />
                  Team Workload Distribution
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Client assignments by staff member and work type
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.staffWorkload.map((staff) => {
                    const maxClients = Math.max(...data.staffWorkload.map(s => s.vatClients + s.accountsClients))
                    const totalClients = staff.vatClients + staff.accountsClients
                    const vatPercentage = maxClients > 0 ? (staff.vatClients / maxClients) * 100 : 0
                    const accountsPercentage = maxClients > 0 ? (staff.accountsClients / maxClients) * 100 : 0
                    
                    return (
                      <div key={staff.id} className="space-y-2">
                        {/* Staff Member Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {staff.role === 'PARTNER' && <Crown className="h-3 w-3 text-yellow-600" />}
                              {staff.role === 'MANAGER' && <Shield className="h-3 w-3 text-blue-600" />}
                              {staff.role === 'STAFF' && <User className="h-3 w-3 text-gray-600" />}
                              <span className="text-sm font-medium">{staff.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              ({staff.role.toLowerCase()})
                            </span>
                          </div>
                          <div className="text-sm font-medium text-right">
                            <span className="text-foreground">{totalClients}</span>
                            <span className="text-xs text-muted-foreground ml-1">total</span>
                          </div>
                        </div>
                        
                        {/* Bar Chart */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 h-6">
                            {/* Background bar */}
                            <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                              {/* VAT clients bar */}
                              <div 
                                className="absolute left-0 top-0 h-full bg-blue-500 rounded-l-full transition-all duration-300"
                                style={{ width: `${vatPercentage}%` }}
                              />
                              {/* Accounts clients bar */}
                              <div 
                                className="absolute left-0 top-0 h-full bg-green-500 rounded-r-full transition-all duration-300 opacity-70"
                                style={{ 
                                  width: `${accountsPercentage}%`,
                                  marginLeft: `${vatPercentage}%`
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Legend */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-muted-foreground">VAT: {staff.vatClients}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-muted-foreground">Accounts: {staff.accountsClients}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {data.staffWorkload.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No staff members found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Deadlines */}
          <div className="px-4 lg:px-0">
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