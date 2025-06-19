import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { TeamManagement } from '@/components/teams/team-management'
import { StaffDashboard } from '@/components/dashboard/staff-dashboard'

export const metadata: Metadata = {
  title: 'Staff - Numericalz',
  description: 'Staff dashboard and management',
}

/**
 * Staff page - handles both STAFF dashboard and PARTNER staff management
 * 
 * - PARTNER: Shows staff management interface
 * - STAFF: Shows personal dashboard
 * - MANAGER: Redirected to manager dashboard
 */
export default async function StaffPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  // Only staff members can access this page
  if (session.user.role !== 'STAFF') {
    redirect('/dashboard')
  }

  return <StaffDashboard userId={session.user.id} />
} 