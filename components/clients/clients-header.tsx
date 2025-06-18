'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Search, Filter, Download } from 'lucide-react'
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

interface ClientsHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  filters: {
    companyType: string
    assignedUser: string
    status: string
  }
  onFiltersChange: (filters: any) => void
  totalCount?: number
  filteredCount?: number
  pageTitle?: string
  pageDescription?: string
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
  totalCount = 0,
  filteredCount = 0,
  pageTitle = "Clients",
  pageDescription
}: ClientsHeaderProps) {
  const router = useRouter()
  const [showFilters, setShowFilters] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const { data: session } = useSession()

  const handleFilterChange = (key: string, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filters.companyType) params.append('companyType', filters.companyType)
      if (filters.assignedUser) params.append('assignedUser', filters.assignedUser)
      if (filters.status) params.append('status', filters.status)

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
      assignedUser: '',
      status: ''
    })
    onSearchChange('')
  }

  const hasActiveFilters = searchQuery || filters.companyType || filters.assignedUser || filters.status

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{pageTitle}</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {pageDescription || (hasActiveFilters ? (
              <>Showing {filteredCount} of {totalCount} clients</>
            ) : (
              <>Manage all {totalCount} clients</>
            ))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          
          {/* Quick filter for staff users */}
          {session?.user?.role === 'STAFF' && (
            <Button
              variant={filters.assignedUser === 'me' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('assignedUser', filters.assignedUser === 'me' ? '' : 'me')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              {filters.assignedUser === 'me' ? 'All Clients' : 'My Clients'}
            </Button>
          )}
          
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
                <Select
                  value={filters.companyType}
                  onValueChange={(value) => handleFilterChange('companyType', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Company Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="LIMITED_COMPANY">Limited Company</SelectItem>
                    <SelectItem value="NON_LIMITED_COMPANY">Non-Limited Company</SelectItem>
                    <SelectItem value="DIRECTOR">Director</SelectItem>
                    <SelectItem value="SUB_CONTRACTOR">Sub Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Assigned User
                </label>
                <Select
                  value={filters.assignedUser}
                  onValueChange={(value) => handleFilterChange('assignedUser', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Assigned To" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Users</SelectItem>
                    <SelectItem value="me">My Clients</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Status
                </label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{searchQuery}"
            </Badge>
          )}
          {filters.companyType && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {filters.companyType.replace('_', ' ')}
            </Badge>
          )}
          {filters.assignedUser && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Assigned: {filters.assignedUser === 'me' ? 'My Clients' : 
                         filters.assignedUser === 'unassigned' ? 'Unassigned' : filters.assignedUser}
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {filters.status === 'true' ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
} 