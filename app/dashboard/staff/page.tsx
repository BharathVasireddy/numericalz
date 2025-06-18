import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { TeamManagement } from '@/components/teams/team-management'

export const metadata: Metadata = {
  title: 'Staff - Numericalz',
  description: 'Staff dashboard and management',
}

/**
 * Staff page - handles both STAFF dashboard and PARTNER staff management
 * 
 * - PARTNER: Shows staff management interface
 * - STAFF: Shows personal dashboard
 * - MANAGER: Redirected to manager dashboard
 */
export default async function StaffPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  // MANAGER users should not access this page - redirect to their dashboard
  if (session.user.role === 'MANAGER') {
    redirect('/dashboard/manager')
  }

  // PARTNER users see staff management
  if (session.user.role === 'PARTNER') {
    try {
      // Fetch all users for staff management with proper structure
      const users = await db.user.findMany({
        where: { isActive: true },
        include: {
          assignedClients: {
            where: { isActive: true },
            select: {
              id: true,
              companyName: true,
              companyType: true,
              nextAccountsDue: true,
              nextConfirmationDue: true,
            }
          },
          _count: {
            select: {
              assignedClients: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return <TeamManagement users={users} />
    } catch (error) {
      console.error('Error loading users for staff management:', error)
      
      return (
        <PageLayout>
          <PageHeader 
            title="Staff Management"
            description="Error loading staff data"
          />
          <PageContent>
            <Card>
              <CardHeader>
                <CardTitle>Error Loading Staff</CardTitle>
                <CardDescription>
                  There was an error loading the staff data. Please try refreshing the page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/dashboard/partner">
                    Back to Dashboard
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </PageContent>
        </PageLayout>
      )
    }
  }

  // STAFF users see their personal dashboard
  try {
    // Fetch staff-specific data
    const [assignedClients, recentActivities] = await Promise.all([
      db.client.findMany({
        where: { 
          assignedUserId: session.user.id,
          isActive: true
        },
        take: 6,
        orderBy: { updatedAt: 'desc' }
      }),
      // Mock recent activities for now
      Promise.resolve([
        {
          id: '1',
          action: 'Updated client information',
          
          timestamp: new Date(),
          client: { companyName: 'Example Ltd' }
        },
        {
          id: '2', 
          action: 'Reviewed documents',
          
          timestamp: new Date(Date.now() - 86400000),
          client: { companyName: 'Test Corp' }
        }
      ])
    ])

    return (
      <PageLayout maxWidth="xl">
        <PageHeader 
          title="Staff Dashboard"
          description={`Welcome back, ${session.user.name}! Here's your work overview.`}
        />
        <PageContent>
          {/* Personal Metrics */}
          <div className="grid gap-3 md:gap-4 grid-cols-2">
            <Card className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">
                  My Clients
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-2xl font-bold">{assignedClients.length}</div>
                <p className="text-xs text-muted-foreground">
                  Assigned to me
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs md:text-sm font-medium">
                  Recent Activities
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg md:text-2xl font-bold">{recentActivities.length}</div>
                <p className="text-xs text-muted-foreground">
                  Recent actions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* My Clients */}
          <Card className="shadow-professional">
            <CardHeader>
              <CardTitle className="text-base md:text-lg">My Clients</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Clients assigned to your care
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              {assignedClients.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {assignedClients.map((client: any) => (
                    <div key={client.id} className="flex justify-between items-center p-3 rounded-sm border border-border">
                      <div>
                        <p className="text-sm font-medium">{client.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.companyType === 'LIMITED_COMPANY' ? 'Limited Company' :
                           client.companyType === 'NON_LIMITED_COMPANY' ? 'Non Limited Company' :
                           client.companyType === 'DIRECTOR' ? 'Director' :
                           client.companyType === 'SUB_CONTRACTOR' ? 'Sub Contractor' :
                           client.companyType}
                        </p>
                      </div>
                      <span className={`status-badge text-xs ${
                        client.isActive 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {client.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No clients assigned</p>
              )}
              <Button className="btn-primary w-full" asChild>
                <Link href="/dashboard/clients">
                  View All My Clients
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-professional">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Recent Activities</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Your recent actions and updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivities.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex justify-between items-center p-2 rounded-sm border border-border">
                        <div>
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.client?.companyName || 'System'} • {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="status-badge bg-muted text-muted-foreground text-xs">
                          Activity
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activities</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-professional">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">Deadline Calendar</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Visual calendar of your client deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View all your client deadlines in an easy-to-use calendar format with multiple view options.
                </p>
                <Button className="btn-primary w-full" asChild>
                  <Link href="/dashboard/calendar">
                    View Calendar
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageContent>
      </PageLayout>
    )
  } catch (error) {
    console.error('Error loading staff dashboard:', error)
    
    return (
      <PageLayout>
        <PageHeader 
          title="Staff Dashboard"
          description="Error loading staff data"
        />
        <PageContent>
          <Card>
            <CardHeader>
              <CardTitle>Error Loading Staff</CardTitle>
              <CardDescription>
                There was an error loading the staff data. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/dashboard/partner">
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </PageContent>
      </PageLayout>
    )
  }
} 