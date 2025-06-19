'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  BarChart3,
  PieChart,
  FileText
} from 'lucide-react'

interface ManagerDashboardProps {
  data: {
    typeCounts: {
      LIMITED_COMPANY: number
      NON_LIMITED_COMPANY: number
      DIRECTOR: number
      SUB_CONTRACTOR: number
    }
    totalClients: number
    totalUsers: number
    recentClients: Array<{
      id: string
      clientCode: string
      companyName: string
      companyType: string | null
      createdAt: string
      assignedUser?: {
        name: string
        email: string
      }
    }>
    userRole: string
  }
}

/**
 * Manager Dashboard Component for Partners and Managers
 * 
 * Features:
 * - System overview with key metrics
 * - Client type distribution
 * - Recent activity
 * - Quick actions
 * - Team performance insights
 * - Role-based feature access
 */
export function ManagerDashboard({ data }: ManagerDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  const { typeCounts, totalClients, totalUsers, recentClients, userRole } = data

  // Calculate percentages for client types
  const getTypePercentage = (count: number) => {
    return totalClients > 0 ? Math.round((count / totalClients) * 100) : 0
  }

  return (
    <PageLayout>
      <PageHeader 
        title={`${userRole === 'PARTNER' ? 'Partner' : 'Manager'} Dashboard`}
        description={userRole === 'PARTNER' 
          ? 'Complete system overview and management controls' 
          : 'Team and client management overview'
        }
      >
        <Button asChild size="sm">
          <Link href="/dashboard/clients/add" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </PageHeader>
      <PageContent>
        <div className="content-sections">
          {/* Key Metrics */}
          <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  Active client accounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Active team members
                </p>
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
                  {getTypePercentage(typeCounts.LIMITED_COMPANY)}% of total clients
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
                  {getTypePercentage(typeCounts.NON_LIMITED_COMPANY)}% of total clients
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Client Type Distribution */}
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Client Type Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of clients by company type
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
                        {getTypePercentage(typeCounts.LIMITED_COMPANY)}%
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
                        {getTypePercentage(typeCounts.NON_LIMITED_COMPANY)}%
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
                        {getTypePercentage(typeCounts.DIRECTOR)}%
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
                        {getTypePercentage(typeCounts.SUB_CONTRACTOR)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common management tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard/clients" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    View All Clients
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard/clients/ltd-companies" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Ltd Companies
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard/clients/non-ltd-companies" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Non-Ltd Companies
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard/clients/vat-dt" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    VAT Deadline Tracker
                  </Link>
                </Button>
                
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/dashboard/staff" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Staff Management
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

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
                  {recentClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{client.companyName}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.clientCode} • {client.companyType?.replace('_', ' ') || 'Unknown'}
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
        </div>
      </PageContent>
    </PageLayout>
  )
} 