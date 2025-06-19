import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard'

export const metadata: Metadata = {
  title: 'Manager Dashboard - Numericalz',
  description: 'Manager dashboard with comprehensive analytics and team management',
}

/**
 * Manager dashboard page with full analytics and management features
 * 
 * Features:
 * - Complete system overview
 * - Team performance metrics
 * - Client analytics
 * - Task management overview
 * - Quick actions for partners and managers
 */
export default async function ManagerPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  // Only managers and partners can access this page
  if (!['MANAGER', 'PARTNER'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  return <ManagerDashboard userId={session.user.id} />
} 