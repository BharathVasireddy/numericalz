import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { VATDeadlineTable } from '@/components/clients/vat-deadline-table'

export const metadata = {
  title: 'VAT Deadline Tracker | Numericalz',
  description: 'Track VAT deadlines for all VAT-enabled clients',
}

export default async function VATDeadlineTrackerPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          <Suspense fallback={<div>Loading...</div>}>
            <VATDeadlineContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

function VATDeadlineContent() {
  return (
    <div className="space-y-6">
      <VATDeadlineTable />
    </div>
  )
} 