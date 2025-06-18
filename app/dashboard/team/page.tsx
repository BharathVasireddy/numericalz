import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Team page - redirects users to appropriate team management
 * 
 * - Partners: /dashboard/staff (full staff management)
 * - Managers: /dashboard/manager (manager dashboard)
 * - Staff: /dashboard/staff (personal dashboard)
 */
export default async function TeamPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Redirect to appropriate dashboard based on role
  if (session.user.role === 'PARTNER') {
    redirect('/dashboard/staff')
  }
  
  if (session.user.role === 'MANAGER') {
    redirect('/dashboard/manager')
  }
  
  // STAFF users go to their dashboard
  redirect('/dashboard/staff')
} 