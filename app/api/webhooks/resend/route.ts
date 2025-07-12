/**
 * Resend Webhook Handler
 * 
 * This endpoint handles delivery status updates from Resend
 * to track email delivery status in real-time
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailOTPService } from '@/lib/email-otp'
import { createHmac } from 'crypto'

// Store webhook events in memory for testing (you can replace this with database later)
const webhookEvents: any[] = []

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()
    
    // Enhanced logging - show what we're actually receiving
    console.log('📨 Raw webhook body:', body)
    console.log('📨 Request headers:', Object.fromEntries(request.headers))
    
    // Verify webhook signature
    const signature = request.headers.get('resend-signature')
    const signingSecret = process.env.RESEND_WEBHOOK_SECRET
    
    if (!signingSecret) {
      console.error('❌ Missing RESEND_WEBHOOK_SECRET environment variable')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }
    
    if (!signature) {
      console.error('❌ Missing resend-signature header')
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      )
    }
    
    // Verify signature
    const expectedSignature = createHmac('sha256', signingSecret)
      .update(body)
      .digest('hex')
    
    if (`sha256=${expectedSignature}` !== signature) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    // Parse webhook data
    let webhookData
    try {
      webhookData = JSON.parse(body)
    } catch (parseError) {
      console.error('❌ Invalid JSON in webhook body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }
    
    // Store the webhook event
    const webhookEvent = {
      timestamp: new Date().toISOString(),
      type: webhookData.type,
      data: webhookData.data,
      signature: signature,
      verified: true
    }
    
    webhookEvents.push(webhookEvent)
    
    // Keep only last 100 events
    if (webhookEvents.length > 100) {
      webhookEvents.shift()
    }
    
    // Log the event
    console.log('📨 Webhook event received:', webhookData.type, webhookData.data?.email_id)
    
    // Handle the webhook event (you can expand this based on your needs)
    // For now, just log it
    console.log('📨 Webhook event processed successfully')
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('❌ Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const type = searchParams.get('type')
    
    // Filter events if type is specified
    let filteredEvents = webhookEvents
    if (type) {
      filteredEvents = webhookEvents.filter(event => event.type === type)
    }
    
    // Get the most recent events
    const recentEvents = filteredEvents.slice(-limit).reverse()
    
    return NextResponse.json({
      success: true,
      events: recentEvents,
      total: filteredEvents.length
    })
    
  } catch (error) {
    console.error('❌ Error retrieving webhook events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 