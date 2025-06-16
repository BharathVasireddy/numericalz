import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { InactiveClientsTable } from '@/components/clients/inactive-clients-table'

export const metadata: Metadata = {
  title: 'Inactive Clients - Numericalz',
  description: 'Manage resigned and inactive clients',
}

/**
 * Inactive clients page - Manager only
 * 
 * Features:
 * - View all resigned/inactive clients
 * - Reassign clients back to active status
 * - Delete clients permanently with confirmation
 * - Manager-only access
 */
export default async function InactiveClientsPage() {
  const session = await getServerSession(authOptions)

  // Only managers can access this page
  if (!session || session.user.role !== 'MANAGER') {
    redirect('/dashboard')
  }

  // Fetch inactive clients
  const inactiveClients = await db.client.findMany({
    where: {
      isActive: false
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  })

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          {/* Header */}
          <div className="page-header">
            <h1 className="text-xl md:text-2xl font-bold">Inactive Clients</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Manage resigned and inactive clients
            </p>
          </div>

          {/* Inactive Clients Table */}
          <InactiveClientsTable clients={inactiveClients} />
        </div>
      </div>
    </div>
  )
} 