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
    
    // Support both pagination styles: page-based (default) and offset-based (load more)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Use offset if provided, otherwise calculate from page
    const skip = offset > 0 ? offset : (page - 1) * limit

    // Filtering - updated to match frontend parameters
    const searchTerm = searchParams.get('search') // Frontend sends 'search' not 'recipient'
    const statusFilter = searchParams.get('status')
    const emailTypeFilter = searchParams.get('emailType') // Frontend sends 'emailType'
    const userIdFilter = searchParams.get('userId') // Filter by user who triggered email
    const clientIdFilter = searchParams.get('clientId') // Filter by client
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build where clause
    const whereClause: any = {}
    
    if (searchTerm) {
      whereClause.OR = [
        { recipientEmail: { contains: searchTerm, mode: 'insensitive' } },
        { recipientName: { contains: searchTerm, mode: 'insensitive' } },
        { subject: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }
    
    if (statusFilter) {
      whereClause.status = statusFilter
    }
    
    if (emailTypeFilter) {
      whereClause.emailType = emailTypeFilter
    }
    
    if (userIdFilter) {
      whereClause.triggeredBy = userIdFilter
    }
    
    if (clientIdFilter) {
      whereClause.clientId = clientIdFilter
    }
    
    if (dateFrom || dateTo) {
      whereClause.createdAt = {}
      if (dateFrom) {
        whereClause.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.createdAt.lte = new Date(dateTo)
      }
    }

    // Get filtered count
    const totalCount = await db.emailLog.count({ where: whereClause })

    // Main query with correct relation names
    const emails = await db.emailLog.findMany({
      where: whereClause,
      select: {
        id: true,
        recipientEmail: true,
        recipientName: true,
        subject: true,
        content: true,
        emailType: true,
        status: true,
        createdAt: true,
        sentAt: true,
        deliveredAt: true,
        failedAt: true,
        failureReason: true,
        triggeredBy: true,
        triggeredByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
            clientCode: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // Transform the data for the frontend - match exact interface expected
    const emailLogs = emails.map(log => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      recipientEmail: log.recipientEmail,
      recipientName: log.recipientName || undefined,
      subject: log.subject || '',
      content: log.content || '',
      emailType: log.emailType,
      status: log.status as 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED',
      sentAt: log.sentAt?.toISOString(),
      deliveredAt: log.deliveredAt?.toISOString(),
      failedAt: log.failedAt?.toISOString(),
      failureReason: log.failureReason || undefined,
      triggeredByUser: log.triggeredByUser || undefined,
      client: log.client || undefined
    }))

    const totalPages = Math.ceil(totalCount / limit)

    // Return in the exact format the frontend expects
    return NextResponse.json({
      emailLogs,
      totalPages,
      totalCount
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch email history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 