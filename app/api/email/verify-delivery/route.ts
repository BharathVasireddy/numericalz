/**
 * Email Delivery Verification Fallback
 * 
 * This endpoint provides a fallback mechanism when webhooks fail
 * by checking emails that haven't received delivery confirmations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import type { EmailStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { emailLogId, checkAll = false } = body

    console.log('🔍 Email delivery verification requested:', { emailLogId, checkAll })

    if (checkAll) {
      // Check all emails that might be missing delivery confirmations
      const results = await checkStalePendingEmails()
      return NextResponse.json({
        success: true,
        checked_emails: results.checkedCount,
        updated_emails: results.updatedCount,
        results: results.details
      })
    } else if (emailLogId) {
      // Check specific email
      const result = await checkSpecificEmail(emailLogId)
      return NextResponse.json({
        success: true,
        email_log_id: emailLogId,
        ...result
      })
    } else {
      return NextResponse.json({
        error: 'Either emailLogId or checkAll=true is required'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('❌ Email delivery verification failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function checkStalePendingEmails() {
  // Find emails that have been "SENT" for more than 1 hour without delivery confirmation
  const staleThreshold = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
  
  const staleEmails = await db.emailLog.findMany({
    where: {
      status: 'SENT',
      sentAt: {
        lt: staleThreshold
      },
      deliveredAt: null,
      failedAt: null
    },
    orderBy: { sentAt: 'desc' },
    take: 50 // Limit to prevent overload
  })

  console.log(`🔍 Found ${staleEmails.length} stale emails to check`)

  const results = {
    checkedCount: staleEmails.length,
    updatedCount: 0,
    details: [] as any[]
  }

  for (const email of staleEmails) {
    try {
      const checkResult = await checkEmailDeliveryHeuristics(email)
      
      if (checkResult.shouldUpdate) {
        await db.emailLog.update({
          where: { id: email.id },
          data: {
            status: checkResult.newStatus as EmailStatus,
            deliveredAt: checkResult.newStatus === 'DELIVERED' ? new Date() : null,
            failedAt: checkResult.newStatus === 'FAILED' ? new Date() : null,
            failureReason: checkResult.failureReason,
            updatedAt: new Date()
          }
        })
        
        results.updatedCount++
        console.log(`✅ Updated stale email ${email.id} to ${checkResult.newStatus}`)
      }

      results.details.push({
        emailLogId: email.id,
        recipientEmail: email.recipientEmail,
        sentAt: email.sentAt,
        originalStatus: 'SENT',
        newStatus: checkResult.shouldUpdate ? checkResult.newStatus : 'SENT',
        reason: checkResult.reason,
        updated: checkResult.shouldUpdate
      })

    } catch (error) {
      console.error(`❌ Failed to check email ${email.id}:`, error)
      results.details.push({
        emailLogId: email.id,
        recipientEmail: email.recipientEmail,
        error: error instanceof Error ? error.message : 'Unknown error',
        updated: false
      })
    }
  }

  return results
}

async function checkSpecificEmail(emailLogId: string) {
  const emailLog = await db.emailLog.findUnique({
    where: { id: emailLogId }
  })

  if (!emailLog) {
    throw new Error('Email log not found')
  }

  const checkResult = await checkEmailDeliveryHeuristics(emailLog)
  
  if (checkResult.shouldUpdate) {
    await db.emailLog.update({
      where: { id: emailLogId },
      data: {
        status: checkResult.newStatus as EmailStatus,
        deliveredAt: checkResult.newStatus === 'DELIVERED' ? new Date() : null,
        failedAt: checkResult.newStatus === 'FAILED' ? new Date() : null,
        failureReason: checkResult.failureReason,
        updatedAt: new Date()
      }
    })
  }

  return {
    original_status: emailLog.status,
    new_status: checkResult.shouldUpdate ? checkResult.newStatus : emailLog.status,
    reason: checkResult.reason,
    updated: checkResult.shouldUpdate,
    check_result: checkResult
  }
}

async function checkEmailDeliveryHeuristics(emailLog: any) {
  const now = new Date()
  const sentTime = new Date(emailLog.sentAt)
  const timeSinceSent = now.getTime() - sentTime.getTime()
  const hoursSinceSent = timeSinceSent / (1000 * 60 * 60)

  console.log(`🔍 Checking email ${emailLog.id} sent ${hoursSinceSent.toFixed(1)} hours ago to ${emailLog.recipientEmail}`)

  // Heuristic 1: Very old emails without delivery confirmation are likely delivered
  if (hoursSinceSent > 24) {
    return {
      shouldUpdate: true,
      newStatus: 'DELIVERED',
      reason: 'Email sent >24h ago without bounce notification - assuming delivered',
      confidence: 'medium'
    }
  }

  // Heuristic 2: Check for obvious invalid email patterns
  const email = emailLog.recipientEmail
  const invalidPatterns = [
    /^test@/i,
    /^noreply@/i,
    /^bounce@/i,
    /@test\./i,
    /@example\./i,
    /\.test$/i,
    /\.invalid$/i
  ]

  const isObviouslyInvalid = invalidPatterns.some(pattern => pattern.test(email))
  if (isObviouslyInvalid) {
    return {
      shouldUpdate: true,
      newStatus: 'FAILED',
      failureReason: 'Email pattern suggests test/invalid address',
      reason: 'Invalid email pattern detected',
      confidence: 'high'
    }
  }

  // Heuristic 3: Check domain validity (basic check)
  const domain = email.split('@')[1]
  if (domain) {
    const commonInvalidDomains = [
      'localhost',
      '127.0.0.1',
      'test.com',
      'example.com',
      'invalid.com',
      'fake.com'
    ]

    if (commonInvalidDomains.includes(domain.toLowerCase())) {
      return {
        shouldUpdate: true,
        newStatus: 'FAILED',
        failureReason: 'Domain appears to be test/invalid domain',
        reason: 'Invalid domain detected',
        confidence: 'high'
      }
    }
  }

  // Heuristic 4: Emails older than 6 hours in business environments are usually delivered
  if (hoursSinceSent > 6 && isBusinessEmail(email)) {
    return {
      shouldUpdate: true,
      newStatus: 'DELIVERED',
      reason: 'Business email sent >6h ago without bounce - likely delivered',
      confidence: 'medium'
    }
  }

  // Heuristic 5: Check if this is a client email that should be reliable
  const isClientEmail = await isKnownClientEmail(email)
  if (isClientEmail && hoursSinceSent > 2) {
    return {
      shouldUpdate: true,
      newStatus: 'DELIVERED',
      reason: 'Known client email sent >2h ago - assuming delivered',
      confidence: 'high'
    }
  }

  // No update needed
  return {
    shouldUpdate: false,
    reason: `Email sent ${hoursSinceSent.toFixed(1)}h ago - still within normal delivery window`,
    confidence: 'low'
  }
}

function isBusinessEmail(email: string): boolean {
  const businessDomains = [
    'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com',
    'btinternet.com', 'sky.com', 'talktalk.net', 'virgin.net'
  ]
  
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? !businessDomains.includes(domain) : false
}

async function isKnownClientEmail(email: string): Promise<boolean> {
  try {
    const client = await db.client.findFirst({
      where: {
        contactEmail: email
      }
    })
    
    return !!client
  } catch (error) {
    console.warn('Failed to check if email is known client:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get statistics about email delivery status
    const stats = await getEmailDeliveryStats()
    
    return NextResponse.json({
      success: true,
      ...stats,
      instructions: {
        check_all: 'POST with {"checkAll": true} to check all stale emails',
        check_specific: 'POST with {"emailLogId": "id"} to check specific email',
        manual_check: 'Use this endpoint when webhooks are not working'
      }
    })

  } catch (error) {
    console.error('❌ Failed to get delivery stats:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getEmailDeliveryStats() {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // Get various email statistics
  const [
    totalLast24h,
    deliveredLast24h,
    bouncedLast24h,
    failedLast24h,
    stalePending
  ] = await Promise.all([
    db.emailLog.count({
      where: { createdAt: { gte: oneDayAgo } }
    }),
    db.emailLog.count({
      where: { 
        createdAt: { gte: oneDayAgo },
        status: 'DELIVERED'
      }
    }),
    db.emailLog.count({
      where: { 
        createdAt: { gte: oneDayAgo },
        status: 'BOUNCED'
      }
    }),
    db.emailLog.count({
      where: { 
        createdAt: { gte: oneDayAgo },
        status: 'FAILED'
      }
    }),
    db.emailLog.count({
      where: {
        status: 'SENT',
        sentAt: { lt: oneHourAgo },
        deliveredAt: null,
        failedAt: null
      }
    })
  ])

  const deliveryRate = totalLast24h > 0 ? 
    ((deliveredLast24h / totalLast24h) * 100).toFixed(2) : '0'
  
  const bounceRate = totalLast24h > 0 ? 
    ((bouncedLast24h / totalLast24h) * 100).toFixed(2) : '0'

  return {
    statistics: {
      last_24_hours: {
        total_emails: totalLast24h,
        delivered: deliveredLast24h,
        bounced: bouncedLast24h,
        failed: failedLast24h,
        delivery_rate: `${deliveryRate}%`,
        bounce_rate: `${bounceRate}%`
      },
      stale_pending_emails: stalePending,
      webhook_health: stalePending < 10 ? 'good' : stalePending < 50 ? 'degraded' : 'poor'
    }
  }
} 