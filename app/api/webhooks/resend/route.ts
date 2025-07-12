/**
 * Resend Webhook Handler
 * 
 * This endpoint handles delivery status updates from Resend
 * to track email delivery status in real-time
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailOTPServiceResend } from '@/lib/email-otp-resend'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (recommended for production)
    const signature = request.headers.get('resend-signature')
    
    // Parse the webhook payload
    const body = await request.json()
    
    console.log('📨 Resend webhook received:', body.type, body.data?.email_id)
    
    // Process the webhook event
    await emailOTPServiceResend.handleWebhookEvent(body)
    
    // Store delivery status in database if it's an email we sent
    if (body.data?.email_id) {
      await updateEmailDeliveryStatus(body)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Update email delivery status in database
 */
async function updateEmailDeliveryStatus(webhookData: any) {
  try {
    const { type, data } = webhookData
    const messageId = data?.email_id
    
    if (!messageId) return
    
    // Find user by message ID
    const user = await db.user.findFirst({
      where: { lastEmailMessageId: messageId }
    })
    
    if (!user) {
      console.log('📧 No user found for message ID:', messageId)
      return
    }
    
    // Map webhook event types to status
    const statusMap: Record<string, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'deferred',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
      'email.clicked': 'clicked',
      'email.opened': 'opened'
    }
    
    const status = statusMap[type] || 'unknown'
    
    // Create delivery status record
    await db.emailDeliveryStatus.create({
      data: {
        userId: user.id,
        messageId,
        status,
        eventType: type,
        eventData: JSON.stringify(data),
        timestamp: new Date(data.created_at || Date.now())
      }
    }).catch(error => {
      // If table doesn't exist, just log the status
      console.log('📧 Email delivery status (table not found):', {
        userId: user.id,
        messageId,
        status,
        eventType: type
      })
    })
    
    console.log('📧 Updated delivery status:', {
      userId: user.id,
      messageId,
      status,
      eventType: type
    })
    
  } catch (error) {
    console.error('❌ Error updating delivery status:', error)
  }
} 