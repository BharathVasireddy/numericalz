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
  Download
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
  
  if (session.user.role !== 'PARTNER') {
    redirect('/dashboard')
  }

  return <PartnerDashboard userId={session.user.id} />
} 