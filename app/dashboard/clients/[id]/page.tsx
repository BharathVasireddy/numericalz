import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { ClientDetailView } from '@/components/clients/client-detail-view'

interface ClientDetailPageProps {
  params: {
    id: string
  }
}

export async function generateMetadata({ params }: ClientDetailPageProps): Promise<Metadata> {
  const client = await db.client.findUnique({
    where: { id: params.id },
    select: { companyName: true }
  })

  return {
    title: client ? `${client.companyName} - Client Details` : 'Client Not Found',
    description: 'View detailed client information and manage client data',
  }
}

/**
 * Client detail page
 * 
 * Features:
 * - View all client information
 * - Companies House data display
 * - Contact information
 * - Statutory dates and deadlines
 * - Activity history
 * - Quick actions
 */
export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/auth/login')
  }

  // Fetch client with all related data
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
      // vatAssignedUser: {  // REMOVED: Client-level VAT assignments no longer used
      //   select: {
      //     id: true,
      //     name: true,
      //     email: true,
      //   },
      // },
      ltdCompanyAssignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      nonLtdCompanyAssignedUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      vatQuartersWorkflow: {
        orderBy: { quarterEndDate: 'desc' },
        take: 1, // Get the most recent quarter
        include: {
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      communications: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          sentBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      activityLogs: {
        orderBy: { timestamp: 'desc' },
        take: 20,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!client) {
    notFound()
  }

  // Check permissions - staff can only view their assigned clients
  if (session.user.role === 'STAFF') {
    const isAssigned = client.assignedUserId === session.user.id ||
                      // client.vatAssignedUserId === session.user.id ||  // REMOVED: Client-level VAT assignments no longer used
                      client.ltdCompanyAssignedUserId === session.user.id ||
                      client.nonLtdCompanyAssignedUserId === session.user.id ||
                      client.vatQuartersWorkflow.some(quarter => quarter.assignedUserId === session.user.id)
    
    if (!isAssigned) {
      redirect('/dashboard/clients')
    }
  }

  return <ClientDetailView client={client} currentUser={session.user} />
} 