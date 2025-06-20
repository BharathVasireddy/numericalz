import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { TeamManagement } from '@/components/teams/team-management'

export const metadata: Metadata = {
  title: 'Staff Management - Numericalz',
  description: 'Manage team members and staff',
}

/**
 * Staff Management page - for managing team members
 * 
 * - PARTNER: Can manage all staff including other partners
 * - MANAGER: Can manage staff members
 * - STAFF: Limited access to view team
 */
export default async function StaffPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  // Fetch all users for team management
  const users = await db.user.findMany({
    include: {
      assignedClients: {
        select: {
          id: true,
          companyName: true,
          companyType: true,
          nextAccountsDue: true,
          nextConfirmationDue: true,
        }
      },
      _count: {
        select: {
          assignedClients: true
        }
      }
    },
    orderBy: [
      { role: 'asc' },
      { name: 'asc' }
    ]
  })

  return (
    <TeamManagement users={users} />
  )
} 