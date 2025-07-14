import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { NonLtdDeadlinesTable } from '@/components/clients/non-ltd-deadlines-table'

export const metadata: Metadata = {
  title: 'Non-Ltd Companies Deadlines - Numericalz',
  description: 'Track Non-Ltd Company filing deadlines and workflow management',
}

/**
 * Non-Ltd Companies deadlines page
 * 
 * Features:
 * - View all Non-Ltd Company clients with filing deadlines
 * - Track accounts filing due dates (April 5th year end, January 5th filing due)
 * - Workflow management for accounts filing process
 * - Assignment filters (assigned to me / all clients)
 * - Update workflow stages with milestone tracking
 * 
 * Authentication: Server-side authentication with automatic redirect
 */
export default async function NonLtdCompaniesPage({
  searchParams
}: {
  searchParams: { focus?: string; workflow?: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  return (
    <NonLtdDeadlinesTable 
      focusClientId={searchParams.focus}
      focusWorkflowId={searchParams.workflow}
    />
  )
} 