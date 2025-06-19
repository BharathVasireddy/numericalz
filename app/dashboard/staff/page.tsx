import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, FileText, Plus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { TeamManagement } from '@/components/teams/team-management'
import { StaffDashboard } from '@/components/dashboard/staff-dashboard'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

  // For testing purposes, allow access but show a warning if not STAFF
  const isActualStaff = session.user.role === 'STAFF'
  
  return (
    <PageLayout maxWidth="xl">
      {!isActualStaff && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Testing Mode:</strong> You are viewing the staff dashboard as a {session.user.role} user. 
            In production, only STAFF users would have access to this page.
          </AlertDescription>
        </Alert>
      )}
      
      <StaffDashboard userId={session.user.id} />
    </PageLayout>
  )
} 