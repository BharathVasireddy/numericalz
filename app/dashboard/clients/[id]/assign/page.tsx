import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { AssignUserForm } from '@/components/clients/assign-user-form'

interface AssignUserPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: AssignUserPageProps): Promise<Metadata> {
  const client = await db.client.findUnique({
    where: { id: params.id },
    select: { companyName: true }
  })

  return {
    title: client ? `Assign User - ${client.companyName}` : 'Assign User',
    description: 'Assign a user to manage this client',
  }
}

/**
 * Assign user page
 * 
 * Features:
 * - Assign client to staff members
 * - View current assignment
 * - Manager-only access
 */
export default async function AssignUserPage({ params }: AssignUserPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Only managers can assign users
  if (session.user.role !== 'MANAGER') {
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

  if (!client) {
    notFound()
  }

  // Fetch all users for assignment
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  return <AssignUserForm client={client} users={users} />
} 