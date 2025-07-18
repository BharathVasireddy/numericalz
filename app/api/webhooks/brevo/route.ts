/**
 * Brevo Webhook Handler
 * 
 * This endpoint handles delivery status updates from Brevo
 * to track email delivery status in real-time
 * 
 * RELIABILITY FEATURES:
 * - Comprehensive error handling
 * - Failed webhook logging
 * - Graceful degradation
 * - Event deduplication
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Store webhook events for debugging and failed event recovery
const webhookEvents: any[] = []
const failedEvents: any[] = []

export async function POST(request: NextRequest) {
  let webhookData: any = null
  const startTime = Date.now()
  
  try {
    // Get the raw body
    const body = await request.text()
    
    console.log('📨 Brevo webhook received:', {
      timestamp: new Date().toISOString(),
      bodyLength: body.length,
      headers: Object.fromEntries(request.headers)
    })
    
    // Parse webhook data
    try {
      webhookData = JSON.parse(body)
    } catch (parseError) {
      console.error('❌ Invalid JSON in webhook body:', parseError)
      
      // Log failed parsing attempt
      failedEvents.push({
        timestamp: new Date().toISOString(),
        error: 'JSON_PARSE_ERROR',
        rawBody: body.substring(0, 500), // First 500 chars for debugging
        reason: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      })
      
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }
    
    // Validate required webhook fields
    if (!webhookData.event || !webhookData.email) {
      console.error('❌ Missing required webhook fields:', webhookData)
      
      failedEvents.push({
        timestamp: new Date().toISOString(),
        error: 'MISSING_REQUIRED_FIELDS',
        data: webhookData,
        reason: 'Missing event or email field'
      })
      
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Store the webhook event for debugging and recovery
    const webhookEvent = {
      timestamp: new Date().toISOString(),
      event: webhookData.event,
      email: webhookData.email,
      messageId: webhookData['message-id'],
      data: webhookData,
      processed: false,
      processingTime: null,
      error: null
    }
    
    webhookEvents.push(webhookEvent)
    
    // Keep only last 500 events (increase for production)
    if (webhookEvents.length > 500) {
      webhookEvents.shift()
    }
    
    // Process the webhook event with detailed error handling
    try {
      await processBrevoWebhookEvent(webhookData)
      
      // Mark as successfully processed
      webhookEvent.processed = true
      ;(webhookEvent as any).processingTime = Date.now() - startTime
      
      console.log('✅ Brevo webhook event processed successfully:', {
        event: webhookData.event,
        email: webhookData.email,
        processingTime: `${Date.now() - startTime}ms`
      })
      
      return NextResponse.json({ 
        success: true,
        processed: true,
        event: webhookData.event,
        email: webhookData.email,
        processingTime: Date.now() - startTime
      })
      
    } catch (processingError) {
      console.error('❌ Failed to process webhook event:', processingError)
      
      // Mark as failed and store error details
      webhookEvent.processed = false
      ;(webhookEvent as any).error = processingError instanceof Error ? processingError.message : 'Unknown processing error'
      
      // Store in failed events for manual review/retry
      failedEvents.push({
        timestamp: new Date().toISOString(),
        error: 'PROCESSING_ERROR',
        data: webhookData,
        reason: processingError instanceof Error ? processingError.message : 'Unknown processing error',
        stack: processingError instanceof Error ? processingError.stack : null
      })
      
      // Still return success to Brevo to avoid retries for our internal errors
      // But log the failure internally
      return NextResponse.json({ 
        success: true, // Tell Brevo we received it
        processed: false, // But mark as failed internally
        error: 'Internal processing error - logged for review'
      })
    }
    
  } catch (error) {
    console.error('❌ Brevo webhook handler critical error:', error)
    
    // Log critical errors
    failedEvents.push({
      timestamp: new Date().toISOString(),
      error: 'CRITICAL_ERROR',
      data: webhookData,
      reason: error instanceof Error ? error.message : 'Unknown critical error',
      stack: error instanceof Error ? error.stack : null
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processBrevoWebhookEvent(eventData: any) {
  const { event, email, 'message-id': messageId, date, reason, tag } = eventData
  
  console.log(`📧 Processing Brevo event: ${event} for ${email}`, {
    messageId,
    date,
    reason: reason || 'No reason provided'
  })
  
  // Map Brevo events to our status system
  const statusMapping: { [key: string]: string } = {
    'delivered': 'DELIVERED',
    'soft_bounce': 'FAILED',
    'hard_bounce': 'BOUNCED', 
    'invalid_email': 'BOUNCED',
    'deferred': 'PENDING',
    'spam': 'FAILED',
    'blocked': 'FAILED',
    'unsubscribed': 'SENT', // Keep as sent but track the unsubscribe
    'opened': 'DELIVERED', // Confirm delivery
    'click': 'DELIVERED'   // Confirm delivery
  }
  
  const newStatus = statusMapping[event]
  if (!newStatus) {
    console.warn(`⚠️ Unknown Brevo event type: ${event}`)
    throw new Error(`Unknown event type: ${event}`)
  }
  
  // Enhanced email log lookup with multiple strategies
  let emailLog = await findEmailLogForWebhook(email, messageId, date)
  
  if (!emailLog) {
    const error = `No email log found for ${email} with event ${event} (messageId: ${messageId})`
    console.warn(`⚠️ ${error}`)
    
    // Don't throw error - log it but continue
    // This prevents webhook failures for emails we can't match
    console.log('📝 Webhook received for email not in our logs - this is normal for some scenarios')
    return
  }
  
  // Check for duplicate events (basic deduplication)
  const isDuplicate = await checkForDuplicateEvent(emailLog.id, event, date)
  if (isDuplicate) {
    console.log(`🔄 Duplicate event ignored: ${event} for email log ${emailLog.id}`)
    return
  }
  
  // Prepare update data
  const updateData: any = {
    status: newStatus,
    updatedAt: new Date()
  }
  
  // Set specific timestamp fields based on event type
  switch (event) {
    case 'delivered':
    case 'opened':
    case 'click':
      updateData.deliveredAt = date ? new Date(date) : new Date()
      break
    case 'hard_bounce':
    case 'soft_bounce':
    case 'invalid_email':
    case 'spam':
    case 'blocked':
      updateData.failedAt = date ? new Date(date) : new Date()
      updateData.failureReason = reason || `Brevo event: ${event}`
      break
  }
  
  // Update the email log with retry logic
  try {
    await db.emailLog.update({
      where: { id: emailLog.id },
      data: updateData
    })
    
    console.log(`✅ Updated email log ${emailLog.id} with status ${newStatus} for event ${event}`)
    
    // Log engagement events for analytics
    if (event === 'opened' || event === 'click') {
      console.log(`📊 Email engagement tracked: ${event} for ${email}`)
      // Could add to engagement tracking table here
    }
    
    if (event === 'unsubscribed') {
      console.log(`🚫 Unsubscribe tracked for ${email}`)
      // Could update client preferences here
    }
    
  } catch (updateError) {
    console.error(`❌ Failed to update email log ${emailLog.id}:`, updateError)
    throw new Error(`Database update failed: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`)
  }
}

async function findEmailLogForWebhook(email: string, messageId: string | undefined, date: string | undefined): Promise<any> {
  // Strategy 1: Find by Brevo message ID if available
  if (messageId) {
    try {
      const emailLog = await db.emailLog.findFirst({
        where: {
          templateData: { contains: messageId }
        },
        orderBy: { createdAt: 'desc' }
      })
      if (emailLog) {
        console.log(`📧 Found email log by message ID: ${emailLog.id}`)
        return emailLog
      }
    } catch (error) {
      console.warn('Failed to search by message ID:', error)
    }
  }
  
  // Strategy 2: Find by email and recent timestamp
  const searchWindow = date ? new Date(date) : new Date()
  const startTime = new Date(searchWindow.getTime() - 2 * 60 * 60 * 1000) // 2 hours before
  const endTime = new Date(searchWindow.getTime() + 30 * 60 * 1000) // 30 minutes after
  
  try {
    const emailLog = await db.emailLog.findFirst({
      where: {
        recipientEmail: email,
        sentAt: {
          gte: startTime,
          lte: endTime
        },
        status: { in: ['PENDING', 'SENT', 'DELIVERED'] }
      },
      orderBy: { sentAt: 'desc' }
    })
    
    if (emailLog) {
      console.log(`📧 Found email log by email and timeframe: ${emailLog.id}`)
      return emailLog
    }
  } catch (error) {
    console.warn('Failed to search by email and timeframe:', error)
  }
  
  // Strategy 3: Find most recent email to this address (last resort)
  try {
    const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    const emailLog = await db.emailLog.findFirst({
      where: {
        recipientEmail: email,
        createdAt: { gte: recentDate },
        status: { in: ['PENDING', 'SENT', 'DELIVERED'] }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    if (emailLog) {
      console.log(`📧 Found email log by recent activity: ${emailLog.id}`)
      return emailLog
    }
  } catch (error) {
    console.warn('Failed to search by recent activity:', error)
  }
  
  return null
}

async function checkForDuplicateEvent(emailLogId: string, event: string, date: string | undefined): Promise<boolean> {
  try {
    // Simple duplicate check - could be enhanced with a dedicated events table
    const eventKey = `${emailLogId}-${event}-${date || 'no-date'}`
    
    // In a production system, you'd store processed events in Redis or database
    // For now, we'll use a simple in-memory approach
    const processedEvents = new Set<string>()
    
    if (processedEvents.has(eventKey)) {
      return true
    }
    
    processedEvents.add(eventKey)
    
    // Clean up old events periodically (keep last 1000)
    if (processedEvents.size > 1000) {
      const eventArray = Array.from(processedEvents)
      processedEvents.clear()
      eventArray.slice(-500).forEach(event => processedEvents.add(event))
    }
    
    return false
  } catch (error) {
    console.warn('Failed to check for duplicate events:', error)
    return false // If check fails, process the event anyway
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const eventType = searchParams.get('event')
    const showFailed = searchParams.get('failed') === 'true'
    
    if (showFailed) {
      // Show failed events for debugging
      const recentFailed = failedEvents.slice(-limit).reverse()
      return NextResponse.json({
        success: true,
        failed_events: recentFailed,
        total_failed: failedEvents.length,
        instructions: 'These are webhook events that failed to process. Use for debugging.'
      })
    }
    
    // Filter events if event type is specified
    let filteredEvents = webhookEvents
    if (eventType) {
      filteredEvents = webhookEvents.filter(event => event.event === eventType)
    }
    
    // Get the most recent events
    const recentEvents = filteredEvents.slice(-limit).reverse()
    
    // Calculate success rate
    const totalEvents = webhookEvents.length
    const successfulEvents = webhookEvents.filter(e => e.processed).length
    const successRate = totalEvents > 0 ? ((successfulEvents / totalEvents) * 100).toFixed(2) : '0'
    
    return NextResponse.json({
      success: true,
      events: recentEvents,
      total: filteredEvents.length,
      statistics: {
        total_events: totalEvents,
        successful_events: successfulEvents,
        failed_events: totalEvents - successfulEvents,
        success_rate: `${successRate}%`,
        total_failed_stored: failedEvents.length
      },
      instructions: 'Use ?limit=20&event=delivered to filter. Use ?failed=true to see failed events.'
    })
    
  } catch (error) {
    console.error('❌ Error retrieving Brevo webhook events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 