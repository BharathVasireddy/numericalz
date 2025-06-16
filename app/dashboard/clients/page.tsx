import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ClientsHeader } from '@/components/clients/clients-header'
import { ClientsTable } from '@/components/clients/clients-table'

export const metadata: Metadata = {
  title: 'Clients - Numericalz',
  description: 'Manage your clients and their information',
}

/**
 * Clients listing page
 * 
 * Features:
 * - View all clients in a table
 * - Search and filter clients
 * - Add new clients
 * - Quick actions (edit, view, assign)
 * - Companies House integration
 */
export default async function ClientsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          <ClientsHeader />
          <ClientsTable />
        </div>
      </div>
    </div>
  )
} 