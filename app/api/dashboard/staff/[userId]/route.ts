import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/staff/[userId]
 * 
 * Get comprehensive dashboard data for a staff member including:
 * - Deadline summaries (VAT, Accounts, CT, Confirmations)
 * - Recent notifications
 * - Performance stats
 * - Recent activity
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

    // Staff can only access their own dashboard, managers/partners can access any staff dashboard
    if (session.user.role === 'STAFF' && session.user.id !== params.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = params.userId

    // Get current date for deadline calculations
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch all assigned clients for the user
    const assignedClients = await db.client.findMany({
      where: { 
        assignedUserId: userId,
        isActive: true
      },
      include: {
        vatQuartersWorkflow: {
          where: { isCompleted: false },
          orderBy: { quarterEndDate: 'asc' },
          take: 1
        }
      }
    })

    // Calculate deadline stats
    const deadlineStats = {
      vat: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 },
      accounts: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 },
      ct: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 },
      confirmation: { overdue: 0, dueSoon: 0, upcoming: 0, completed: 0 }
    }

    // Process each client for deadlines
    for (const client of assignedClients) {
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

    // Get completed work this month
    const completedVATQuarters = await db.vATQuarter.count({
      where: {
        client: { assignedUserId: userId },
        isCompleted: true,
        filedToHMRCDate: { gte: startOfMonth }
      }
    })

    deadlineStats.vat.completed = completedVATQuarters

    // Mock notifications for now (would be from a notifications table)
    const notifications = [
      {
        id: '1',
        type: 'deadline' as const,
        title: 'VAT Return Due Soon',
        message: 'ABC Ltd VAT return is due in 3 days',
        clientName: 'ABC Ltd',
        clientCode: 'NZ-1',
        priority: 'high' as const,
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        actionUrl: '/dashboard/clients/vat-dt?filter=dueSoon'
      },
      {
        id: '2',
        type: 'assignment' as const,
        title: 'New Client Assigned',
        message: 'You have been assigned a new client: XYZ Corp',
        clientName: 'XYZ Corp',
        clientCode: 'NZ-5',
        priority: 'medium' as const,
        read: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        actionUrl: '/dashboard/clients'
      },
      {
        id: '3',
        type: 'completion' as const,
        title: 'Work Completed',
        message: 'Successfully filed VAT return for DEF Ltd',
        clientName: 'DEF Ltd',
        clientCode: 'NZ-3',
        priority: 'low' as const,
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        actionUrl: '/dashboard/clients/vat-dt'
      }
    ]

    // Calculate stats
    const stats = {
      totalClients: assignedClients.length,
      activeClients: assignedClients.filter(c => c.isActive).length,
      completedThisMonth: completedVATQuarters,
      overallProgress: assignedClients.length > 0 
        ? Math.round((completedVATQuarters / assignedClients.length) * 100)
        : 0
    }

    // Mock recent activity (would be from an activity log table)
    const recentActivity = [
      {
        id: '1',
        action: 'Updated VAT workflow stage',
        clientName: 'ABC Ltd',
        timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        type: 'vat' as const
      },
      {
        id: '2',
        action: 'Uploaded annual accounts',
        clientName: 'XYZ Corp',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        type: 'accounts' as const
      },
      {
        id: '3',
        action: 'Filed CT return',
        clientName: 'DEF Ltd',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        type: 'ct' as const
      }
    ]

    const dashboardData = {
      deadlines: deadlineStats,
      notifications,
      stats,
      recentActivity
    }

    return NextResponse.json({
      success: true,
      data: dashboardData
    })

  } catch (error) {
    console.error('Error fetching staff dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
} 