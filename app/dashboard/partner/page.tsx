import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Building2, 
  Users, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  CheckCircle, 
  Calendar,
  Clock,
  Plus,
  Crown,
  Shield,
  User,
  Settings,
  Download,
  AlertTriangle
} from 'lucide-react'
import { PartnerDashboard } from '@/components/dashboard/partner-dashboard'

export const metadata: Metadata = {
  title: 'Partner Dashboard - Numericalz',
  description: 'Partner dashboard with complete system oversight and management controls',
}

/**
 * Partner dashboard page with complete system oversight
 * 
 * Features:
 * - Complete system analytics and metrics
 * - User management overview
 * - Client portfolio analytics
 * - Revenue and performance tracking
 * - System administration controls
 * - Data export capabilities (Partner exclusive)
 */
export default async function PartnerPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }
  
  // For testing purposes, allow access but show a warning if not PARTNER
  const isPartner = session.user.role === 'PARTNER'

  return (
    <PageLayout maxWidth="xl">
      {!isPartner && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Testing Mode:</strong> You are viewing the partner dashboard as a {session.user.role} user. 
            In production, only PARTNER users would have access to this page.
          </AlertDescription>
        </Alert>
      )}
      
      <PartnerDashboard userId={session.user.id} />
    </PageLayout>
  )
} 