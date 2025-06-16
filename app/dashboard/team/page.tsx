import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Team management page redirect
 * 
 * This page redirects users to the appropriate team management location:
 * - Managers: /dashboard/manager/teams (full team management)
 * - Staff: /dashboard (dashboard home, as they can't manage teams)
 */
export default async function TeamPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Redirect based on user role
  if (session.user.role === 'MANAGER') {
    redirect('/dashboard/manager/teams')
  } else {
    // Staff users don't have access to team management
    redirect('/dashboard')
  }
} 