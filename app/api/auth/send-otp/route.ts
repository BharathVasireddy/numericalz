// 🔒 AUTHENTICATION SYSTEM - LOCKED & PROTECTED
// ⚠️ CRITICAL WARNING: DO NOT MODIFY THIS FILE WITHOUT EXTREME CAUTION
// This file is part of the working authentication system - see AUTHENTICATION_LOCK.md

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { emailOTPService, generateOTPCode, getOTPExpiration } from '@/lib/email-otp'
import { emailOTPServiceResend } from '@/lib/email-otp-resend'

const SendOTPSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const { email, password } = SendOTPSchema.parse(body)

    // Find user and verify credentials
    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate OTP
    const otpCode = generateOTPCode()
    const otpExpiration = getOTPExpiration()

    // Store OTP in database
    await db.user.update({
      where: { id: user.id },
      data: {
        otp: otpCode,
        otpExpiration,
        lastOTPSent: new Date()
      }
    })

    console.log('📧 Sending OTP email to:', email)

    // Try Resend first (2025 compliant)
    let emailSent = false
    let messageId: string | undefined
    let usedService = 'none'

    try {
      console.log('🚀 Attempting to send via Resend (Primary)...')
      const resendResult = await emailOTPServiceResend.sendOTP({
        email,
        name: user.name,
        otpCode
      })

      if (resendResult.success) {
        emailSent = true
        messageId = resendResult.messageId
        usedService = 'resend'
        console.log('✅ OTP email sent successfully via Resend')
        console.log('📧 Message ID:', messageId)
      } else {
        console.log('❌ Resend failed:', resendResult.error)
      }
    } catch (resendError) {
      console.error('❌ Resend service error:', resendError)
    }

    // Fallback to Brevo if Resend fails
    if (!emailSent) {
      try {
        console.log('🔄 Falling back to Brevo...')
        const brevoResult = await emailOTPService.sendOTP({
          email,
          name: user.name,
          otpCode
        })

        if (brevoResult) {
          emailSent = true
          usedService = 'brevo'
          console.log('✅ OTP email sent successfully via Brevo (fallback)')
        }
      } catch (brevoError) {
        console.error('❌ Brevo service error:', brevoError)
      }
    }

    if (!emailSent) {
      console.error('❌ Both email services failed')
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      )
    }

    // Update user with successful email send tracking
    await db.user.update({
      where: { id: user.id },
      data: {
        lastOTPSent: new Date(),
        // Store message ID for tracking if available
        ...(messageId && { lastEmailMessageId: messageId })
      }
    })

    // Return success response with tracking information
    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully',
      tracking: {
        service: usedService,
        messageId,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Send OTP error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 