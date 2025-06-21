import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all clients with deadline data
    const clients = await db.client.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        companyNumber: true,
        nextAccountsDue: true,
        nextConfirmationDue: true,
        nextCorporationTaxDue: true,
        nextVatReturnDue: true,
        assignedUserId: true,
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        companyName: 'asc'
      }
    })

    // Add debug info about which deadline fields are populated
    const debugInfo = clients.map(client => ({
      ...client,
      deadlineFields: {
        hasAccountsDue: !!client.nextAccountsDue,
        hasConfirmationDue: !!client.nextConfirmationDue,
        hasCorporationTaxDue: !!client.nextCorporationTaxDue,
        hasVatReturnDue: !!client.nextVatReturnDue,
        hasAnyDeadline: !!(client.nextAccountsDue || client.nextConfirmationDue || client.nextCorporationTaxDue || client.nextVatReturnDue)
      }
    }))

    return NextResponse.json({
      total: clients.length,
      clients: debugInfo,
      summary: {
        clientsWithDeadlines: debugInfo.filter(c => c.deadlineFields.hasAnyDeadline).length,
        clientsWithoutDeadlines: debugInfo.filter(c => !c.deadlineFields.hasAnyDeadline).length
      }
    })

  } catch (error) {
    console.error('Error fetching client debug info:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}