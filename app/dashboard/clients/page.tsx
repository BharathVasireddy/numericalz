'use client'

import { useState, useCallback } from 'react'
import { ClientsHeader } from '@/components/clients/clients-header'
import { ClientsTable } from '@/components/clients/clients-table'

/**
 * Clients listing page
 * 
 * Features:
 * - View all clients in a table
 * - Search and filter clients
 * - Add new clients
 * - Quick actions (edit, view, assign)
 * - Companies House integration
 * 
 * Note: Authentication is handled by middleware and dashboard layout
 */
export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    companyType: '',
    assignedUser: '',
    accountsAssignedUser: '',
    vatAssignedUser: '',
    status: ''
  })
  const [clientCounts, setClientCounts] = useState({
    total: 0,
    filtered: 0
  })

  const handleClientCountsUpdate = useCallback((total: number, filtered: number) => {
    setClientCounts({ total, filtered })
  }, [])

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          <ClientsHeader 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            totalCount={clientCounts.total}
            filteredCount={clientCounts.filtered}
          />
          
          <ClientsTable 
            searchQuery={searchQuery}
            filters={filters}
            onClientCountsUpdate={handleClientCountsUpdate}
          />
        </div>
      </div>
    </div>
  )
} 