import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Users, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  CheckCircle, 
  Calendar,
  Clock,
  Plus,
  Crown,
  Shield,
  User,
  Settings,
  Download
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Partner Dashboard - Numericalz',
  description: 'Partner dashboard with complete system oversight and management controls',
}

/**
 * Partner dashboard page with complete system oversight
 * 
 * Features:
 * - Complete system analytics and metrics
 * - User management overview
 * - Client portfolio analytics
 * - Revenue and performance tracking
 * - System administration controls
 * - Data export capabilities (Partner exclusive)
 */
export default async function PartnerDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'PARTNER') {
    redirect('/dashboard')
  }

  try {
    // Fetch comprehensive dashboard data
    const [
      clientTypeCounts,
      totalClients,
      activeClients,
      inactiveClients,
      totalUsers,
      usersByRole,
      recentClients,
      recentUsers
    ] = await Promise.all([
      // Client type distribution
      db.client.groupBy({
        by: ['companyType'],
        where: { isActive: true },
        _count: { companyType: true }
      }).catch(() => []),
      
      // Client counts
      db.client.count().catch(() => 0),
      db.client.count({ where: { isActive: true } }).catch(() => 0),
      db.client.count({ where: { isActive: false } }).catch(() => 0),
      
      // User counts
      db.user.count({ where: { isActive: true } }).catch(() => 0),
      db.user.groupBy({
        by: ['role'],
        where: { isActive: true },
        _count: { role: true }
      }).catch(() => []),
      
      // Recent data
      db.client.findMany({
        include: {
          assignedUser: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }).catch(() => []),
      
      db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          lastLoginAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }).catch(() => [])
    ])

    // Process client type counts
    const typeCounts = {
      LIMITED_COMPANY: 0,
      NON_LIMITED_COMPANY: 0,
      DIRECTOR: 0,
      SUB_CONTRACTOR: 0
    }
    
    clientTypeCounts.forEach((item: any) => {
      if (item.companyType in typeCounts) {
        typeCounts[item.companyType as keyof typeof typeCounts] = item._count.companyType
      }
    })

    // Process user role counts
    const roleCounts = {
      PARTNER: 0,
      MANAGER: 0,
      STAFF: 0
    }
    
    usersByRole.forEach((item: any) => {
      if (item.role in roleCounts) {
        roleCounts[item.role as keyof typeof roleCounts] = item._count.role
      }
    })

    return (
      <PageLayout maxWidth="2xl">
        <PageHeader 
          title="Partner Dashboard"
          description="Complete system oversight and management controls"
        >
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/clients/export" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/clients/add" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Client
              </Link>
            </Button>
          </div>
        </PageHeader>
        
        <PageContent>
          {/* System Overview Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  {activeClients} active, {inactiveClients} inactive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Crown className="h-3 w-3" />
                  {roleCounts.PARTNER}
                  <Shield className="h-3 w-3 ml-1" />
                  {roleCounts.MANAGER}
                  <User className="h-3 w-3 ml-1" />
                  {roleCounts.STAFF}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ltd Companies</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{typeCounts.LIMITED_COMPANY}</div>
                <p className="text-xs text-muted-foreground">
                  {totalClients > 0 ? Math.round((typeCounts.LIMITED_COMPANY / totalClients) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Non-Ltd Companies</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{typeCounts.NON_LIMITED_COMPANY}</div>
                <p className="text-xs text-muted-foreground">
                  {totalClients > 0 ? Math.round((typeCounts.NON_LIMITED_COMPANY / totalClients) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            {/* Client Portfolio Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Client Portfolio Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of client types and distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Limited Companies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{typeCounts.LIMITED_COMPANY}</span>
                      <Badge variant="secondary" className="text-xs">
                        {totalClients > 0 ? Math.round((typeCounts.LIMITED_COMPANY / totalClients) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Non-Limited Companies</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{typeCounts.NON_LIMITED_COMPANY}</span>
                      <Badge variant="secondary" className="text-xs">
                        {totalClients > 0 ? Math.round((typeCounts.NON_LIMITED_COMPANY / totalClients) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm">Directors</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{typeCounts.DIRECTOR}</span>
                      <Badge variant="secondary" className="text-xs">
                        {totalClients > 0 ? Math.round((typeCounts.DIRECTOR / totalClients) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">Sub Contractors</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{typeCounts.SUB_CONTRACTOR}</span>
                      <Badge variant="secondary" className="text-xs">
                        {totalClients > 0 ? Math.round((typeCounts.SUB_CONTRACTOR / totalClients) * 100) : 0}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Partner Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Partner Controls
                </CardTitle>
                <CardDescription>
                  Exclusive partner-level management actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard/clients" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Manage All Clients
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard/staff" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Staff Management
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard/clients/export" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export Client Data
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard/clients/vat-dt" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    VAT Deadline Tracker
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    System Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            {/* Recent Clients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Clients
                </CardTitle>
                <CardDescription>
                  Latest client additions to the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentClients.length > 0 ? (
                  <div className="space-y-3">
                    {recentClients.map((client: any) => (
                      <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{client.companyName}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.clientCode} • {client.companyType.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {client.assignedUser ? (
                            <p className="text-xs text-muted-foreground">
                              Assigned to {client.assignedUser.name}
                            </p>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Unassigned
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(client.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent clients</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Recent Team Members
                </CardTitle>
                <CardDescription>
                  Latest user additions and activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentUsers.length > 0 ? (
                  <div className="space-y-3">
                    {recentUsers.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            {user.role === 'PARTNER' ? (
                              <Crown className="h-4 w-4 text-purple-600" />
                            ) : user.role === 'MANAGER' ? (
                              <Shield className="h-4 w-4 text-blue-600" />
                            ) : (
                              <User className="h-4 w-4 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant="secondary"
                            className={
                              user.role === 'PARTNER' 
                                ? 'bg-purple-100 text-purple-800 border-purple-200' 
                                : user.role === 'MANAGER' 
                                  ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                            }
                          >
                            {user.role}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {user.lastLoginAt 
                              ? `Last: ${new Date(user.lastLoginAt).toLocaleDateString()}`
                              : 'Never logged in'
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No recent users</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </PageContent>
      </PageLayout>
    )

  } catch (error) {
    console.error('Error loading partner dashboard:', error)
    
    // Return fallback dashboard
    return (
      <PageLayout maxWidth="2xl">
        <PageHeader 
          title="Partner Dashboard"
          description="Complete system oversight and management controls"
        />
        <PageContent>
          <Card>
            <CardHeader>
              <CardTitle>Error Loading Dashboard</CardTitle>
              <CardDescription>
                There was an error loading the dashboard data. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/clients">
                  Go to Clients
                </Link>
              </Button>
            </CardContent>
          </Card>
        </PageContent>
      </PageLayout>
    )
  }
} 