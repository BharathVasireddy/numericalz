'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { showToast } from '@/lib/toast'
import { Loader2, Mail, Lock } from 'lucide-react'

/**
 * Login form component with email/password authentication
 * 
 * Features:
 * - Modern black & white design
 * - Compact form layout
 * - Form validation
 * - Loading states
 * - Error handling
 * - Toast notifications
 * - Responsive design
 */
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      showToast.error('Please enter both email and password.')
      return
    }

    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        showToast.error(result.error)
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
        <CardTitle className="text-lg md:text-xl">Sign In</CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Enter your credentials to access the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          <div className="form-field">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-2 md:left-3 top-2 md:top-2.5 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
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
              <Lock className="absolute left-2 md:left-3 top-2 md:top-2.5 h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
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
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-4 md:mt-6 text-center">
          <p className="text-xs md:text-sm text-muted-foreground">
            Need access? Contact your system administrator.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 