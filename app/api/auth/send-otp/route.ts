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

    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isActive: true,
        lastOtpSentAt: true,
        otpAttempts: true,
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

    // Rate limiting: Check if OTP was sent recently (1 minute cooldown)
    const now = new Date()
    if (user.lastOtpSentAt) {
      const timeSinceLastOTP = now.getTime() - user.lastOtpSentAt.getTime()
      const oneMinute = 60 * 1000
      
      if (timeSinceLastOTP < oneMinute) {
        const waitTime = Math.ceil((oneMinute - timeSinceLastOTP) / 1000)
        return NextResponse.json({
          error: `Please wait ${waitTime} seconds before requesting a new code`
        }, { status: 429 })
      }
    }

    // Check if user has too many failed attempts (reset after 1 hour)
    if (user.otpAttempts >= 5) {
      return NextResponse.json({
        error: 'Too many failed attempts. Please try again later or contact support.'
      }, { status: 429 })
    }

    // Generate OTP code
    const otpCode = generateOTPCode()
    const otpExpiresAt = getOTPExpiration()

    // Save OTP to database
    await db.user.update({
      where: { id: user.id },
      data: {
        otpCode: otpCode,
        otpExpiresAt: otpExpiresAt,
        lastOtpSentAt: now,
        isOtpVerified: false, // Reset verification status
      },
    })

    // Send OTP email
    const emailSent = await emailOTPService.sendOTP({
      email: user.email,
      name: user.name,
      otpCode: otpCode,
    })

    if (!emailSent) {
      // If email fails, clear the OTP from database
      await db.user.update({
        where: { id: user.id },
        data: {
          otpCode: null,
          otpExpiresAt: null,
        },
      })

      return NextResponse.json({
        error: 'Failed to send verification email. Please try again.'
      }, { status: 500 })
    }

    // Log the OTP request
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'OTP_REQUESTED',
        details: JSON.stringify({
          email: user.email,
          timestamp: now.toISOString(),
          userAgent: request.headers.get('user-agent') || 'Unknown',
        }),
      },
    }).catch(error => {
      console.error('Failed to log OTP request:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email address',
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