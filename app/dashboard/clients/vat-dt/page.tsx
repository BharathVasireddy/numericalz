import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { VATDeadlinesTable } from '@/components/clients/vat-deadlines-table'

export const metadata = {
  title: 'VAT Deadline Tracker | Numericalz',
  description: 'Track VAT deadlines for all VAT-enabled clients',
}

export default async function VATDeadlineTrackerPage({
  searchParams
}: {
  searchParams: { focus?: string; workflow?: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VATDeadlinesTable 
        focusClientId={searchParams.focus}
        focusWorkflowId={searchParams.workflow}
      />
    </Suspense>
  )
} 