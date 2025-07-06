// 🔒 AUTHENTICATION SYSTEM - LOCKED & PROTECTED
// ⚠️ CRITICAL WARNING: DO NOT MODIFY THIS FILE WITHOUT EXTREME CAUTION
// This file is part of the working authentication system - see AUTHENTICATION_LOCK.md

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import { db } from '@/lib/db'
import { isOTPExpired } from '@/lib/email-otp'

const VerifyOTPSchema = z.object({
  email: z.string().email('Invalid email format'),
  otpCode: z.string().length(6, 'OTP code must be 6 digits'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const { email, otpCode } = VerifyOTPSchema.parse(body)

    // Find user with OTP data
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        otpCode: true,
        otpExpiresAt: true,
        otpAttempts: true,
      },
    })

    if (!user) {
      return NextResponse.json({
        error: 'Invalid verification code'
      }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({
        error: 'Account is deactivated. Please contact your administrator.'
      }, { status: 401 })
    }

    // Check if OTP exists
    if (!user.otpCode || !user.otpExpiresAt) {
      return NextResponse.json({
        error: 'No verification code found. Please request a new code.'
      }, { status: 401 })
    }

    // Check if OTP is expired
    if (isOTPExpired(user.otpExpiresAt)) {
      // Clear expired OTP
      await db.user.update({
        where: { id: user.id },
        data: {
          otpCode: null,
          otpExpiresAt: null,
          otpAttempts: 0,
        },
      })

      return NextResponse.json({
        error: 'Verification code has expired. Please request a new code.'
      }, { status: 401 })
    }

    // Verify OTP code
    const isOtpValid = user.otpCode === otpCode

    if (!isOtpValid) {
      // Increment failed attempts
      const newAttempts = user.otpAttempts + 1
      
      // If too many failed attempts, clear OTP
      if (newAttempts >= 5) {
        await db.user.update({
          where: { id: user.id },
          data: {
            otpCode: null,
            otpExpiresAt: null,
            otpAttempts: 0,
          },
        })

        return NextResponse.json({
          error: 'Too many failed attempts. Please request a new verification code.'
        }, { status: 401 })
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          otpAttempts: newAttempts,
        },
      })

      return NextResponse.json({
        error: `Invalid verification code. ${5 - newAttempts} attempts remaining.`
      }, { status: 401 })
    }

    // OTP is valid - mark as verified and clear OTP data
    const now = new Date()
    await db.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        otpAttempts: 0,
        isOtpVerified: true,
        lastLoginAt: now,
      },
    })

    // Log successful OTP verification
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'OTP_VERIFIED',
        details: JSON.stringify({
          email: user.email,
          timestamp: now.toISOString(),
          userAgent: request.headers.get('user-agent') || 'Unknown',
        }),
      },
    }).catch(error => {
      console.error('Failed to log OTP verification:', error)
    })

    // Return success response with user data for NextAuth
    return NextResponse.json({
      success: true,
      message: 'Verification successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        otpVerified: true,
      },
    })

  } catch (error) {
    console.error('Verify OTP error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
} 