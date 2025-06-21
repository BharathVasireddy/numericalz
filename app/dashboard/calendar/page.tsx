import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DeadlineCalendar } from '@/components/dashboard/deadline-calendar'
import { getAllDeadlines, getDeadlinesForUser } from '@/lib/deadline-utils'
import { db } from '@/lib/db'


import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

async function CalendarData() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  // Get user details to check role
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      name: true
    }
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Always fetch all deadlines for Company Deadline Tracker functionality
  // The component will handle filtering based on scope
  const [allDeadlines, allUsers] = await Promise.all([
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
  
  const deadlines = allDeadlines
  const users = allUsers

  return (
    <DeadlineCalendar 
      deadlines={deadlines} 
      users={users} 
      userRole={user.role}
      currentUserId={user.id}
      currentUserName={user.name}
    />
  )
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
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          <Suspense fallback={<CalendarSkeleton />}>
            <CalendarData />
          </Suspense>
        </div>
      </div>
    </div>
  )
} 