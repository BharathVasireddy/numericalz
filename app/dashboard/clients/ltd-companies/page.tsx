'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ClientsHeader } from '@/components/clients/clients-header'
import { ClientsTable } from '@/components/clients/clients-table'
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

/**
 * Limited Companies listing page
 * 
 * Features:
 * - View all Limited Company clients in a table
 * - Search and filter clients
 * - Add new clients
 * - Quick actions (edit, view, assign)
 * - Companies House integration
 */
export default function LtdCompaniesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    companyType: 'LIMITED_COMPANY',
    assignedUser: '',
    status: ''
  })

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

  return (
    <PageLayout maxWidth="2xl">
      <PageHeader 
        title="Ltd Companies"
        description="Manage all Limited Company clients"
        icon={Building2}
      >
        <Link href="/dashboard/clients/add">
          <Button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </Link>
      </PageHeader>
      
      <PageContent>
        <div className="space-y-6">
          <ClientsHeader 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
          />
          
          <ClientsTable 
            searchQuery={searchQuery}
            filters={filters}
          />
        </div>
      </PageContent>
    </PageLayout>
  )
} 