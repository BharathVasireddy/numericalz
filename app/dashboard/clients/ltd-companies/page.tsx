'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LtdCompaniesDeadlinesTable } from '@/components/clients/ltd-companies-deadlines-table'

/**
 * Limited Companies deadlines page
 * 
 * Features:
 * - View all Limited Company clients with filing deadlines
 * - Track accounts, CT, and CS due dates
 * - Workflow management for accounts filing process
 * - Assignment filters (assigned to me / all clients)
 * - Update workflow stages with milestone tracking
 */
export default function LtdCompaniesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading
    if (!session) {
      router.push('/auth/login')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <LtdCompaniesDeadlinesTable />
} 