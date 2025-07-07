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

    // 🔍 DEBUG: Log session info
    console.log('🔍 [EMAIL DEBUG] Session user:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      name: session.user.name
    })

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

    // 🔍 DEBUG: Log query params
    console.log('🔍 [EMAIL DEBUG] Query params:', {
      page, limit, offset, useOffset, status, emailType, clientId, userId, search
    })

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

    // 🔍 DEBUG: Log where clause before querying
    console.log('🔍 [EMAIL DEBUG] Where clause:', JSON.stringify(whereClause, null, 2))

    // 🔍 DEBUG: First, let's check total emails in database without any filters
    const totalEmailsInDb = await db.emailLog.count()
    console.log('🔍 [EMAIL DEBUG] Total emails in database (no filters):', totalEmailsInDb)

    // Get total count for pagination
    const totalCount = await db.emailLog.count({
      where: whereClause
    })

    // 🔍 DEBUG: Log count with filters
    console.log('🔍 [EMAIL DEBUG] Total count with filters:', totalCount)

    // 🔍 DEBUG: Let's also check if there are any emails for this user specifically
    if (session.user.role === 'STAFF') {
      const userEmailCount = await db.emailLog.count({
        where: { triggeredBy: session.user.id }
      })
      console.log('🔍 [EMAIL DEBUG] Emails for current user ID:', userEmailCount)
    }

    // 🔍 DEBUG: Let's check sample emails to understand the data structure
    const sampleEmails = await db.emailLog.findMany({
      take: 3,
      select: {
        id: true,
        recipientEmail: true,
        subject: true,
        triggeredBy: true,
        createdAt: true,
        status: true,
        emailType: true
      },
      orderBy: { createdAt: 'desc' }
    })
    console.log('🔍 [EMAIL DEBUG] Sample emails:', JSON.stringify(sampleEmails, null, 2))

    // Get email logs with enhanced data (from Email Logs)
    // Try to include template data, fallback if templateId field doesn't exist (production)
    let emailLogs
    try {
      emailLogs = await db.emailLog.findMany({
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
              role: true
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
    } catch (templateError) {
      console.log('Template relation failed, using fallback without template:', templateError instanceof Error ? templateError.message : String(templateError))
      // Fallback for production: query without template relation
      emailLogs = await db.emailLog.findMany({
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
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      })
    }

    // 🔍 DEBUG: Log results
    console.log('🔍 [EMAIL DEBUG] Found email logs:', emailLogs.length)
    console.log('🔍 [EMAIL DEBUG] First email log:', emailLogs[0] ? {
      id: emailLogs[0].id,
      recipientEmail: emailLogs[0].recipientEmail,
      subject: emailLogs[0].subject,
      triggeredBy: emailLogs[0].triggeredBy,
      triggeredByUser: emailLogs[0].triggeredByUser ? {
        id: emailLogs[0].triggeredByUser.id,
        name: emailLogs[0].triggeredByUser.name,
        email: emailLogs[0].triggeredByUser.email
      } : null
    } : 'No emails found')

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
      template: (log as any).template ? {
        id: (log as any).template.id,
        name: (log as any).template.name,
        category: (log as any).template.category
      } : null
    }))

    const totalPages = Math.ceil(totalCount / limit)

    // 🔍 DEBUG: Log final response data
    console.log('🔍 [EMAIL DEBUG] Final response:', {
      totalCount,
      totalPages,
      currentPage: page,
      transformedLogsCount: transformedLogs.length,
      useOffset
    })

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