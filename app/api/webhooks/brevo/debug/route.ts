/**
 * Brevo Webhook Debug Endpoint
 * 
 * This endpoint provides debugging information for webhooks
 * and allows testing of webhook functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const showDetails = searchParams.get('details') === 'true'

    // Get recent email logs with potential webhook data
    const recentEmails = await db.emailLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: {
        id: true,
        createdAt: true,
        recipientEmail: true,
        subject: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        failedAt: true,
        failureReason: true,
        templateData: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    // Analyze webhook status
    let webhookStats = {
      totalEmails: recentEmails.length,
      emailsWithWebhookData: 0,
      statusBreakdown: {
        PENDING: 0,
        SENT: 0,
        DELIVERED: 0,
        FAILED: 0,
        BOUNCED: 0
      },
      webhookTypes: [] as string[]
    }

    const emailsWithWebhooks = recentEmails.filter(email => {
      // Count status
      webhookStats.statusBreakdown[email.status]++

      // Check for webhook data
      if (email.templateData) {
        try {
          const data = JSON.parse(email.templateData)
          if (data.webhookReceived || data.brevoEventType || data.messageId) {
            webhookStats.emailsWithWebhookData++
            if (data.brevoEventType && !webhookStats.webhookTypes.includes(data.brevoEventType)) {
              webhookStats.webhookTypes.push(data.brevoEventType)
            }
            return true
          }
        } catch (error) {
          // Invalid JSON in templateData
        }
      }
      return false
    })

    // Calculate webhook effectiveness
    const webhookEffectiveness = webhookStats.totalEmails > 0 
      ? Math.round((webhookStats.emailsWithWebhookData / webhookStats.totalEmails) * 100)
      : 0

    // Get emails still waiting for webhook updates
    const pendingWebhooks = recentEmails.filter(email => 
      email.status === 'SENT' && 
      email.sentAt && 
      new Date(email.sentAt).getTime() < Date.now() - 5 * 60 * 1000 // Sent more than 5 minutes ago
    )

    const debugInfo = {
      webhookUrl: `${request.nextUrl.origin}/api/webhooks/brevo`,
      webhookSetupComplete: true,
      lastUpdated: new Date().toISOString(),
      stats: {
        ...webhookStats,
        webhookEffectiveness: `${webhookEffectiveness}%`,
        pendingWebhooks: pendingWebhooks.length
      }
    }

    if (showDetails) {
      return NextResponse.json({
        ...debugInfo,
        recentEmails: emailsWithWebhooks.map(email => ({
          id: email.id,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          status: email.status,
          sentAt: email.sentAt,
          deliveredAt: email.deliveredAt,
          webhookData: email.templateData ? JSON.parse(email.templateData) : null
        })),
        pendingWebhooks: pendingWebhooks.map(email => ({
          id: email.id,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          sentAt: email.sentAt,
          minutesWaiting: Math.round((Date.now() - new Date(email.sentAt!).getTime()) / 1000 / 60)
        }))
      })
    }

    return NextResponse.json(debugInfo)

  } catch (error) {
    console.error('Webhook debug error:', error)
    return NextResponse.json({
      error: 'Failed to get webhook debug info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, emailLogId } = body

    if (action === 'simulate_webhook') {
      // Simulate a webhook event for testing
      const testWebhookData = {
        event: 'delivered',
        email: 'test@example.com',
        subject: 'Test Email',
        message_id: `test_${Date.now()}`,
        date: new Date().toISOString(),
        ts: Math.floor(Date.now() / 1000)
      }

      // Send to webhook handler
      const webhookResponse = await fetch(`${request.nextUrl.origin}/api/webhooks/brevo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Webhook': 'true'
        },
        body: JSON.stringify(testWebhookData)
      })

      const result = await webhookResponse.json()

      return NextResponse.json({
        success: true,
        message: 'Test webhook sent',
        webhookResponse: result,
        testData: testWebhookData
      })
    }

    if (action === 'check_delivery' && emailLogId) {
      // Check specific email delivery status
      const email = await db.emailLog.findUnique({
        where: { id: emailLogId },
        select: {
          id: true,
          recipientEmail: true,
          subject: true,
          status: true,
          sentAt: true,
          deliveredAt: true,
          templateData: true,
          createdAt: true
        }
      })

      if (!email) {
        return NextResponse.json({
          error: 'Email not found'
        }, { status: 404 })
      }

      const webhookData = email.templateData ? JSON.parse(email.templateData) : null
      const waitingTime = email.sentAt 
        ? Math.round((Date.now() - new Date(email.sentAt).getTime()) / 1000 / 60)
        : 0

      return NextResponse.json({
        email: {
          id: email.id,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          status: email.status,
          sentAt: email.sentAt,
          deliveredAt: email.deliveredAt,
          createdAt: email.createdAt,
          minutesWaiting: waitingTime
        },
        webhookData,
        analysis: {
          hasWebhookData: !!webhookData?.webhookReceived,
          isDelivered: email.status === 'DELIVERED',
          isPending: email.status === 'SENT' && !email.deliveredAt,
          shouldHaveWebhook: email.sentAt && waitingTime > 5
        }
      })
    }

    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 })

  } catch (error) {
    console.error('Webhook debug POST error:', error)
    return NextResponse.json({
      error: 'Failed to process debug request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 