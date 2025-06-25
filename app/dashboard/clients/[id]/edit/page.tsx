import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { EditClientForm } from '@/components/clients/edit-client-form'

interface EditClientPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: EditClientPageProps): Promise<Metadata> {
  const client = await db.client.findUnique({
    where: { id: params.id },
    select: { companyName: true }
  })

  return {
    title: client ? `Edit ${client.companyName}` : 'Edit Client',
    description: 'Edit client information and update details',
  }
}

/**
 * Edit client page
 * 
 * Features:
 * - Edit client information
 * - Update contact details
 * - Modify business information
 * - Manager-only access
 */
export default async function EditClientPage({ params }: EditClientPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Only managers and partners can edit clients
  if (session.user.role !== 'MANAGER' && session.user.role !== 'PARTNER') {
    redirect('/dashboard/clients')
  }

  // Fetch client data
  const client = await db.client.findUnique({
    where: { id: params.id },
    include: {
      assignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // Fetch chase team users separately if they exist
  let chaseTeamUsers: Array<{
    id: string
    name: string | null
    email: string
    role: string
  }> = []
  if (client && client.chaseTeamUserIds && client.chaseTeamUserIds.length > 0) {
    chaseTeamUsers = await db.user.findMany({
      where: {
        id: {
          in: client.chaseTeamUserIds
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })
  }

  if (!client) {
    notFound()
  }

  // Include chase team users in client data
  const clientWithChaseTeam = {
    ...client,
    chaseTeamUsers,
  }

  return <EditClientForm client={clientWithChaseTeam} />
} 