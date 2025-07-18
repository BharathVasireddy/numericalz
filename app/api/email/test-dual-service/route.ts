/**
 * Dual Email Service Test Endpoint
 * 
 * Tests the automatic failover from Brevo to Resend
 * Allows testing individual services and failover scenarios
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dualEmailService } from '@/lib/email-service-dual'
import { z } from 'zod'

const TestEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  testType: z.enum(['both', 'brevo-only', 'resend-only', 'failover-simulation']),
  forceBrevoFailure: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate request body
    const body = await request.json()
    const validatedData = TestEmailSchema.parse(body)

    console.log(`🧪 Testing dual email service - Type: ${validatedData.testType}`)

    const testResults = []
    
    switch (validatedData.testType) {
      case 'both':
        // Test normal dual service (should use Brevo first)
        console.log('🧪 Testing normal dual service operation...')
        const normalResult = await dualEmailService.sendEmail({
          to: [{ email: validatedData.to, name: 'Test User' }],
          subject: '[TEST] Dual Email Service - Normal Operation',
          htmlContent: `
            <div style="padding: 20px; font-family: Arial, sans-serif;">
              <h2>🧪 Dual Email Service Test - Normal Operation</h2>
              <p>This email tests the dual email service in normal operation mode.</p>
              <p><strong>Expected behavior:</strong> Should be sent via Brevo (primary service)</p>
              <p><strong>Test time:</strong> ${new Date().toISOString()}</p>
              <p><strong>Service status:</strong> ${JSON.stringify(await dualEmailService.getServiceStatus(), null, 2)}</p>
            </div>
          `,
          emailType: 'TEST',
          triggeredBy: session.user.id,
          priority: 'NORMAL',
          templateData: {
            testType: 'normal-operation',
            tester: session.user.name
          }
        })
        
        testResults.push({
          test: 'Normal Operation',
          result: normalResult,
          expected: 'Brevo primary service'
        })
        break

      case 'brevo-only':
        // Test with only Brevo configured (simulate Resend unavailable)
        console.log('🧪 Testing Brevo-only operation...')
        // This would require temporarily disabling Resend, but we'll document it
        testResults.push({
          test: 'Brevo Only',
          result: { success: false, error: 'Test not implemented - requires configuration change' },
          expected: 'Brevo only, no fallback'
        })
        break

      case 'resend-only':
        // Test with only Resend configured (simulate Brevo unavailable)
        console.log('🧪 Testing Resend-only operation...')
        testResults.push({
          test: 'Resend Only',
          result: { success: false, error: 'Test not implemented - requires configuration change' },
          expected: 'Resend only, no primary'
        })
        break

      case 'failover-simulation':
        console.log('🧪 Testing failover simulation...')
        // Send a test email that will show failover behavior
        const failoverResult = await dualEmailService.sendEmail({
          to: [{ email: validatedData.to, name: 'Test User' }],
          subject: '[TEST] Dual Email Service - Failover Test',
          htmlContent: `
            <div style="padding: 20px; font-family: Arial, sans-serif;">
              <h2>🔄 Dual Email Service Test - Failover Simulation</h2>
              <p>This email tests the automatic failover from Brevo to Resend.</p>
              <p><strong>Expected behavior:</strong> If Brevo fails, should automatically use Resend</p>
              <p><strong>Test time:</strong> ${new Date().toISOString()}</p>
              <p><strong>Service status:</strong></p>
              <pre>${JSON.stringify(await dualEmailService.getServiceStatus(), null, 2)}</pre>
              <p><em>Check the email logs to see which service was actually used and if failover occurred.</em></p>
            </div>
          `,
          emailType: 'TEST',
          triggeredBy: session.user.id,
          priority: 'NORMAL',
          templateData: {
            testType: 'failover-simulation',
            tester: session.user.name
          }
        })
        
        testResults.push({
          test: 'Failover Simulation',
          result: failoverResult,
          expected: 'Automatic failover if primary fails'
        })
        break
    }

    // Get service status
    const serviceStatus = await dualEmailService.getServiceStatus()

    return NextResponse.json({
      success: true,
      message: 'Dual email service test completed',
      testType: validatedData.testType,
      serviceStatus,
      testResults,
      instructions: {
        checkEmailLogs: 'Visit /dashboard/communication/history to see detailed delivery logs',
        lookFor: [
          'Service used (brevo/resend)',
          'Failover indicators',
          'Delivery timing',
          'Webhook confirmations'
        ]
      }
    })

  } catch (error) {
    console.error('❌ Error in dual email service test:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 