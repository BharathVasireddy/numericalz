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
 * - Upcoming deadlines for calendar
 * 
 * REAL-TIME: No caching for immediate updates
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

    // Direct database query - no caching for real-time updates
    // Get current date for calculations
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const next7Days = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))
    const next15Days = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000))
    const next30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    const next60Days = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000))
    const next90Days = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000))

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

    // Get all users with their client counts including VAT and Accounts breakdown
    const allUsers = await db.user.findMany({
      where: { isActive: true },
      include: {
        assignedVATQuarters: {
          where: { 
            client: { isActive: true },
            isCompleted: false
          },
          select: {
            id: true,
            clientId: true,
            client: {
              select: {
                id: true,
                isVatEnabled: true
              }
            }
          }
        },
        ltdCompanyAssignedClients: {
          where: { isActive: true },
          select: {
            id: true,
            handlesAnnualAccounts: true
          }
        },
        nonLtdCompanyAssignedClients: {
          where: { isActive: true },
          select: {
            id: true,
            handlesAnnualAccounts: true
          }
        }
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    })

    // 1. CLIENT COUNTS - Fixed categorization
    console.log('🔍 Debug client types:', allClients.map(c => ({ 
      name: c.companyName, 
      type: c.companyType,
      isLtd: c.companyType === 'LIMITED_COMPANY',
      isNonLtd: c.companyType !== 'LIMITED_COMPANY'
    })))
    
    const clientCounts = {
      total: allClients.length,
      ltd: allClients.filter(c => c.companyType === 'LIMITED_COMPANY').length,
      nonLtd: allClients.filter(c => c.companyType !== 'LIMITED_COMPANY').length,
      vat: allClients.filter(c => c.isVatEnabled).length
    }
    
    console.log('📊 Client counts:', clientCounts)

    // 1.5. UNASSIGNED CLIENTS COUNTS - Use consistent logic with manager dashboard
    const unassignedClients = {
      ltd: allClients.filter(c => 
        c.companyType === 'LIMITED_COMPANY' && !c.ltdCompanyAssignedUserId && !c.assignedUserId
      ).length,
      nonLtd: allClients.filter(c => 
        c.companyType !== 'LIMITED_COMPANY' && !c.nonLtdCompanyAssignedUserId && !c.assignedUserId
      ).length,
      vat: allClients.filter(c => 
        c.isVatEnabled && c.vatQuartersWorkflow?.some(q => !q.assignedUserId)
      ).length
    }
    
    console.log('🚨 Unassigned clients:', unassignedClients)

    // 2. STAFF WORKLOAD - ONLY specific work-type assignments (NO GENERAL)
    const staffWorkload = allUsers.map(user => {
      // Count VAT clients (from assignedVATQuarters relation - unique client IDs)
      const vatClientIds = new Set(user.assignedVATQuarters.map(q => q.clientId))
      const vatClients = vatClientIds.size
      
      // Count Accounts clients (from both Ltd and Non-Ltd assigned clients)
      const accountsClients = [
        ...user.ltdCompanyAssignedClients.filter(c => c.handlesAnnualAccounts),
        ...user.nonLtdCompanyAssignedClients.filter(c => c.handlesAnnualAccounts)
      ].length
      
      // Total client count = VAT + Accounts (NO GENERAL ASSIGNMENTS)
      const totalClients = vatClients + accountsClients
      
      console.log(`👤 ${user.name}: VAT=${vatClients}, Accounts=${accountsClients}, Total=${totalClients}`)
      
      return {
        id: user.id,
        name: user.name || 'Unknown',
        role: user.role,
        clientCount: totalClients,
        vatClients: vatClients,
        accountsClients: accountsClients
      }
    })

    // 3. MONTHLY DEADLINES
    const monthlyDeadlines = {
      accounts: 0,
      vat: 0,
      cs: 0, // Confirmation Statements
      ct: 0  // Corporation Tax
    }

    // 4. UPCOMING DEADLINES - Count by time ranges and type
    const deadlineBreakdown = {
      vat: {
        days7: 0,
        days15: 0,
        days30: 0,
        days60: 0,
        days90: 0
      },
      accounts: {
        days7: 0,
        days15: 0,
        days30: 0,
        days60: 0,
        days90: 0
      }
    }

    // Count deadlines due this month and collect upcoming ones by time ranges
    for (const client of allClients) {
      const currentDate = new Date()
      
      // Annual Accounts
      if (client.nextAccountsDue) {
        const accountsDue = new Date(client.nextAccountsDue)
        if (accountsDue >= startOfMonth && accountsDue <= endOfMonth) {
          monthlyDeadlines.accounts++
        }
        
        // Count by time ranges
        if (accountsDue >= currentDate) {
          if (accountsDue <= next7Days) deadlineBreakdown.accounts.days7++
          else if (accountsDue <= next15Days) deadlineBreakdown.accounts.days15++
          else if (accountsDue <= next30Days) deadlineBreakdown.accounts.days30++
          else if (accountsDue <= next60Days) deadlineBreakdown.accounts.days60++
          else if (accountsDue <= next90Days) deadlineBreakdown.accounts.days90++
        }
      }

      // VAT (already filtered by date in query)
      if (client.isVatEnabled && client.vatQuartersWorkflow.length > 0) {
        monthlyDeadlines.vat += client.vatQuartersWorkflow.length
        
        // Count VAT deadlines by time ranges
        client.vatQuartersWorkflow.forEach(vat => {
          if (vat.filingDueDate) {
            const vatDue = new Date(vat.filingDueDate)
            if (vatDue >= currentDate) {
              if (vatDue <= next7Days) deadlineBreakdown.vat.days7++
              else if (vatDue <= next15Days) deadlineBreakdown.vat.days15++
              else if (vatDue <= next30Days) deadlineBreakdown.vat.days30++
              else if (vatDue <= next60Days) deadlineBreakdown.vat.days60++
              else if (vatDue <= next90Days) deadlineBreakdown.vat.days90++
            }
          }
        })
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
      unassignedClients,
      staffWorkload,
      monthlyDeadlines,
      deadlineBreakdown,
      monthName: now.toLocaleDateString('en-GB', { month: 'long' })
    }

    const response = NextResponse.json({
      success: true,
      data: dashboardData
    })

    // Set no-cache headers for real-time updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Partner dashboard error:', error)
    return NextResponse.json({
      error: 'Failed to fetch dashboard data'
    }, { status: 500 })
  }
} 