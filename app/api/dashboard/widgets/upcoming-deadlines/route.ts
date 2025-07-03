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
    const next7Days = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000))
    const next15Days = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000))
    const next30Days = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    const next60Days = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000))
    const next90Days = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000))

    // Get all active clients with relevant deadline data
    const allClients = await db.client.findMany({
      where: { isActive: true },
      include: {
        vatQuartersWorkflow: {
          where: { isCompleted: false },
          orderBy: { quarterEndDate: 'asc' },
          take: 1
        }
      }
    })

    // Initialize deadline breakdown structure
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

    // Count deadlines by time ranges and type
    for (const client of allClients) {
      const currentDate = new Date()
      
      // Annual Accounts
      if (client.nextAccountsDue) {
        const accountsDue = new Date(client.nextAccountsDue)
        
        // Count by time ranges
        if (accountsDue >= currentDate) {
          if (accountsDue <= next7Days) deadlineBreakdown.accounts.days7++
          else if (accountsDue <= next15Days) deadlineBreakdown.accounts.days15++
          else if (accountsDue <= next30Days) deadlineBreakdown.accounts.days30++
          else if (accountsDue <= next60Days) deadlineBreakdown.accounts.days60++
          else if (accountsDue <= next90Days) deadlineBreakdown.accounts.days90++
        }
      }

      // VAT deadlines
      if (client.isVatEnabled && client.vatQuartersWorkflow.length > 0) {
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
    }

    const response = NextResponse.json({
      success: true,
      data: { deadlineBreakdown }
    })

    // Set no-cache headers for real-time updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Upcoming deadlines API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch upcoming deadlines data'
    }, { status: 500 })
  }
} 