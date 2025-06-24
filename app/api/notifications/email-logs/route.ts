import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only partners and managers can view email logs
    if (session.user.role !== 'PARTNER' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const emailType = searchParams.get('emailType')
    const clientId = searchParams.get('clientId')

    // Build where clause
    const where: any = {}
    if (status) where.status = status
    if (emailType) where.emailType = emailType
    if (clientId) where.clientId = clientId

    // Fetch email logs with related data
    const emailLogs = await db.emailLog.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true
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
      skip: offset,
      take: limit
    })

    // Get total count for pagination
    const totalCount = await db.emailLog.count({ where })

    // Transform data for frontend
    const transformedLogs = emailLogs.map(log => ({
      id: log.id,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      fromEmail: log.fromEmail,
      fromName: log.fromName,
      recipientEmail: log.recipientEmail,
      recipientName: log.recipientName,
      subject: log.subject,
      content: log.content,
      emailType: log.emailType,
      status: log.status,
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
      } : null
    }))

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

  } catch (error) {
    console.error('Error fetching email logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email logs' },
      { status: 500 }
    )
  }
} 