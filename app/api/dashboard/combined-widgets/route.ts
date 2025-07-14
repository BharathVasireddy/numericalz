import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and partners can access this endpoint
    if (!['MANAGER', 'PARTNER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current date for calculations
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
    const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999))
    const next7Days = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))
    const next15Days = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000))
    const next30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    const next60Days = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000))
    const next90Days = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000))

    // PERFORMANCE OPTIMIZATION: Single database query for all data
    const [allClients, teamWorkload] = await Promise.all([
      // Optimized client query with minimal includes
      db.client.findMany({
        where: { isActive: true },
        select: {
          id: true,
          companyType: true,
          isVatEnabled: true,
          nextAccountsDue: true,
          nextCorporationTaxDue: true,
          nextConfirmationDue: true,
          assignedUserId: true,
          ltdCompanyAssignedUserId: true,
          nonLtdCompanyAssignedUserId: true,
          vatQuartersWorkflow: {
            where: { isCompleted: false },
            select: {
              id: true,
              filingDueDate: true,
              assignedUserId: true,
              quarterEndDate: true
            },
            orderBy: { quarterEndDate: 'asc' },
            take: 1
          }
        }
      }),

      // Optimized team workload query
      db.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          role: true,
          _count: {
            select: {
              assignedClients: { where: { isActive: true } },
              ltdCompanyAssignedClients: { where: { isActive: true } },
              nonLtdCompanyAssignedClients: { where: { isActive: true } },
              assignedVATQuarters: { 
                where: { 
                  client: { isActive: true },
                  isCompleted: false
                }
              },
              assignedLtdAccountsWorkflows: { 
                where: { 
                  client: { isActive: true },
                  isCompleted: false
                }
              }
            }
          }
        },
        orderBy: [
          { role: 'desc' },
          { name: 'asc' }
        ]
      })
    ])

    // Process all widget data in parallel
    const results = {
      // Client Overview
      clientCounts: {
        total: allClients.length,
        ltd: allClients.filter(c => c.companyType === 'LIMITED_COMPANY').length,
        nonLtd: allClients.filter(c => c.companyType !== 'LIMITED_COMPANY').length,
        vat: allClients.filter(c => c.isVatEnabled).length
      },

      // Unassigned Clients
      unassignedCounts: {
        ltd: allClients.filter(c => 
          c.companyType === 'LIMITED_COMPANY' && !c.ltdCompanyAssignedUserId && !c.assignedUserId
        ).length,
        nonLtd: allClients.filter(c => 
          c.companyType !== 'LIMITED_COMPANY' && !c.nonLtdCompanyAssignedUserId && !c.assignedUserId
        ).length,
        vat: allClients.filter(c => 
          c.isVatEnabled && c.vatQuartersWorkflow?.some(q => !q.assignedUserId)
        ).length
      },

      // Monthly Deadlines
      monthlyDeadlines: (() => {
        const deadlines = {
          accounts: 0,
          vat: 0,
          cs: 0,
          ct: 0
        }

        for (const client of allClients) {
          // Annual Accounts
          if (client.nextAccountsDue) {
            const accountsDue = new Date(client.nextAccountsDue)
            if (accountsDue >= startOfMonth && accountsDue <= endOfMonth) {
              deadlines.accounts++
            }
          }

          // VAT
          if (client.isVatEnabled && client.vatQuartersWorkflow.length > 0) {
            for (const vat of client.vatQuartersWorkflow) {
              if (vat.filingDueDate) {
                const vatDue = new Date(vat.filingDueDate)
                if (vatDue >= startOfMonth && vatDue <= endOfMonth) {
                  deadlines.vat++
                }
              }
            }
          }

          // Confirmation Statements
          if (client.nextConfirmationDue) {
            const confirmationDue = new Date(client.nextConfirmationDue)
            if (confirmationDue >= startOfMonth && confirmationDue <= endOfMonth) {
              deadlines.cs++
            }
          }

          // Corporation Tax
          if (client.nextCorporationTaxDue) {
            const ctDue = new Date(client.nextCorporationTaxDue)
            if (ctDue >= startOfMonth && ctDue <= endOfMonth) {
              deadlines.ct++
            }
          }
        }

        return deadlines
      })(),

      // Upcoming Deadlines
      upcomingDeadlines: (() => {
        const deadlines = {
          vat: { days7: 0, days15: 0, days30: 0, days60: 0, days90: 0 },
          accounts: { days7: 0, days15: 0, days30: 0, days60: 0, days90: 0 }
        }

        for (const client of allClients) {
          const currentDate = new Date()
          
          // Annual Accounts
          if (client.nextAccountsDue) {
            const accountsDue = new Date(client.nextAccountsDue)
            if (accountsDue >= currentDate) {
              if (accountsDue <= next7Days) deadlines.accounts.days7++
              else if (accountsDue <= next15Days) deadlines.accounts.days15++
              else if (accountsDue <= next30Days) deadlines.accounts.days30++
              else if (accountsDue <= next60Days) deadlines.accounts.days60++
              else if (accountsDue <= next90Days) deadlines.accounts.days90++
            }
          }

          // VAT deadlines
          if (client.isVatEnabled && client.vatQuartersWorkflow.length > 0) {
            client.vatQuartersWorkflow.forEach(vat => {
              if (vat.filingDueDate) {
                const vatDue = new Date(vat.filingDueDate)
                if (vatDue >= currentDate) {
                  if (vatDue <= next7Days) deadlines.vat.days7++
                  else if (vatDue <= next15Days) deadlines.vat.days15++
                  else if (vatDue <= next30Days) deadlines.vat.days30++
                  else if (vatDue <= next60Days) deadlines.vat.days60++
                  else if (vatDue <= next90Days) deadlines.vat.days90++
                }
              }
            })
          }
        }

        return deadlines
      })(),

      // Team Workload
      teamWorkload: teamWorkload.map(user => ({
        id: user.id,
        name: user.name || 'Unknown',
        role: user.role,
        clientCount: user._count.assignedClients + 
                    user._count.ltdCompanyAssignedClients + 
                    user._count.nonLtdCompanyAssignedClients,
        generalAssignments: user._count.assignedClients,
        ltdAssignments: user._count.ltdCompanyAssignedClients,
        nonLtdAssignments: user._count.nonLtdCompanyAssignedClients,
        activeVATQuarters: user._count.assignedVATQuarters,
        activeLtdWorkflows: user._count.assignedLtdAccountsWorkflows
      })),

      // Additional metadata
      monthName: now.toLocaleDateString('en-GB', { month: 'long' })
    }

    // Smart caching - cache for 2 minutes to balance performance and real-time data
    const response = NextResponse.json({
      success: true,
      data: results,
      cachedAt: new Date().toISOString()
    })

    response.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=60')
    
    return response

  } catch (error) {
    console.error('Combined dashboard API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch dashboard data'
    }, { status: 500 })
  }
} 