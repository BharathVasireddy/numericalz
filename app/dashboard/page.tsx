import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Numericalz Internal Management Dashboard',
}

/**
 * Main dashboard page that redirects users to their role-specific dashboard
 * 
 * - PARTNER users → /dashboard/partner (highest level access)
 * - MANAGER users → /dashboard/manager (management access)
 * - STAFF users → /dashboard/staff (staff access)
 * - Unauthenticated users → /auth/login
 */
export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Redirect based on user role - each role gets their own dashboard
  if (session.user.role === 'PARTNER') {
    redirect('/dashboard/partner')
  } else if (session.user.role === 'MANAGER') {
    redirect('/dashboard/manager')
  } else if (session.user.role === 'STAFF') {
    redirect('/dashboard/staff')
  }

  // Fallback redirect (shouldn't reach here)
  redirect('/dashboard/staff')
} 