import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { LtdCompaniesDeadlinesTable } from '@/components/clients/ltd-companies-deadlines-table'

export const metadata: Metadata = {
  title: 'Limited Companies Deadlines - Numericalz',
  description: 'Track Limited Company filing deadlines and workflow management',
}

/**
 * Limited Companies deadlines page
 * 
 * Features:
 * - View all Limited Company clients with filing deadlines
 * - Track accounts, CT, and CS due dates
 * - Workflow management for accounts filing process
 * - Assignment filters (assigned to me / all clients)
 * - Update workflow stages with milestone tracking
 * 
 * Authentication: Server-side authentication with automatic redirect
 */
export default async function LtdCompaniesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  return <LtdCompaniesDeadlinesTable />
} 