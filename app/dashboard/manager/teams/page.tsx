import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { TeamManagement } from '@/components/teams/team-management'

export const metadata: Metadata = {
  title: 'Team Management - Numericalz',
  description: 'Manage team members and their assignments',
}

/**
 * Team management page for managers
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

  // Only managers can access team management
  if (session.user.role !== 'MANAGER') {
    redirect('/dashboard/staff')
  }

  // Fetch all users and their client assignments
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      assignedClients: {
        where: {
          isActive: true
        },
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
          assignedClients: {
            where: {
              isActive: true
            }
          }
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          <TeamManagement users={users} />
        </div>
      </div>
    </div>
  )
} 