'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Search, Filter, Download, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { showToast } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreVertical,
  Building2,
  Users,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Filters {
  companyType: string
  status: string
}

interface ClientsHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  totalClients: number
  filteredClients: number
  users: User[]
  advancedFilter?: any | null
  onAdvancedFilterChange: (filter: any | null) => void
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
export function ClientsHeader({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  totalClients,
  filteredClients,
  users,
  advancedFilter,
  onAdvancedFilterChange
}: ClientsHeaderProps) {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const { data: session } = useSession()

  // Users are now passed as props from parent component

  const handleFilterChange = (key: string, value: string) => {
    // Convert "all" to empty string for API compatibility
    const actualValue = value === 'all' ? '' : value
    onFiltersChange({
      ...filters,
      [key]: actualValue
    })
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filters.companyType) params.append('companyType', filters.companyType)

      const response = await fetch(`/api/clients/export?${params.toString()}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        console.error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const clearFilters = () => {
    onFiltersChange({
      companyType: '',
      status: ''
    })
    onSearchChange('')
    if (onAdvancedFilterChange) {
      onAdvancedFilterChange(null)
    }
  }

  const hasActiveFilters = searchQuery || filters.companyType || advancedFilter

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Clients</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {filteredClients > 0 ? (
              <>Showing {filteredClients} of {totalClients} clients</>
            ) : (
              <>Manage all {totalClients} clients</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session?.user?.role === 'PARTNER' && (
            <Button
              variant="outline"
              size="sm"
              className="btn-outline"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          )}
          <Button asChild size="sm" className="flex items-center gap-2">
            <Link href={`/dashboard/clients/add${filters.companyType ? `?type=${filters.companyType}` : ''}`}>
              <Plus className="h-4 w-4" />
              Add Client
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search clients by name, company number, or email..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-12"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* General Filters - Always Visible */}
      {!advancedFilter && (
        <Card className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Company Type
              </label>
              <Select
                value={filters.companyType || 'all'}
                onValueChange={(value) => handleFilterChange('companyType', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Company Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="LIMITED_COMPANY">Limited Company</SelectItem>
                  <SelectItem value="NON_LIMITED_COMPANY">Non-Limited Company</SelectItem>
                  <SelectItem value="DIRECTOR">Director</SelectItem>
                  <SelectItem value="SUB_CONTRACTOR">Sub Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {advancedFilter && (
            <Badge variant="default" className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Advanced: {advancedFilter.name}
            </Badge>
          )}
          {!advancedFilter && searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{searchQuery}"
            </Badge>
          )}
          {!advancedFilter && filters.companyType && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {filters.companyType.replace('_', ' ')}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
} 