'use client'

import { useState, useCallback, useEffect } from 'react'
import { ClientsHeader } from '@/components/clients/clients-header'
import { ClientsTable } from '@/components/clients/clients-table'

// Advanced filter interfaces
interface FilterCondition {
  id: string
  field: string
  operator: string
  value: string | string[] | boolean | null
  value2?: string
}

interface FilterGroup {
  id: string
  operator: 'AND' | 'OR'
  conditions: FilterCondition[]
}

interface AdvancedFilter {
  id: string
  name: string
  groups: FilterGroup[]
  groupOperator: 'AND' | 'OR'
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

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
    accountsAssignedUser: '',
    vatAssignedUser: '',
    status: ''
  })
  const [advancedFilter, setAdvancedFilter] = useState<AdvancedFilter | null>(null)
  const [clientCounts, setClientCounts] = useState({
    total: 0,
    filtered: 0
  })
  const [users, setUsers] = useState<User[]>([])

  const handleClientCountsUpdate = useCallback((total: number, filtered: number) => {
    setClientCounts({ total, filtered })
  }, [])

  const handleAdvancedFilter = useCallback((filter: AdvancedFilter | null) => {
    setAdvancedFilter(filter)
  }, [])

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      }
    }
    
    fetchUsers()
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
            totalClients={clientCounts.total}
            filteredClients={clientCounts.filtered}
            users={users}
            advancedFilter={advancedFilter}
            onAdvancedFilterChange={handleAdvancedFilter}
          />
          
          <ClientsTable 
            searchQuery={searchQuery}
            filters={filters}
            advancedFilter={advancedFilter}
            onClientCountsUpdate={handleClientCountsUpdate}
          />
        </div>
      </div>
    </div>
  )
} 