/**
 * Resend Webhook Handler
 * 
 * This endpoint handles delivery status updates from Resend
 * to track email delivery status in real-time
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailOTPServiceResend } from '@/lib/email-otp-resend'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (recommended for production)
    const signature = request.headers.get('resend-signature')
    
    // Parse the webhook payload
    const body = await request.json()
    
    console.log('📨 Resend webhook received:', body.type, body.data?.email_id)
    
    // Process the webhook event
    await emailOTPServiceResend.handleWebhookEvent(body)
    
    // Log delivery status information
    if (body.data?.email_id) {
      logDeliveryStatus(body)
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
 * Log email delivery status
 */
function logDeliveryStatus(webhookData: any) {
  try {
    const { type, data } = webhookData
    const messageId = data?.email_id
    
    if (!messageId) return
    
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
    
    // Log delivery status
    console.log('📧 Email delivery status:', {
      messageId,
      status,
      eventType: type,
      timestamp: new Date(data.created_at || Date.now()).toISOString()
    })
    
  } catch (error) {
    console.error('❌ Error logging delivery status:', error)
  }
} 