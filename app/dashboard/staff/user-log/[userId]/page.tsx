import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { UserLogView } from '@/components/staff/user-log-view'

export const metadata: Metadata = {
  title: 'User Activity Log - Numericalz',
  description: 'View activity history for team member',
}

interface UserLogPageProps {
  params: {
    userId: string
  }
}

export default async function UserLogPage({ params }: UserLogPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/login')
  }

  // Only partners can access this page
  if (session.user.role !== 'PARTNER') {
    redirect('/dashboard')
  }

  const { userId } = params

  // Get the specific user
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  })

  if (!user) {
    notFound()
  }

  // Get user's activity logs
  const activityLogs = await db.activityLog.findMany({
    where: {
      userId: userId
    },
    select: {
      id: true,
      action: true,
      timestamp: true,
      details: true,
      client: {
        select: {
          id: true,
          clientCode: true,
          companyName: true
        }
      }
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: 100 // Limit to last 100 activities
  })

  const logData = {
    user: {
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email || '',
      role: user.role,
      joinedDate: user.createdAt
    },
    activities: activityLogs.map(log => ({
      id: log.id,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
      client: log.client
    }))
  }

  return (
    <PageLayout maxWidth="xl">
      <PageHeader 
        title={`${user.name}'s Activity Log`}
        description={`Activity history for ${user.name}`}
      />
      <PageContent>
        <UserLogView logData={logData} />
      </PageContent>
    </PageLayout>
  )
} 