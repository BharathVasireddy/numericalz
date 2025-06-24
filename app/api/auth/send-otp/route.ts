import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { emailOTPService, generateOTPCode, getOTPExpiration } from '@/lib/email-otp'

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
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
        isActive: true,
        lastOtpSentAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({
        error: 'Account is deactivated. Please contact your administrator.'
      }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({
        error: 'Invalid email or password'
      }, { status: 401 })
    }

    // Rate limiting: Check if OTP was sent recently (within 1 minute)
    if (user.lastOtpSentAt) {
      const timeSinceLastOTP = Date.now() - user.lastOtpSentAt.getTime()
      const oneMinute = 60 * 1000

      if (timeSinceLastOTP < oneMinute) {
        const remainingSeconds = Math.ceil((oneMinute - timeSinceLastOTP) / 1000)
        return NextResponse.json({
          error: `Please wait ${remainingSeconds} seconds before requesting a new code.`
        }, { status: 429 })
      }
    }

    // Generate OTP
    const otpCode = generateOTPCode()
    const otpExpiresAt = getOTPExpiration()

    // Save OTP to database
    await db.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt,
        otpAttempts: 0,
        lastOtpSentAt: new Date(),
        isOtpVerified: false,
      },
    })

    // Send OTP email
    const emailSent = await emailOTPService.sendOTP({
      email: user.email,
      name: user.name,
      otpCode,
    })

    if (!emailSent) {
      // Clear OTP from database if email failed
      await db.user.update({
        where: { id: user.id },
        data: {
          otpCode: null,
          otpExpiresAt: null,
          lastOtpSentAt: null,
        },
      })

      return NextResponse.json({
        error: 'Failed to send verification code. Please try again.'
      }, { status: 500 })
    }

    // Log OTP send activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'OTP_SENT',
        details: JSON.stringify({
          email: user.email,
          timestamp: new Date().toISOString(),
          userAgent: request.headers.get('user-agent') || 'Unknown',
        }),
      },
    }).catch(error => {
      console.error('Failed to log OTP send:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      expiresIn: 600, // 10 minutes in seconds
    })

  } catch (error) {
    console.error('Send OTP error:', error)

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