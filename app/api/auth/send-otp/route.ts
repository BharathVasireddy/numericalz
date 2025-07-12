// 🔒 AUTHENTICATION SYSTEM - LOCKED & PROTECTED
// ⚠️ CRITICAL WARNING: DO NOT MODIFY THIS FILE WITHOUT EXTREME CAUTION
// This file is part of the working authentication system - see AUTHENTICATION_LOCK.md

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { emailOTPService, generateOTPCode, getOTPExpiration } from '@/lib/email-otp'
import { db } from '@/lib/db'

const SendOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = SendOTPSchema.parse(body)
    
    console.log('📧 Send OTP Request:', { email })

    // OPTIMIZATION: Single database query with select optimization
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        lastOtpSentAt: true
      }
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If your email is registered, you will receive a login code shortly.'
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Account is deactivated'
      }, { status: 403 })
    }

    // OPTIMIZATION: Generate OTP and expiration once
    const otpCode = generateOTPCode()
    const otpExpiresAt = getOTPExpiration()
    const now = new Date()

    console.log('🔑 Generated OTP for user:', {
      userId: user.id,
      email: user.email
    })

    // OPTIMIZATION: Send email and update database in parallel
    const [emailResult] = await Promise.allSettled([
      emailOTPService.sendOTP({
        email: user.email,
        otpCode
      }),
      db.user.update({
        where: { id: user.id },
        data: {
          otpCode,
          otpExpiresAt,
          lastOtpSentAt: now,
          otpAttempts: 0 // Reset attempts on new OTP
        }
      })
    ])

    // Check email result
    if (emailResult.status === 'rejected') {
      console.error('❌ Failed to send OTP email:', emailResult.reason)
      return NextResponse.json({
        success: false,
        error: 'Failed to send verification code. Please try again.'
      }, { status: 500 })
    }

    const emailValue = emailResult.value
    if (!emailValue.success) {
      console.error('❌ Failed to send OTP email:', emailValue.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to send verification code. Please try again.'
      }, { status: 500 })
    }

    console.log('✅ OTP email sent successfully via', emailValue.service, {
      userId: user.id,
      email: user.email,
      messageId: emailValue.messageId,
      service: emailValue.service
    })

    return NextResponse.json({
      success: true,
      message: 'If your email is registered, you will receive a login code shortly.',
      debug: {
        emailSent: true,
        service: emailValue.service,
        messageId: emailValue.messageId
      }
    })

  } catch (error) {
    console.error('❌ Send OTP Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid email format'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to send verification code. Please try again.'
    }, { status: 500 })
  }
} 