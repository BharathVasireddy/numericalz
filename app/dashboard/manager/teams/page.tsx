import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { TeamManagement } from '@/components/teams/team-management'

export const metadata: Metadata = {
  title: 'Staff Management - Numericalz',
  description: 'Manage staff members and their assignments',
}

/**
 * Team management page - PARTNER ONLY
 * 
 * DEPRECATED: This route is maintained for backward compatibility
 * New staff management is at /dashboard/staff for PARTNER users
 * 
 * Features:
 * - View all team members
 * - Create new team members
 * - Edit team member details
 * - Assign/reassign clients
 * - View workload distribution
 */
export default async function TeamsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Only PARTNER users can access staff management
  // MANAGER users are redirected to their dashboard
  if (session.user.role === 'MANAGER') {
    redirect('/dashboard/manager')
  }
  
  if (session.user.role === 'STAFF') {
    redirect('/dashboard/staff')
  }

  if (session.user.role !== 'PARTNER') {
    redirect('/dashboard')
  }

  // Redirect PARTNER users to the new staff management URL
  redirect('/dashboard/staff')
} 