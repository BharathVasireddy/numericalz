'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Search, Filter, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface ClientsHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filters: {
    companyType: string
    assignedUser: string
    status: string
  }
  onFiltersChange: (filters: any) => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

/**
 * Clients page header component
 * 
 * Features:
 * - Page title and description
 * - Search functionality
 * - Filter options
 * - Add new client button
 * - Export functionality
 */
export function ClientsHeader({ searchQuery, onSearchChange, filters, onFiltersChange, onRefresh, isRefreshing }: ClientsHeaderProps) {
  const router = useRouter()
  const [showFilters, setShowFilters] = useState(false)
  const { data: session } = useSession()

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Clients</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Manage your client relationships and information
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="btn-outline"
            title="Refresh client data from Companies House"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="btn-outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {session?.user?.role === 'MANAGER' && (
            <Button
              size="sm"
              onClick={() => router.push('/dashboard/clients/add')}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search clients by name, company number, or email..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 input-field"
              />
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Company Type
                </label>
                <select 
                  className="input-field w-full"
                  value={filters.companyType}
                  onChange={(e) => handleFilterChange('companyType', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="LIMITED_COMPANY">Limited Companies</option>
                  <option value="NON_LIMITED_COMPANY">Non Limited Companies</option>
                  <option value="DIRECTOR">Directors</option>
                  <option value="SUB_CONTRACTOR">Sub Contractors</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Assigned User
                </label>
                <select 
                  className="input-field w-full"
                  value={filters.assignedUser}
                  onChange={(e) => handleFilterChange('assignedUser', e.target.value)}
                >
                  <option value="">All Users</option>
                  <option value="me">Assigned to Me</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Status
                </label>
                <select 
                  className="input-field w-full"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
} 