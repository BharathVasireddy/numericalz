import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard'

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
 * - Quick actions for partners and managers
 */
export default async function ManagerDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session || (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER')) {
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

    // Get total client count
    const totalClients = await db.client.count({
      where: { isActive: true }
    }).catch((error: unknown) => {
      console.error('Error fetching total client count:', error)
      return 0
    })

    // Get user count
    const totalUsers = await db.user.count({
      where: { isActive: true }
    }).catch((error: unknown) => {
      console.error('Error fetching user count:', error)
      return 0
    })

    // Get recent clients
    const recentClients = await db.client.findMany({
      where: { isActive: true },
      include: {
        assignedUser: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    }).catch((error: unknown) => {
      console.error('Error fetching recent clients:', error)
      return []
    })

    const dashboardData = {
      typeCounts,
      totalClients,
      totalUsers,
      recentClients,
      userRole: session.user.role
    }

    return <ManagerDashboard data={dashboardData} />

  } catch (error) {
    console.error('Error loading manager dashboard:', error)
    
    // Return fallback dashboard with empty data
    const fallbackData = {
      typeCounts: {
        LIMITED_COMPANY: 0,
        NON_LIMITED_COMPANY: 0,
        DIRECTOR: 0,
        SUB_CONTRACTOR: 0
      },
      totalClients: 0,
      totalUsers: 0,
      recentClients: [],
      userRole: session.user.role
    }
    
    return <ManagerDashboard data={fallbackData} />
  }
} 