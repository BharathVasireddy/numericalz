'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PageLayout, PageContent } from '@/components/layout/page-layout'
import { PendingToChaseWidget } from './widgets/pending-to-chase-widget'
import { VATUnassignedWidget } from './widgets/vat-unassigned-widget'
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

  useEffect(() => {
    fetchData()
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
        window.location.href = '/dashboard/clients/vat-dt?filter=unassigned&tab=all'
        break
    }
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

  if (loading) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Partner Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of clients, team workload, and monthly deadlines
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
            </div>
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-lg bg-muted h-64" />
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!data || !data.clientCounts || !data.unassignedClients || !data.staffWorkload || !data.monthlyDeadlines) {
    return (
      <PageLayout maxWidth="2xl">
        <div className="space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Partner Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
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

  return (
    <PageLayout maxWidth="2xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Partner Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of clients, team workload, and monthly deadlines
          </p>
        </div>

        {/* Main Dashboard Grid - Column-based Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column - Client Overview & Unassigned */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Client Overview Widget */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Client Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <div className="flex items-center justify-between">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-lg font-bold text-blue-700">{data.clientCounts.total}</span>
                    </div>
                    <p className="text-xs text-blue-600 font-medium mt-1">Total Clients</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-green-50">
                    <div className="flex items-center justify-between">
                      <Building2 className="h-4 w-4 text-green-600" />
                      <span className="text-lg font-bold text-green-700">{data.clientCounts.ltd}</span>
                    </div>
                    <p className="text-xs text-green-600 font-medium mt-1">Ltd Companies</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-orange-50">
                    <div className="flex items-center justify-between">
                      <Building className="h-4 w-4 text-orange-600" />
                      <span className="text-lg font-bold text-orange-700">{data.clientCounts.nonLtd}</span>
                    </div>
                    <p className="text-xs text-orange-600 font-medium mt-1">Non-Limited</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-purple-50">
                    <div className="flex items-center justify-between">
                      <Receipt className="h-4 w-4 text-purple-600" />
                      <span className="text-lg font-bold text-purple-700">{data.clientCounts.vat}</span>
                    </div>
                    <p className="text-xs text-purple-600 font-medium mt-1">VAT Enabled</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unassigned Clients Widget */}
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    Unassigned Clients
                  </CardTitle>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                    {data.unassignedClients.ltd + data.unassignedClients.nonLtd + data.unassignedClients.vat} total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div 
                    className={`flex items-center justify-between p-2 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
                      data.unassignedClients.ltd > 0 
                        ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer' 
                        : 'opacity-60'
                    }`}
                    onClick={() => data.unassignedClients.ltd > 0 && handleUnassignedNavigation('ltd')}
                  >
                    <span className="text-sm text-amber-800">Ltd Accounts</span>
                    <span className="font-bold text-amber-900">{data.unassignedClients.ltd}</span>
                  </div>
                  
                  <div 
                    className={`flex items-center justify-between p-2 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
                      data.unassignedClients.nonLtd > 0 
                        ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer' 
                        : 'opacity-60'
                    }`}
                    onClick={() => data.unassignedClients.nonLtd > 0 && handleUnassignedNavigation('nonLtd')}
                  >
                    <span className="text-sm text-amber-800">Non-Ltd Accounts</span>
                    <span className="font-bold text-amber-900">{data.unassignedClients.nonLtd}</span>
                  </div>
                  
                  <div 
                    className={`flex items-center justify-between p-2 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
                      data.unassignedClients.vat > 0 
                        ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer' 
                        : 'opacity-60'
                    }`}
                    onClick={() => data.unassignedClients.vat > 0 && handleUnassignedNavigation('vat')}
                  >
                    <span className="text-sm text-amber-800">VAT Returns</span>
                    <span className="font-bold text-amber-900">{data.unassignedClients.vat}</span>
                  </div>
                </div>
                
                {(data.unassignedClients.ltd > 0 || data.unassignedClients.nonLtd > 0 || data.unassignedClients.vat > 0) && (
                  <div className="pt-2 border-t border-amber-200">
                    <p className="text-xs text-amber-700 text-center">
                      Click on any section above to assign clients
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Deadlines Widget */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {data.monthName} Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <FileText className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">Accounts</span>
                    </div>
                    <div className="text-xl font-bold text-blue-700">{data.monthlyDeadlines.accounts}</div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-green-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Receipt className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-medium text-green-600">VAT</span>
                    </div>
                    <div className="text-xl font-bold text-green-700">{data.monthlyDeadlines.vat}</div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-orange-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <CheckCircle className="h-3 w-3 text-orange-600" />
                      <span className="text-xs font-medium text-orange-600">Confirmations</span>
                    </div>
                    <div className="text-xl font-bold text-orange-700">{data.monthlyDeadlines.cs}</div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-purple-50 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Calculator className="h-3 w-3 text-purple-600" />
                      <span className="text-xs font-medium text-purple-600">Corporation Tax</span>
                    </div>
                    <div className="text-xl font-bold text-purple-700">{data.monthlyDeadlines.ct}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Team Workload */}
          <div className="lg:col-span-4 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Workload
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.staffWorkload.map((staff) => {
                    const totalClients = staff.vatClients + staff.accountsClients
                    const hasWork = totalClients > 0
                    
                    return (
                      <div key={staff.id} className={`p-2 rounded-lg border transition-all duration-200 ${
                        hasWork ? 'bg-slate-50 border-slate-200' : 'bg-gray-50 border-gray-200 opacity-70'
                      }`}>
                        {/* Staff Header - More Compact */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {getRoleIcon(staff.role)}
                            <span className="text-sm font-medium truncate">{staff.name}</span>
                            <Badge variant={getRoleBadgeVariant(staff.role)} className="text-xs px-1 py-0">
                              {staff.role.charAt(0)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {staff.vatClients > 0 && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 border border-blue-200">
                                <Receipt className="h-3 w-3 text-blue-600" />
                                <span className="text-xs font-bold text-blue-800">{staff.vatClients}</span>
                              </div>
                            )}
                            {staff.accountsClients > 0 && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 border border-green-200">
                                <FileText className="h-3 w-3 text-green-600" />
                                <span className="text-xs font-bold text-green-800">{staff.accountsClients}</span>
                              </div>
                            )}
                            {!hasWork && (
                              <span className="text-xs text-gray-500 px-2">No assignments</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {data.staffWorkload.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Users className="h-6 w-6 mx-auto mb-1 opacity-50" />
                      <p className="text-sm">No staff members found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - VAT Unassigned (Top Priority) & Pending to Chase */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* VAT Unassigned Widget - Moved to Top */}
            <VATUnassignedWidget />
            
            {/* Pending to Chase Widget */}
            <PendingToChaseWidget userRole="PARTNER" userId={userId} />
            
            {data.upcomingDeadlines && data.upcomingDeadlines.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.upcomingDeadlines.slice(0, 10).map((deadline) => (
                      <div key={deadline.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
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
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  )
} 