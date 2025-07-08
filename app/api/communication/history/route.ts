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

    // Filtering
    const recipientFilter = searchParams.get('recipient')
    const subjectFilter = searchParams.get('subject')
    const statusFilter = searchParams.get('status')
    const templateFilter = searchParams.get('template')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build where clause
    const whereClause: any = {}
    
    if (recipientFilter) {
      whereClause.OR = [
        { recipientEmail: { contains: recipientFilter, mode: 'insensitive' } },
        { recipientName: { contains: recipientFilter, mode: 'insensitive' } }
      ]
    }
    
    if (subjectFilter) {
      whereClause.subject = { contains: subjectFilter, mode: 'insensitive' }
    }
    
    if (statusFilter) {
      whereClause.status = statusFilter
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
    const filteredCount = await db.emailLog.count({ where: whereClause })

    // Main query - production-safe without template relation for now
    const emails = await db.emailLog.findMany({
      where: whereClause,
      select: {
        id: true,
        recipientEmail: true,
        recipientName: true,
        subject: true,
        status: true,
        createdAt: true,
        sentAt: true,
        failedAt: true,
        failureReason: true,
        triggeredBy: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // Transform the data for the frontend
    const transformedEmails = emails.map(log => ({
      id: log.id,
      recipientEmail: log.recipientEmail,
      recipientName: log.recipientName || '',
      subject: log.subject || '',
      status: log.status,
      createdAt: log.createdAt,
      sentAt: log.sentAt,
      failedAt: log.failedAt,
      failureReason: log.failureReason,
      triggeredBy: log.triggeredBy,
      user: log.user,
      template: null // Template data not available until schema migration
    }))

    const totalPages = Math.ceil(filteredCount / limit)

    return NextResponse.json({
      emails: transformedEmails,
      pagination: {
        page,
        limit,
        total: filteredCount,
        totalPages
      }
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch email history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 