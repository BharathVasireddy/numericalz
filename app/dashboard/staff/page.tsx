import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Staff Dashboard - Numericalz',
  description: 'Staff dashboard with personal work overview and assigned clients',
}

/**
 * Staff dashboard page with limited features focused on assigned work
 * 
 * Features:
 * - Personal task overview
 * - Assigned clients
 * - Recent activities
 * - Quick actions for daily work
 */
export default async function StaffDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  if (session.user.role !== 'STAFF') {
    redirect('/dashboard/manager')
  }

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
        resource: 'Client',
        timestamp: new Date(),
        client: { companyName: 'Example Ltd' }
      },
      {
        id: '2', 
        action: 'Reviewed documents',
        resource: 'Document',
        timestamp: new Date(Date.now() - 86400000),
        client: { companyName: 'Test Corp' }
      }
    ])
  ])

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          {/* Header */}
          <div className="page-header">
            <h1 className="text-xl md:text-2xl font-bold">
              Staff Dashboard
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Welcome back, {session.user.name}! Here's your work overview.
            </p>
          </div>

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
                          {activity.resource}
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
        </div>
      </div>
    </div>
  )
} 