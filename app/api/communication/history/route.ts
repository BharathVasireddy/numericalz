import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/communication/history - Get email history with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status')
    const emailType = searchParams.get('emailType')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}

    if (status && status !== 'all') {
      whereClause.status = status
    }

    if (emailType && emailType !== 'all') {
      whereClause.emailType = emailType
    }

    if (search) {
      whereClause.OR = [
        { recipientEmail: { contains: search, mode: 'insensitive' } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { 
          client: { 
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { clientCode: { contains: search, mode: 'insensitive' } }
            ]
          }
        }
      ]
    }

    // For staff users, only show emails they sent
    if (session.user.role === 'STAFF') {
      whereClause.triggeredBy = session.user.id
    }

    // Get total count for pagination
    const totalCount = await db.emailLog.count({
      where: whereClause
    })

    // Get email logs with pagination
    const emailLogs = await db.emailLog.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            clientCode: true
          }
        },
        triggeredByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      emailLogs,
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    })

  } catch (error) {
    console.error('Error fetching email history:', error)
    return NextResponse.json({
      error: 'Failed to fetch email history'
    }, { status: 500 })
  }
} 