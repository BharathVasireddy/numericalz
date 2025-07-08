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

    // 🔍 DEBUG: Comprehensive production debugging
    console.log('🔍 [EMAIL DEBUG] Starting email history request...')
    console.log('🔍 [EMAIL DEBUG] Session user:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      name: session.user.name
    })

    const { searchParams } = new URL(request.url)
    
    // Support both pagination styles: page-based (default) and offset-based (load more)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Use offset if provided, otherwise calculate from page
    const skip = offset > 0 ? offset : (page - 1) * limit
    
    console.log('🔍 [EMAIL DEBUG] Query params:', { page, limit, offset, skip })

    // 🔍 DEBUG: Test basic database connection
    try {
      const dbTest = await db.$queryRaw`SELECT 1 as test`
      console.log('🔍 [EMAIL DEBUG] Database connection test:', dbTest)
    } catch (dbError) {
      console.error('🚨 [EMAIL DEBUG] Database connection failed:', dbError)
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    // 🔍 DEBUG: Check if EmailLog table exists and get count
    try {
      const totalCount = await db.emailLog.count()
      console.log('🔍 [EMAIL DEBUG] Total emails in database:', totalCount)
      
      if (totalCount === 0) {
        console.log('🚨 [EMAIL DEBUG] No emails found in database!')
        return NextResponse.json({
          emails: [],
          pagination: {
            page: 1,
            limit: limit,
            total: 0,
            totalPages: 0
          }
        })
      }
    } catch (countError) {
      console.error('🚨 [EMAIL DEBUG] Failed to count emails:', countError)
      return NextResponse.json({ error: 'Failed to count emails' }, { status: 500 })
    }

    // 🔍 DEBUG: Check table structure
    try {
      const firstEmail = await db.emailLog.findFirst()
      console.log('🔍 [EMAIL DEBUG] First email structure:', firstEmail)
    } catch (structureError) {
      console.error('🚨 [EMAIL DEBUG] Failed to get first email:', structureError)
    }

    // Filtering
    const recipientFilter = searchParams.get('recipient')
    const subjectFilter = searchParams.get('subject')
    const statusFilter = searchParams.get('status')
    const templateFilter = searchParams.get('template')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    console.log('🔍 [EMAIL DEBUG] Filters:', {
      recipientFilter,
      subjectFilter,
      statusFilter,
      templateFilter,
      dateFrom,
      dateTo
    })

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

    console.log('🔍 [EMAIL DEBUG] Where clause:', JSON.stringify(whereClause, null, 2))

    // 🔍 DEBUG: Test filtered count
    const filteredCount = await db.emailLog.count({ where: whereClause })
    console.log('🔍 [EMAIL DEBUG] Filtered count:', filteredCount)

    // Main query - simplified without template relation
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

    console.log('🔍 [EMAIL DEBUG] Query results:', {
      emailsFound: emails.length,
      firstEmailId: emails[0]?.id,
      firstEmailSubject: emails[0]?.subject,
      firstEmailRecipient: emails[0]?.recipientEmail
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
      template: null // Template data not available in production schema
    }))

    const totalPages = Math.ceil(filteredCount / limit)

    console.log('🔍 [EMAIL DEBUG] Final response:', {
      emailsCount: transformedEmails.length,
      pagination: {
        page,
        limit,
        total: filteredCount,
        totalPages
      }
    })

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
    console.error('🚨 [EMAIL DEBUG] API Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch email history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 