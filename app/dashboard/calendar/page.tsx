import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DeadlineCalendar } from '@/components/dashboard/deadline-calendar'
import { getAllDeadlines } from '@/lib/deadline-utils'
import { db } from '@/lib/db'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { CalendarIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

async function CalendarData() {
  // Fetch deadlines and users
  const [deadlines, users] = await Promise.all([
    getAllDeadlines(),
    db.user.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    })
  ])

  return <DeadlineCalendar deadlines={deadlines} users={users} />
}

function CalendarSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function CalendarPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader
        title="Deadline Calendar"
        description="Visual calendar of all client deadlines with multiple view options"
      >
        <CalendarIcon className="h-6 w-6" />
      </PageHeader>
      
      <PageContent>
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarData />
        </Suspense>
      </PageContent>
    </PageLayout>
  )
} 