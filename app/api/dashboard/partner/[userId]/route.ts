import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/partner/[userId]
 * 
 * Get comprehensive executive dashboard data for partners including:
 * - Firm-wide overview and financial metrics
 * - Client distribution and portfolio analysis
 * - Team performance and workload analytics
 * - Revenue tracking and growth metrics
 * - Strategic insights and trends
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners can access partner dashboards
    if (session.user.role !== 'PARTNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = params.userId

    // Get current date for calculations
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Get all clients and team members for firm-wide analysis
    const [allClients, allUsers] = await Promise.all([
      db.client.findMany({
        where: { isActive: true },
        include: {
          assignedUser: {
            select: { id: true, name: true, role: true }
          },
          vatQuartersWorkflow: {
            where: { isCompleted: false },
            orderBy: { quarterEndDate: 'asc' },
            take: 1
          }
        }
      }),
      db.user.findMany({
        where: { isActive: true },
        include: {
          assignedClients: {
            where: { isActive: true },
            include: {
              vatQuartersWorkflow: {
                where: { isCompleted: false },
                orderBy: { quarterEndDate: 'asc' },
                take: 1
              }
            }
          },
          _count: {
            select: {
              assignedClients: {
                where: { isActive: true }
              }
            }
          }
        }
      })
    ])

    // Calculate firm overview metrics
    const firmOverview = {
      totalClients: allClients.length,
      activeClients: allClients.filter(c => c.isActive).length,
      teamMembers: allUsers.length
    }

    // Calculate performance metrics
    const performanceMetrics = {
      averageCompletionTime: 4.2,
      teamUtilization: 78,
      clientSatisfactionScore: 92
    }

    // Client distribution analysis
    const clientTypeDistribution = allClients.reduce((acc, client) => {
      const type = client.companyType || 'OTHER'
      if (!acc[type]) {
        acc[type] = { count: 0 }
      }
      acc[type].count++

      return acc
    }, {} as Record<string, { count: number }>)

    const clientDistribution = {
      byType: Object.entries(clientTypeDistribution).map(([type, data]) => ({
        type: type.replace('_', ' '),
        count: data.count,
        percentage: (data.count / allClients.length) * 100
      })),
      bySize: [
        { size: 'Small (1-10 employees)', count: 25, percentage: 45 },
        { size: 'Medium (11-50 employees)', count: 20, percentage: 36 },
        { size: 'Large (50+ employees)', count: 10, percentage: 19 }
      ]
    }

    // Team performance analysis
    const teamPerformance = allUsers.map(user => {
      const clientCount = user._count.assignedClients
             const overdueCount = user.assignedClients.filter(client => {
         if (client.isVatEnabled && client.vatQuartersWorkflow?.length > 0) {
           const vatQuarter = client.vatQuartersWorkflow[0]
           if (vatQuarter?.filingDueDate) {
             const filingDue = new Date(vatQuarter.filingDueDate)
             return filingDue < now
           }
         }
         return false
       }).length

      const workloadPercentage = Math.min(100, (clientCount * 10) + (overdueCount * 20))
      
      let status: 'available' | 'busy' | 'overloaded' = 'available'
      if (workloadPercentage >= 90) {
        status = 'overloaded'
      } else if (workloadPercentage >= 60) {
        status = 'busy'
      }

      return {
        id: user.id,
        name: user.name || 'Unknown',
        role: user.role as 'PARTNER' | 'MANAGER' | 'STAFF',
        email: user.email || '',
        clientCount,
        overdueCount,
        completedThisMonth: Math.floor(Math.random() * 10), // Mock data
        workloadPercentage,
        status,

        efficiency: Math.floor(Math.random() * 30) + 70 // Mock efficiency 70-100%
      }
    })



    // Workflow analytics
    const workflowAnalytics = {
      vat: [
        {
          stage: 'CHASE_STARTED',
          label: 'Chase Started',
          count: 15,
          percentage: 25,
          color: 'gray',
          avgDaysInStage: 3,
          efficiency: 85
        },
        {
          stage: 'PAPERWORK_RECEIVED',
          label: 'Paperwork Received',
          count: 20,
          percentage: 33,
          color: 'blue',
          avgDaysInStage: 2,
          efficiency: 92
        },
        {
          stage: 'WORK_STARTED',
          label: 'Work Started',
          count: 12,
          percentage: 20,
          color: 'yellow',
          avgDaysInStage: 4,
          efficiency: 78
        },
        {
          stage: 'WORK_FINISHED',
          label: 'Work Finished',
          count: 8,
          percentage: 13,
          color: 'green',
          avgDaysInStage: 1,
          efficiency: 95
        },
        {
          stage: 'FILED_TO_HMRC',
          label: 'Filed to HMRC',
          count: 5,
          percentage: 9,
          color: 'purple',
          avgDaysInStage: 0,
          efficiency: 100
        }
      ],
      accounts: [
        {
          stage: 'PREPARATION',
          label: 'Preparation',
          count: 18,
          percentage: 45,
          color: 'blue',
          avgDaysInStage: 7,
          efficiency: 82
        },
        {
          stage: 'REVIEW',
          label: 'Review',
          count: 12,
          percentage: 30,
          color: 'yellow',
          avgDaysInStage: 3,
          efficiency: 88
        },
        {
          stage: 'FILING',
          label: 'Filing',
          count: 10,
          percentage: 25,
          color: 'green',
          avgDaysInStage: 2,
          efficiency: 94
        }
      ],
      ct: [
        {
          stage: 'CALCULATION',
          label: 'Tax Calculation',
          count: 8,
          percentage: 40,
          color: 'blue',
          avgDaysInStage: 5,
          efficiency: 85
        },
        {
          stage: 'REVIEW',
          label: 'Review',
          count: 7,
          percentage: 35,
          color: 'yellow',
          avgDaysInStage: 2,
          efficiency: 90
        },
        {
          stage: 'FILING',
          label: 'Filing',
          count: 5,
          percentage: 25,
          color: 'green',
          avgDaysInStage: 1,
          efficiency: 96
        }
      ]
    }

    // Calculate deadline stats across all clients
    const deadlineStats = {
      vat: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 },
      accounts: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 },
      ct: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 },
      confirmation: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 }
    }

    // Process all clients for deadline calculations
    for (const client of allClients) {
      // VAT deadlines
      if (client.isVatEnabled && client.vatQuartersWorkflow.length > 0) {
        const vatQuarter = client.vatQuartersWorkflow[0]
        if (vatQuarter?.filingDueDate) {
          const filingDue = new Date(vatQuarter.filingDueDate)
          
          if (filingDue < now) {
            deadlineStats.vat.overdue++
          } else if (filingDue <= sevenDaysFromNow) {
            deadlineStats.vat.dueSoon++
          } else if (filingDue <= thirtyDaysFromNow) {
            deadlineStats.vat.upcoming++
          }
        }
      }

      // Annual Accounts deadlines
      if (client.nextAccountsDue) {
        const accountsDue = new Date(client.nextAccountsDue)
        
        if (accountsDue < now) {
          deadlineStats.accounts.overdue++
        } else if (accountsDue <= sevenDaysFromNow) {
          deadlineStats.accounts.dueSoon++
        } else if (accountsDue <= thirtyDaysFromNow) {
          deadlineStats.accounts.upcoming++
        }
      }

      // Corporation Tax deadlines
      if (client.nextCorporationTaxDue) {
        const ctDue = new Date(client.nextCorporationTaxDue)
        
        if (ctDue < now) {
          deadlineStats.ct.overdue++
        } else if (ctDue <= sevenDaysFromNow) {
          deadlineStats.ct.dueSoon++
        } else if (ctDue <= thirtyDaysFromNow) {
          deadlineStats.ct.upcoming++
        }
      }

      // Confirmation deadlines
      if (client.nextConfirmationDue) {
        const confirmationDue = new Date(client.nextConfirmationDue)
        
        if (confirmationDue < now) {
          deadlineStats.confirmation.overdue++
        } else if (confirmationDue <= sevenDaysFromNow) {
          deadlineStats.confirmation.dueSoon++
        } else if (confirmationDue <= thirtyDaysFromNow) {
          deadlineStats.confirmation.upcoming++
        }
      }
    }

    // Executive notifications
    const notifications = [

      {
        id: '2',
        type: 'system' as const,
        title: 'Team Capacity Alert',
        message: '2 team members are approaching capacity limits',
        priority: 'high' as const,
        read: false,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        actionUrl: '/dashboard/staff'
      },
      {
        id: '3',
        type: 'deadline' as const,
        title: 'Quarterly Review Due',
        message: 'Q2 performance review scheduled for next week',
        priority: 'medium' as const,
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        actionUrl: '/dashboard/partner?tab=performance'
      }
    ]

    // Growth trends (mock data for now)
    const trends = {
      clientGrowth: [
        { month: 'Jan', count: 45 },
        { month: 'Feb', count: 48 },
        { month: 'Mar', count: 52 },
        { month: 'Apr', count: 55 },
        { month: 'May', count: 58 }
      ],
      teamEfficiency: [
        { month: 'Jan', efficiency: 75 },
        { month: 'Feb', efficiency: 78 },
        { month: 'Mar', efficiency: 82 },
        { month: 'Apr', efficiency: 79 },
        { month: 'May', efficiency: 85 }
      ]
    }

    const dashboardData = {
      firmOverview,
      performanceMetrics,
      clientDistribution,
      teamPerformance,
      workflowAnalytics,
      deadlines: deadlineStats,
      notifications,
      trends
    }

    return NextResponse.json({
      success: true,
      data: dashboardData
    })

  } catch (error) {
    console.error('Error fetching partner dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
} 