import { Suspense } from 'react'
import { Metadata } from 'next'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { NonLtdDeadlinesTable } from '@/components/clients/non-ltd-deadlines-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { db } from '@/lib/db'
import { getCurrentNonLtdTaxYear } from '@/lib/non-ltd-workflow-utils'

export const metadata: Metadata = {
  title: 'Non-Ltd Deadlines | Numericalz',
  description: 'Manage non-limited company accounts deadlines and workflows',
}

async function getNonLtdStats() {
  try {
    const [
      totalClients,
      overdueClients,
      dueSoonClients,
      completedWorkflows
    ] = await Promise.all([
      // Total non-Ltd clients
      db.client.count({
        where: {
          companyType: 'NON_LIMITED_COMPANY',
          isActive: true
        }
      }),
      
      // Overdue workflows
      db.nonLtdAccountsWorkflow.count({
        where: {
          isCompleted: false,
          filingDueDate: {
            lt: new Date()
          }
        }
      }),
      
      // Due soon workflows (within 30 days)
      db.nonLtdAccountsWorkflow.count({
        where: {
          isCompleted: false,
          filingDueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Completed workflows
      db.nonLtdAccountsWorkflow.count({
        where: {
          isCompleted: true
        }
      })
    ])

    return {
      totalClients,
      overdueClients,
      dueSoonClients,
      completedWorkflows
    }
  } catch (error) {
    console.error('Error fetching non-Ltd stats:', error)
    return {
      totalClients: 0,
      overdueClients: 0,
      dueSoonClients: 0,
      completedWorkflows: 0
    }
  }
}

function NonLtdStatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Non-Ltd Clients</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <Suspense fallback={<div className="h-8 bg-muted animate-pulse rounded" />}>
              <NonLtdStatsCard type="total" />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            <Suspense fallback={<div className="h-8 bg-muted animate-pulse rounded" />}>
              <NonLtdStatsCard type="overdue" />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
          <Calendar className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-500">
            <Suspense fallback={<div className="h-8 bg-muted animate-pulse rounded" />}>
              <NonLtdStatsCard type="dueSoon" />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            <Suspense fallback={<div className="h-8 bg-muted animate-pulse rounded" />}>
              <NonLtdStatsCard type="completed" />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function NonLtdStatsCard({ type }: { type: 'total' | 'overdue' | 'dueSoon' | 'completed' }) {
  const stats = await getNonLtdStats()
  
  switch (type) {
    case 'total':
      return stats.totalClients
    case 'overdue':
      return stats.overdueClients
    case 'dueSoon':
      return stats.dueSoonClients
    case 'completed':
      return stats.completedWorkflows
    default:
      return 0
  }
}

export default function NonLtdDeadlinesPage() {
  const currentTaxYear = getCurrentNonLtdTaxYear()

  return (
    <PageLayout maxWidth="full">
      <PageHeader 
        title="Non-Ltd Deadlines"
        description={`Manage non-limited company accounts deadlines for tax year ${currentTaxYear}/${currentTaxYear + 1}`}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Tax Year: {currentTaxYear}/{currentTaxYear + 1}</span>
        </div>
      </PageHeader>
      
      <PageContent>
        <NonLtdStatsCards />
        
        <Card>
          <CardHeader>
            <CardTitle>Non-Ltd Workflows</CardTitle>
            <CardDescription>
              Track and manage non-limited company accounts workflows and deadlines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
              <NonLtdDeadlinesTable />
            </Suspense>
          </CardContent>
        </Card>
      </PageContent>
    </PageLayout>
  )
} 