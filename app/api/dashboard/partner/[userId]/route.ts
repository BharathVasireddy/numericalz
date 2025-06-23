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
        vatAssignedClients: {
          where: { isActive: true },
          select: {
            id: true,
            isVatEnabled: true
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

    // 1.5. UNASSIGNED CLIENTS COUNTS
    const unassignedClients = {
      ltd: allClients.filter(c => 
        c.companyType === 'LIMITED_COMPANY' && 
        c.handlesAnnualAccounts && 
        !c.ltdCompanyAssignedUserId
      ).length,
      nonLtd: allClients.filter(c => 
        c.companyType !== 'LIMITED_COMPANY' && 
        c.handlesAnnualAccounts && 
        !c.nonLtdCompanyAssignedUserId
      ).length,
      vat: allClients.filter(c => 
        c.isVatEnabled && 
        !c.vatAssignedUserId
      ).length
    }
    
    console.log('🚨 Unassigned clients:', unassignedClients)

    // 2. STAFF WORKLOAD - ONLY specific work-type assignments (NO GENERAL)
    const staffWorkload = allUsers.map(user => {
      // Count VAT clients (from vatAssignedClients relation)
      const vatClients = user.vatAssignedClients.filter(c => c.isVatEnabled).length
      
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

    // 4. UPCOMING DEADLINES for compact calendar
    const upcomingDeadlines = []

    // Count deadlines due this month and collect upcoming ones
    for (const client of allClients) {
      const currentDate = new Date()
      
      // Annual Accounts
      if (client.nextAccountsDue) {
        const accountsDue = new Date(client.nextAccountsDue)
        if (accountsDue >= startOfMonth && accountsDue <= endOfMonth) {
          monthlyDeadlines.accounts++
        }
        
        // Add to upcoming deadlines if within next 7 days
        if (accountsDue >= currentDate && accountsDue <= next7Days) {
          const daysUntil = Math.ceil((accountsDue.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
          upcomingDeadlines.push({
            id: `accounts-${client.id}`,
            companyName: client.companyName,
            type: 'Accounts',
            date: accountsDue.toISOString(),
            daysUntil: daysUntil
          })
        }
      }

      // VAT (already filtered by date in query)
      if (client.isVatEnabled && client.vatQuartersWorkflow.length > 0) {
        monthlyDeadlines.vat += client.vatQuartersWorkflow.length
        
        // Add VAT deadlines to upcoming
        client.vatQuartersWorkflow.forEach(vat => {
          if (vat.filingDueDate) {
            const vatDue = new Date(vat.filingDueDate)
            if (vatDue >= currentDate && vatDue <= next7Days) {
              const daysUntil = Math.ceil((vatDue.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
              upcomingDeadlines.push({
                id: `vat-${vat.id}`,
                companyName: client.companyName,
                type: 'VAT',
                date: vatDue.toISOString(),
                daysUntil: daysUntil
              })
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
        
        // Add to upcoming deadlines if within next 7 days
        if (confirmationDue >= currentDate && confirmationDue <= next7Days) {
          const daysUntil = Math.ceil((confirmationDue.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
          upcomingDeadlines.push({
            id: `cs-${client.id}`,
            companyName: client.companyName,
            type: 'Confirmation Statement',
            date: confirmationDue.toISOString(),
            daysUntil: daysUntil
          })
        }
      }

      // Corporation Tax
      if (client.nextCorporationTaxDue) {
        const ctDue = new Date(client.nextCorporationTaxDue)
        if (ctDue >= startOfMonth && ctDue <= endOfMonth) {
          monthlyDeadlines.ct++
        }
        
        // Add to upcoming deadlines if within next 7 days
        if (ctDue >= currentDate && ctDue <= next7Days) {
          const daysUntil = Math.ceil((ctDue.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
          upcomingDeadlines.push({
            id: `ct-${client.id}`,
            companyName: client.companyName,
            type: 'Corporation Tax',
            date: ctDue.toISOString(),
            daysUntil: daysUntil
          })
        }
      }
    }

    // Sort upcoming deadlines by date
    upcomingDeadlines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const dashboardData = {
      clientCounts,
      unassignedClients,
      staffWorkload,
      monthlyDeadlines,
      upcomingDeadlines: upcomingDeadlines.slice(0, 10), // Limit to 10 most urgent
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