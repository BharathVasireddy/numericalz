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
  return NextResponse.json({ message: 'Send OTP endpoint' })
} 