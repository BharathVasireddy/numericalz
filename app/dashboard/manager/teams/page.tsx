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

  try {
    // Fetch all users with simplified query
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Fetch client assignments separately to avoid complex joins
    const usersWithClients = await Promise.all(
      users.map(async (user) => {
        try {
          const [assignedClients, clientCount] = await Promise.all([
            db.client.findMany({
              where: {
                assignedUserId: user.id,
                isActive: true
              },
              select: {
                id: true,
                companyName: true,
                companyType: true,
                nextAccountsDue: true,
                nextConfirmationDue: true,
              },
              take: 10 // Limit to avoid large queries
            }),
            db.client.count({
              where: {
                assignedUserId: user.id,
                isActive: true
              }
            })
          ])

          return {
            ...user,
            assignedClients,
            _count: {
              assignedClients: clientCount
            }
          }
        } catch (error) {
          console.error(`Error fetching clients for user ${user.id}:`, error)
          return {
            ...user,
            assignedClients: [],
            _count: {
              assignedClients: 0
            }
          }
        }
      })
    )

    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            <TeamManagement users={usersWithClients} />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error in teams page:', error)
    
    // Fallback: return page with empty data
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            <div className="page-header">
              <h1 className="text-xl md:text-2xl font-bold">Team Management</h1>
              <p className="text-sm text-muted-foreground text-red-600">
                Error loading team data. Please try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
} 