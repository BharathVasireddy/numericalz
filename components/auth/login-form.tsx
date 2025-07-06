// 🔒 AUTHENTICATION SYSTEM - LOCKED & PROTECTED
// ⚠️ CRITICAL WARNING: DO NOT MODIFY THIS FILE WITHOUT EXTREME CAUTION
// This file is part of the working authentication system - see AUTHENTICATION_LOCK.md

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { showToast } from '@/lib/toast'
import { Loader2, Mail, Lock, Shield } from 'lucide-react'

/**
 * Enhanced login form with OTP verification
 * 
 * Features:
 * - Two-step authentication: email/password + OTP
 * - Clean design maintained from original
 * - Proper error handling and validation
 * - Rate limiting and security features
 */
export function LoginForm() {
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [otpCountdown, setOtpCountdown] = useState(0)
  const router = useRouter()

  // Handle email/password submission and OTP sending
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      showToast.error('Please enter both email and password.')
      return
    }

    setIsLoading(true)

    try {
      // First verify credentials and send OTP
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast.error(data.error || 'Authentication failed')
        return
      }

      showToast.success('Verification code sent to your email address')
      setStep('otp')
      startCountdown()
      
    } catch (error) {
      showToast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle OTP verification and NextAuth sign-in
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otpCode || otpCode.length !== 6) {
      showToast.error('Please enter the 6-digit verification code.')
      return
    }

    setIsLoading(true)

    try {
      // Verify OTP
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otpCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast.error(data.error || 'Verification failed')
        return
      }

      // OTP verified successfully, now sign in with NextAuth
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        showToast.error('Authentication failed. Please try again.')
      } else if (result?.ok) {
        showToast.success('Welcome back! You have been successfully signed in.')
        setTimeout(() => {
          router.push('/dashboard')
        }, 500)
      }
      
    } catch (error) {
      showToast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast.error(data.error || 'Failed to resend verification code')
        return
      }

      showToast.success('New verification code sent to your email.')
      startCountdown()
      
    } catch (error) {
      showToast.error('Failed to resend verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Start countdown timer
  const startCountdown = () => {
    setOtpCountdown(600) // 10 minutes
    const timer = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Format countdown time
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Go back to credentials step
  const handleBackToCredentials = () => {
    setStep('credentials')
    setOtpCode('')
    setOtpCountdown(0)
  }

  return (
    <Card className="shadow-professional max-w-sm mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <Image
            src="/numericalz-logo.png"
            alt="Numericalz Logo"
            width={80}
            height={80}
            className="h-12 w-auto"
            priority
          />
        </div>
        <CardTitle className="text-lg md:text-xl">
          {step === 'credentials' ? 'Sign In' : 'Verify Email'}
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          {step === 'credentials' 
            ? 'Enter your credentials to access the system'
            : 'Enter the 6-digit code sent to your email'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-3 md:space-y-4">
            <div className="form-field">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-2 md:left-3 top-2 md:top-2.5 h-3 w-3 md:h-4 md:w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-8 md:pl-10"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-2 md:left-3 top-2 md:top-2.5 h-3 w-3 md:h-4 md:w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input pl-8 md:pl-10"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="btn-primary w-full mt-4 md:mt-6" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-3 md:space-y-4">
            <div className="form-field">
              <label htmlFor="otpCode" className="form-label">
                Verification Code
              </label>
              <div className="relative">
                <Shield className="absolute left-2 md:left-3 top-2 md:top-2.5 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                <Input
                  id="otpCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="form-input pl-8 md:pl-10 text-center tracking-widest"
                  disabled={isLoading}
                  maxLength={6}
                  required
                />
              </div>
              {otpCountdown > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Code expires in {formatCountdown(otpCountdown)}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline"
                onClick={handleBackToCredentials}
                className="flex-1"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="btn-primary flex-1" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpCountdown > 0 || isLoading}
                className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                {otpCountdown > 0 ? `Resend in ${formatCountdown(otpCountdown)}` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 md:mt-6 text-center">
          <p className="text-xs md:text-sm text-muted-foreground">
            Need access? Contact your system administrator.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 