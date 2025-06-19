import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, AlertTriangle } from 'lucide-react'
import { ManagerDashboard } from '@/components/dashboard/manager-dashboard'
import { PageLayout } from '@/components/layout/page-layout'
import { Alert, AlertDescription } from '@/components/ui/alert'

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

  // For testing purposes, allow access but show a warning if not appropriate role
  const hasAccess = ['MANAGER', 'PARTNER'].includes(session.user.role)

  return (
    <PageLayout maxWidth="xl">
      {!hasAccess && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Testing Mode:</strong> You are viewing the manager dashboard as a {session.user.role} user. 
            In production, only MANAGER and PARTNER users would have access to this page.
          </AlertDescription>
        </Alert>
      )}
      
      <ManagerDashboard userId={session.user.id} />
    </PageLayout>
  )
} 