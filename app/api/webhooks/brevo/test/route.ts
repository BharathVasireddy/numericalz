/**
 * Brevo Webhook Testing Endpoint
 * 
 * This endpoint helps test and verify webhook functionality
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Test webhook by sending to actual webhook handler
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/webhooks/brevo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
    
    const result = await webhookResponse.json()
    
    console.log('🧪 Webhook test completed:', {
      testData: body,
      webhookResponse: result,
      statusCode: webhookResponse.status
    })
    
    return NextResponse.json({
      success: true,
      test_result: result,
      webhook_status: webhookResponse.status,
      message: 'Test webhook sent to handler'
    })
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const testType = searchParams.get('type') || 'delivered'
  
  // Generate test webhook data
  const testWebhookData = {
    delivered: {
      event: "delivered",
      email: "test@example.com",
      date: new Date().toISOString(),
      "message-id": "<test-message-id@brevo.com>",
      tag: "test-webhook"
    },
    hard_bounce: {
      event: "hard_bounce", 
      email: "invalid@example.com",
      date: new Date().toISOString(),
      "message-id": "<test-bounce-id@brevo.com>",
      reason: "550 No such user here",
      tag: "test-webhook"
    },
    opened: {
      event: "opened",
      email: "test@example.com", 
      date: new Date().toISOString(),
      "message-id": "<test-open-id@brevo.com>",
      ip: "192.168.1.100",
      "user-agent": "Mozilla/5.0 (Test Browser)"
    }
  }
  
  return NextResponse.json({
    success: true,
    available_tests: Object.keys(testWebhookData),
    test_data: testWebhookData[testType as keyof typeof testWebhookData] || testWebhookData.delivered,
    instructions: `Use POST to send test data, or GET with ?type=${testType} to see test data`
  })
} 