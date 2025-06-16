import { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Numericalz account',
}

/**
 * Login page for the Numericalz Internal Management System
 * 
 * Features:
 * - Email/password authentication
 * - Form validation
 * - Error handling
 * - Responsive design
 */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-900">
            Welcome Back
          </h1>
          <p className="text-secondary-600 mt-2">
            Sign in to access your dashboard
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  )
} 