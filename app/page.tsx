import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { LoginForm } from '@/components/auth/login-form'

/**
 * Home page component for the Numericalz Internal Management System
 * 
 * This page:
 * - Redirects authenticated users to the dashboard
 * - Shows login form directly for unauthenticated users
 * - Streamlined for internal tool usage
 */
export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // Redirect authenticated users to dashboard
  if (session) {
    redirect('/dashboard')
  }

  // Show login form directly for unauthenticated users
  return (
    <div className="min-h-screen bg-background flex items-center justify-center page-container">
      <LoginForm />
    </div>
  )
}