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

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email }
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

    // Generate OTP
    const otpCode = generateOTPCode()
    const otpExpiresAt = getOTPExpiration()

    console.log('🔑 Generated OTP for user:', {
      userId: user.id,
      email: user.email
    })

    // Update user with OTP
    await db.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt,
        lastOtpSentAt: new Date()
      }
    })

    // Send OTP email (without personalization)
    const emailResult = await emailOTPService.sendOTP({
      email: user.email,
      otpCode
    })

    if (!emailResult.success) {
      console.error('❌ Failed to send OTP email:', emailResult.error)
      return NextResponse.json({
        success: false,
        error: 'Failed to send verification code. Please try again.'
      }, { status: 500 })
    }

    console.log('✅ OTP email sent successfully via', emailResult.service, {
      userId: user.id,
      email: user.email,
      messageId: emailResult.messageId,
      service: emailResult.service
    })

    return NextResponse.json({
      success: true,
      message: 'If your email is registered, you will receive a login code shortly.',
      debug: {
        emailSent: true,
        service: emailResult.service,
        messageId: emailResult.messageId
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