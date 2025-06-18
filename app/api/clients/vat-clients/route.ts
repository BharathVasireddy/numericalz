import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/clients/vat-clients
 * 
 * Fetch all clients with VAT numbers for VAT Deadline Tracker
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const vatQuarters = searchParams.get('vatQuarters') || ''

    // Build where clause for VAT clients only
    const where: any = {
      isActive: true,
      vatNumber: {
        
        not: ''
      }
    }

    // Search across multiple fields
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { vatNumber: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filter by VAT quarters
    if (vatQuarters) {
      where.vatQuarters = vatQuarters
    }

    // For staff users, only show their assigned clients
    if (session.user.role === 'STAFF') {
      where.assignedUserId = session.user.id
    }

    // Fetch VAT clients with relevant fields
    const clients = await db.client.findMany({
      where,
      select: {
        id: true,
        clientCode: true,
        companyName: true,
        companyType: true,
        contactEmail: true,
        contactPhone: true,
        vatNumber: true,
        vatQuarters: true,
        isActive: true,
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { vatQuarters: 'asc' },
        { companyName: 'asc' }
      ],
    })

    return NextResponse.json({
      success: true,
      clients,
    })

  } catch (error) {
    console.error('VAT clients fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 