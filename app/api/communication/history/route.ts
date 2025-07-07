import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/communication/history - Get email history with pagination and filtering
// Enhanced with all Email Logs functionality
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Support both pagination styles: page-based (default) and offset-based (load more)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const useOffset = searchParams.has('offset') // Use offset if explicitly provided
    
    // Enhanced filtering options (from Email Logs)
    const status = searchParams.get('status')
    const emailType = searchParams.get('emailType')
    const clientId = searchParams.get('clientId')
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')

    const skip = useOffset ? offset : (page - 1) * limit

    // Build where clause with enhanced filtering
    const whereClause: any = {}

    if (status && status !== 'all') {
      whereClause.status = status
    }

    if (emailType && emailType !== 'all') {
      whereClause.emailType = emailType
    }

    // Enhanced filtering from Email Logs
    if (clientId) {
      whereClause.clientId = clientId
    }

    if (userId) {
      whereClause.triggeredBy = userId
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

    // For staff users, only show emails they sent (unless specific user filter is applied)
    if (session.user.role === 'STAFF' && !userId) {
      whereClause.triggeredBy = session.user.id
    }

    // Get total count for pagination
    const totalCount = await db.emailLog.count({
      where: whereClause
    })

    // Get email logs with enhanced data (from Email Logs)
    // Note: template relation removed due to missing templateId field in production
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
            email: true,
            role: true // Enhanced: include role
          }
        }
        // template: {  // REMOVED: templateId field doesn't exist in production
        //   select: {
        //     id: true,
        //     name: true,
        //     category: true
        //   }
        // }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    // Enhanced response with all Email Logs data
    const transformedLogs = emailLogs.map(log => ({
      id: log.id,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      // Enhanced: Include all technical metadata from Email Logs
      fromEmail: log.fromEmail,
      fromName: log.fromName,
      recipientEmail: log.recipientEmail,
      recipientName: log.recipientName,
      subject: log.subject,
      content: log.content,
      emailType: log.emailType,
      status: log.status,
      // Enhanced: Include all delivery tracking fields
      sentAt: log.sentAt,
      deliveredAt: log.deliveredAt,
      failedAt: log.failedAt,
      failureReason: log.failureReason,
      workflowType: log.workflowType,
      client: log.client ? {
        id: log.client.id,
        clientCode: log.client.clientCode,
        companyName: log.client.companyName
      } : null,
      triggeredByUser: log.triggeredByUser ? {
        id: log.triggeredByUser.id,
        name: log.triggeredByUser.name,
        email: log.triggeredByUser.email,
        role: log.triggeredByUser.role
      } : null,
      template: null // REMOVED: templateId field doesn't exist in production
    }))

    const totalPages = Math.ceil(totalCount / limit)

    // Enhanced response format supporting both pagination styles
    if (useOffset) {
      // Email Logs style response (offset-based)
      return NextResponse.json({
        success: true,
        data: {
          emailLogs: transformedLogs,
          pagination: {
            total: totalCount,
            limit,
            offset,
            hasMore: offset + limit < totalCount
          }
        }
      })
    } else {
      // Email History style response (page-based)
      return NextResponse.json({
        success: true,
        emailLogs: transformedLogs,
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      })
    }

  } catch (error) {
    console.error('Error fetching email history:', error)
    return NextResponse.json({
      error: 'Failed to fetch email history'
    }, { status: 500 })
  }
} 