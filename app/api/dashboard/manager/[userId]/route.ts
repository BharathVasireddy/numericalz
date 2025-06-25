import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/manager/[userId]
 * 
 * Get comprehensive dashboard data for a manager including:
 * - Team overview and workload distribution
 * - Work pending review
 * - Workflow stage analytics
 * - Deadline summaries across all team members
 * - Performance metrics and analytics
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

    // Only managers and partners can access manager dashboards
    if (!['MANAGER', 'PARTNER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = params.userId

    // Get current date for calculations
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get all team members (staff under this manager or all if partner)
    const teamMembers = await db.user.findMany({
      where: {
        isActive: true,
        role: { in: ['STAFF', 'MANAGER'] }
      },
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

    // Calculate team overview stats
    const teamOverview = {
      totalTeamMembers: teamMembers.length,
      activeMembers: teamMembers.filter(m => m.isActive).length,
      overloadedMembers: 0, // Will calculate based on workload
      totalClientsManaged: teamMembers.reduce((sum, member) => sum + member._count.assignedClients, 0)
    }

    // Process team member data for workload distribution
    const processedTeamMembers = teamMembers.map(member => {
      const clientCount = member._count.assignedClients
      const overdueCount = member.assignedClients.filter(client => {
        if (client.isVatEnabled && client.vatQuartersWorkflow.length > 0) {
          const vatQuarter = client.vatQuartersWorkflow[0]
          if (vatQuarter?.filingDueDate) {
            const filingDue = new Date(vatQuarter.filingDueDate)
            return filingDue < now
          }
        }
        return false
      }).length

      // Calculate workload percentage (simplified calculation)
      const workloadPercentage = Math.min(100, (clientCount * 10) + (overdueCount * 20))
      
      let status: 'available' | 'busy' | 'overloaded' = 'available'
      if (workloadPercentage >= 90) {
        status = 'overloaded'
        teamOverview.overloadedMembers++
      } else if (workloadPercentage >= 60) {
        status = 'busy'
      }

      return {
        id: member.id,
        name: member.name || 'Unknown',
        role: member.role as 'PARTNER' | 'MANAGER' | 'STAFF',
        email: member.email || '',
        clientCount,
        overdueCount,
        completedThisMonth: 0, // Would need to calculate from completed work
        workloadPercentage,
        status
      }
    })

    // Calculate deadline stats across all team members
    const deadlineStats = {
      vat: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 },
      accounts: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 },
      ct: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 },
      confirmation: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 }
    }

    // Process all clients for deadline calculations
    for (const member of teamMembers) {
      for (const client of member.assignedClients) {
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
    }

    // Mock work review data (would come from workflow system)
    const workReview = [
      {
        id: '1',
        clientName: 'ABC Ltd',
        clientCode: 'NZ-1',
        type: 'vat' as const,
        stage: 'WORK_FINISHED',
        submittedBy: 'John Smith',
        submittedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        daysWaiting: 2,
        priority: 'high' as const
      },
      {
        id: '2',
        clientName: 'XYZ Corp',
        clientCode: 'NZ-5',
        type: 'accounts' as const,
        stage: 'SENT_TO_CLIENT',
        submittedBy: 'Jane Doe',
        submittedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        daysWaiting: 1,
        priority: 'medium' as const
      }
    ]

    // Mock workflow stage data
    const workflowStages = {
      vat: [
        {
          stage: 'CHASE_STARTED',
          label: 'Chase Started',
          count: 5,
          percentage: 20,
          color: 'gray',
          icon: null,
          avgDaysInStage: 3
        },
        {
          stage: 'PAPERWORK_RECEIVED',
          label: 'Paperwork Received',
          count: 8,
          percentage: 32,
          color: 'blue',
          icon: null,
          avgDaysInStage: 2
        },
        {
          stage: 'WORK_STARTED',
          label: 'Work in progress',
          count: 6,
          percentage: 24,
          color: 'yellow',
          icon: null,
          avgDaysInStage: 5
        },
        {
          stage: 'WORK_FINISHED',
          label: 'Work Finished',
          count: 4,
          percentage: 16,
          color: 'green',
          icon: null,
          avgDaysInStage: 1
        },
        {
          stage: 'FILED_TO_HMRC',
          label: 'Filed to HMRC',
          count: 2,
          percentage: 8,
          color: 'purple',
          icon: null,
          avgDaysInStage: 0
        }
      ],
      accounts: [
        {
          stage: 'PREPARATION',
          label: 'Preparation',
          count: 12,
          percentage: 40,
          color: 'blue',
          icon: null,
          avgDaysInStage: 7
        },
        {
          stage: 'REVIEW',
          label: 'Review',
          count: 10,
          percentage: 33,
          color: 'yellow',
          icon: null,
          avgDaysInStage: 3
        },
        {
          stage: 'FILING',
          label: 'Filing',
          count: 8,
          percentage: 27,
          color: 'green',
          icon: null,
          avgDaysInStage: 2
        }
      ]
    }

    // Mock notifications
    const notifications = [
      {
        id: '1',
        type: 'review' as const,
        title: 'Work Pending Review',
        message: 'ABC Ltd VAT return is ready for manager review',
        clientName: 'ABC Ltd',
        clientCode: 'NZ-1',
        priority: 'high' as const,
        read: false,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        actionUrl: '/dashboard/clients/vat-dt?filter=review'
      },
      {
        id: '2',
        type: 'overdue' as const,
        title: 'Overdue Deadline',
        message: 'XYZ Corp annual accounts filing is overdue',
        clientName: 'XYZ Corp',
        clientCode: 'NZ-5',
        priority: 'high' as const,
        read: false,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        actionUrl: '/dashboard/clients?filter=overdue'
      }
    ]

    // Analytics data
    const analytics = {
      completionRate: 85,
      averageProcessingTime: 4.2,
      teamEfficiency: 78,
      clientSatisfaction: 92
    }

    // Get all clients for client counts and unassigned calculations
    const allClients = await db.client.findMany({
      where: { isActive: true },
      include: {
        assignedUser: true,
        ltdCompanyAssignedUser: true,
        vatAssignedUser: true,
        vatQuartersWorkflow: {
          where: { isCompleted: false },
          orderBy: { quarterEndDate: 'asc' },
          take: 1
        }
      }
    })

    // Calculate client counts
    const clientCounts = {
      total: allClients.length,
      ltd: allClients.filter(c => c.companyType === 'LIMITED_COMPANY').length,
      nonLtd: allClients.filter(c => c.companyType !== 'LIMITED_COMPANY').length,
      vat: allClients.filter(c => c.isVatEnabled).length
    }

    // Calculate unassigned clients
    const unassignedClients = {
      ltd: allClients.filter(c => 
        c.companyType === 'LIMITED_COMPANY' && !c.ltdCompanyAssignedUserId && !c.assignedUserId
      ).length,
      nonLtd: allClients.filter(c => 
        c.companyType !== 'LIMITED_COMPANY' && !c.assignedUserId
      ).length,
      vat: allClients.filter(c => 
        c.isVatEnabled && !c.vatAssignedUserId && !c.assignedUserId
      ).length
    }

    // Calculate monthly deadlines (current month)
    const monthlyDeadlines = {
      accounts: deadlineStats.accounts.overdue + deadlineStats.accounts.dueSoon,
      vat: deadlineStats.vat.overdue + deadlineStats.vat.dueSoon,
      cs: deadlineStats.confirmation.overdue + deadlineStats.confirmation.dueSoon,
      ct: deadlineStats.ct.overdue + deadlineStats.ct.dueSoon
    }

    // Process team members for workload display
    const teamMembersForDisplay = processedTeamMembers.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
      clientCount: member.clientCount,
      vatClients: allClients.filter(c => 
        c.isVatEnabled && (c.vatAssignedUserId === member.id || c.assignedUserId === member.id)
      ).length,
      accountsClients: allClients.filter(c => 
        c.companyType === 'LIMITED_COMPANY' && (c.ltdCompanyAssignedUserId === member.id || c.assignedUserId === member.id)
      ).length
    }))

    // Get upcoming deadlines (next 30 days)
    const upcomingDeadlines = allClients
      .map(client => {
        const deadlines = []
        
        // VAT deadlines
        if (client.isVatEnabled && client.vatQuartersWorkflow.length > 0) {
          const vatQuarter = client.vatQuartersWorkflow[0]
          if (vatQuarter?.filingDueDate) {
            const filingDue = new Date(vatQuarter.filingDueDate)
            if (filingDue > now && filingDue <= thirtyDaysFromNow) {
              deadlines.push({
                id: `vat-${client.id}`,
                companyName: client.companyName,
                type: 'VAT Return',
                date: filingDue.toISOString(),
                daysUntil: Math.ceil((filingDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
              })
            }
          }
        }

        // Accounts deadlines
        if (client.nextAccountsDue) {
          const accountsDue = new Date(client.nextAccountsDue)
          if (accountsDue > now && accountsDue <= thirtyDaysFromNow) {
            deadlines.push({
              id: `accounts-${client.id}`,
              companyName: client.companyName,
              type: 'Annual Accounts',
              date: accountsDue.toISOString(),
              daysUntil: Math.ceil((accountsDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            })
          }
        }

        return deadlines
      })
      .flat()
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 10) // Top 10 upcoming deadlines

    // Get current month name
    const monthName = now.toLocaleDateString('en-US', { month: 'long' })

    const dashboardData = {
      clientCounts,
      unassignedClients,
      teamMembers: teamMembersForDisplay,
      monthlyDeadlines,
      upcomingDeadlines,
      monthName
    }

    return NextResponse.json({
      success: true,
      data: dashboardData
    })

  } catch (error) {
    console.error('Error fetching manager dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
} 