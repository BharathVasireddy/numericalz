import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { VATDeadlineTable } from '@/components/clients/vat-deadline-table'
import { Calendar, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
    <PageLayout maxWidth="2xl">
      <PageHeader 
        title="VAT Deadline Tracker"
        description="Track VAT deadlines and quarters for all VAT-enabled clients"
        icon={Calendar}
      >
        <Link href="/dashboard/clients/add">
          <Button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </Link>
      </PageHeader>
      
      <PageContent>
        <Suspense fallback={<div>Loading...</div>}>
          <VATDeadlineContent />
        </Suspense>
      </PageContent>
    </PageLayout>
  )
}

function VATDeadlineContent() {
  return (
    <div className="space-y-6">
      <VATDeadlineTable />
    </div>
  )
} 