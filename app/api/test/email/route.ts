/**
 * Test Email API - Resend Service
 * 
 * This endpoint tests the new Resend email service
 * to verify it's working correctly
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailOTPServiceResend } from '@/lib/email-otp-resend'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Resend email service...')
    
    // Test email parameters
    const testEmail = 'vasireddybharatsai@gmail.com'
    const testName = 'Bharat Test'
    const testOTP = '123456'
    
    // Send test email
    const result = await emailOTPServiceResend.sendOTP({
      email: testEmail,
      name: testName,
      otpCode: testOTP
    })
    
    console.log('🧪 Test email result:', result)
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent',
      result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Test email error:', error)
    return NextResponse.json(
      { 
        error: 'Test email failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 