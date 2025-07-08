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

    // Get current date for calculations (force UTC to avoid timezone issues)
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
    const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999))

    // Get all active clients with relevant deadline data
    const allClients = await db.client.findMany({
      where: { isActive: true },
      include: {
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

    // Calculate monthly deadlines
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

    // Get current month name
    const monthName = now.toLocaleDateString('en-GB', { month: 'long' })

    const response = NextResponse.json({
      success: true,
      data: { 
        monthlyDeadlines,
        monthName 
      }
    })

    // Set no-cache headers for real-time updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Monthly deadlines API error:', error)
    return NextResponse.json({
      error: 'Failed to fetch monthly deadlines data'
    }, { status: 500 })
  }
} 