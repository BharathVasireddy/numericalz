import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/dashboard/partner/[userId]
 * 
 * Get focused partner dashboard data with only essential metrics:
 * - Client counts (total, ltd, non-ltd, vat)
 * - Staff workload distribution
 * - Monthly deadlines by type
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

    // Get current date for calculations
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Get all active clients with necessary data
    const allClients = await db.client.findMany({
      where: { isActive: true },
      include: {
        assignedUser: {
          select: { id: true, name: true, role: true }
        },
        vatQuartersWorkflow: {
          where: { 
            filingDueDate: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          orderBy: { quarterEndDate: 'asc' }
        }
      }
    })

    // Get all users with their client counts
    const allUsers = await db.user.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            assignedClients: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    })

    // 1. CLIENT COUNTS
    const clientCounts = {
      total: allClients.length,
      ltd: allClients.filter(c => c.companyType === 'LIMITED').length,
      nonLtd: allClients.filter(c => c.companyType !== 'LIMITED').length,
      vat: allClients.filter(c => c.isVatEnabled).length
    }

    // 2. STAFF WORKLOAD
    const staffWorkload = allUsers.map(user => ({
      id: user.id,
      name: user.name || 'Unknown',
      role: user.role,
      clientCount: user._count.assignedClients
    }))

    // 3. MONTHLY DEADLINES
    const monthlyDeadlines = {
      accounts: 0,
      vat: 0,
      cs: 0, // Confirmation Statements
      ct: 0  // Corporation Tax
    }

    // Count deadlines due this month
    for (const client of allClients) {
      // Annual Accounts
      if (client.nextAccountsDue) {
        const accountsDue = new Date(client.nextAccountsDue)
        if (accountsDue >= startOfMonth && accountsDue <= endOfMonth) {
          monthlyDeadlines.accounts++
        }
      }

      // VAT (already filtered by date in query)
      if (client.isVatEnabled && client.vatQuartersWorkflow.length > 0) {
        monthlyDeadlines.vat += client.vatQuartersWorkflow.length
      }

      // Confirmation Statements
      if (client.nextConfirmationDue) {
        const confirmationDue = new Date(client.nextConfirmationDue)
        if (confirmationDue >= startOfMonth && confirmationDue <= endOfMonth) {
          monthlyDeadlines.cs++
        }
      }

      // Corporation Tax
      if (client.nextCorporationTaxDue) {
        const ctDue = new Date(client.nextCorporationTaxDue)
        if (ctDue >= startOfMonth && ctDue <= endOfMonth) {
          monthlyDeadlines.ct++
        }
      }
    }

    const dashboardData = {
      clientCounts,
      staffWorkload,
      monthlyDeadlines,
      monthName: now.toLocaleString('default', { month: 'long' })
    }

    return NextResponse.json({
      success: true,
      data: dashboardData
    })

  } catch (error) {
    console.error('Partner dashboard API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard data' 
      }, 
      { status: 500 }
    )
  }
} 