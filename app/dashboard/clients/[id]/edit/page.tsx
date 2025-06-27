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

  // Helper function to reconstruct JSON address from individual database fields
  function reconstructAddressFields(client: any, type: 'trading' | 'residential'): string | null {
    const prefix = type === 'trading' ? 'tradingAddress' : 'residentialAddress'
    
    const addressLine1 = client[`${prefix}Line1`]
    const addressLine2 = client[`${prefix}Line2`]
    const country = client[`${prefix}Country`]
    const postCode = client[`${prefix}PostCode`]
    
    // Only reconstruct if we have at least one address field
    if (!addressLine1 && !addressLine2 && !country && !postCode) {
      return null
    }
    
    const address = {
      address_line_1: addressLine1 || '',
      address_line_2: addressLine2 || '',
      country: country || '',
      postal_code: postCode || '',
      locality: '', // Not stored in database
      region: '', // Not stored in database
    }
    
    // Remove empty fields
    Object.keys(address).forEach(key => {
      if (!address[key as keyof typeof address]) {
        delete address[key as keyof typeof address]
      }
    })
    
    return Object.keys(address).length > 0 ? JSON.stringify(address) : null
  }

  // Include chase team users and reconstructed addresses in client data
  const clientWithChaseTeam = {
    ...client,
    chaseTeamUsers,
    tradingAddress: reconstructAddressFields(client, 'trading'),
    residentialAddress: reconstructAddressFields(client, 'residential'),
  }

  return <EditClientForm client={clientWithChaseTeam} />
} 