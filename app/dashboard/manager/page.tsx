import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Manager Dashboard - Numericalz',
  description: 'Manager dashboard with comprehensive analytics and team management',
}

/**
 * Manager dashboard page with full analytics and management features
 * 
 * Features:
 * - Complete system overview
 * - Team performance metrics
 * - Client analytics
 * - Task management overview
 * - Quick actions for managers
 */
export default async function ManagerDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'MANAGER') {
    redirect('/dashboard/staff')
  }

  try {
    // Fetch dashboard data with error handling
    const clientTypeCounts = await db.client.groupBy({
      by: ['companyType'],
      where: {
        isActive: true
      },
      _count: {
        companyType: true
      }
    }).catch((error: unknown) => {
      console.error('Error fetching client type counts:', error)
      return []
    })

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

    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            {/* Header */}
            <div className="page-header">
              <h1 className="text-xl md:text-2xl font-bold">
                Manager Dashboard
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                Welcome back, {session.user.name}! Here's your complete system overview.
              </p>
            </div>

            {/* Client Type Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Ltd Companies
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">{typeCounts.LIMITED_COMPANY}</div>
                </CardContent>
              </Card>

              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Non Ltd Companies
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">{typeCounts.NON_LIMITED_COMPANY}</div>
                </CardContent>
              </Card>

              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Directors
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">{typeCounts.DIRECTOR}</div>
                </CardContent>
              </Card>

              <Card className="hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs md:text-sm font-medium">
                    Sub Contractors
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg md:text-2xl font-bold">{typeCounts.SUB_CONTRACTOR}</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>
                    Manage team members and their client assignments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/manager/teams">
                    <Button className="w-full">
                      Manage Teams
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Overview</CardTitle>
                  <CardDescription>
                    View and manage all clients in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/clients">
                    <Button className="w-full">
                      View All Clients
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error in manager dashboard:', error)
    
    // Fallback: return basic dashboard
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            <div className="page-header">
              <h1 className="text-xl md:text-2xl font-bold">
                Manager Dashboard
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground text-red-600">
                Error loading dashboard data. Please try refreshing the page.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>
                    Manage team members and their client assignments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/manager/teams">
                    <Button className="w-full">
                      Manage Teams
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Overview</CardTitle>
                  <CardDescription>
                    View and manage all clients in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/dashboard/clients">
                    <Button className="w-full">
                      View All Clients
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }
} 