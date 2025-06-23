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
import { AdvancedFilterModal } from './advanced-filter-modal'

interface User {
  id: string
  name: string
  email: string
  role: string
}

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

interface Filters {
  companyType: string
  accountsAssignedUser: string
  vatAssignedUser: string
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
  advancedFilter?: AdvancedFilter | null
  onAdvancedFilterChange: (filter: AdvancedFilter | null) => void
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
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [currentAdvancedFilter, setCurrentAdvancedFilter] = useState<AdvancedFilter | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [userClientCounts, setUserClientCounts] = useState<Record<string, number>>({})
  const [accountsClientCounts, setAccountsClientCounts] = useState<Record<string, number>>({})
  const [vatClientCounts, setVatClientCounts] = useState<Record<string, number>>({})
  const { data: session } = useSession()

  // Fetch users for filtering (only for managers and partners)
  useEffect(() => {
    if (session?.user?.role === 'PARTNER' || session?.user?.role === 'MANAGER') {
      fetchUsers()
      fetchUserClientCounts()
    }
  }, [session])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?includeSelf=true')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchUserClientCounts = async () => {
    try {
      const response = await fetch('/api/clients/user-counts')
      if (response.ok) {
        const data = await response.json()
        setUserClientCounts(data.userClientCounts || {})
        setAccountsClientCounts(data.accountsClientCounts || {})
        setVatClientCounts(data.vatClientCounts || {})
      }
    } catch (error) {
      console.error('Error fetching user client counts:', error)
    }
  }

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
      if (filters.accountsAssignedUser) params.append('accountsAssignedUser', filters.accountsAssignedUser)
      if (filters.vatAssignedUser) params.append('vatAssignedUser', filters.vatAssignedUser)

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
      accountsAssignedUser: '',
      vatAssignedUser: '',
      status: ''
    })
    onSearchChange('')
    setCurrentAdvancedFilter(null)
    if (onAdvancedFilterChange) {
      onAdvancedFilterChange(null)
    }
  }

  const handleAdvancedFilter = (filter: AdvancedFilter) => {
    setCurrentAdvancedFilter(filter)
    if (onAdvancedFilterChange) {
      onAdvancedFilterChange(filter)
    }
    // Clear basic filters when using advanced filters
    onFiltersChange({
      companyType: '',
      accountsAssignedUser: '',
      vatAssignedUser: '',
      status: ''
    })
    onSearchChange('')
  }

  const clearAdvancedFilter = () => {
    setCurrentAdvancedFilter(null)
    if (onAdvancedFilterChange) {
      onAdvancedFilterChange(null)
    }
  }

  const hasActiveFilters = searchQuery || filters.companyType || filters.accountsAssignedUser || filters.vatAssignedUser || currentAdvancedFilter

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
          <Button
            variant={currentAdvancedFilter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAdvancedFilter(true)}
            className="btn-outline flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Advanced Filters
            {currentAdvancedFilter && (
              <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                ON
              </Badge>
            )}
          </Button>
          
          {/* Quick filter for staff users */}
          {session?.user?.role === 'STAFF' && (
            <Button
              variant={filters.accountsAssignedUser === 'me' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('accountsAssignedUser', filters.accountsAssignedUser === 'me' ? 'all' : 'me')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              {filters.accountsAssignedUser === 'me' ? 'All Clients' : 'My Clients'}
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

      {/* Search */}
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
      </Card>

      {/* General Filters - Always Visible */}
      {!currentAdvancedFilter && (
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
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Accounts Assigned
              </label>
              <Select
                value={filters.accountsAssignedUser || 'all'}
                onValueChange={(value) => handleFilterChange('accountsAssignedUser', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Accounts Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="me">My Clients</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({accountsClientCounts[user.id] || 0} clients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                VAT Assigned
              </label>
              <Select
                value={filters.vatAssignedUser || 'all'}
                onValueChange={(value) => handleFilterChange('vatAssignedUser', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="VAT Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="me">My Clients</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({vatClientCounts[user.id] || 0} clients)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {currentAdvancedFilter && (
            <Badge variant="default" className="flex items-center gap-1">
              <Settings className="h-3 w-3" />
              Advanced: {currentAdvancedFilter.name}
              <button
                onClick={clearAdvancedFilter}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5"
              >
                ×
              </button>
            </Badge>
          )}
          {!currentAdvancedFilter && searchQuery && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{searchQuery}"
            </Badge>
          )}
          {!currentAdvancedFilter && filters.companyType && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Type: {filters.companyType.replace('_', ' ')}
            </Badge>
          )}
          {!currentAdvancedFilter && filters.accountsAssignedUser && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Accounts: {filters.accountsAssignedUser === 'me' ? 'My Clients' : 
                         filters.accountsAssignedUser === 'unassigned' ? 'Unassigned' : 
                         users.find(u => u.id === filters.accountsAssignedUser)?.name || filters.accountsAssignedUser}
            </Badge>
          )}
          {!currentAdvancedFilter && filters.vatAssignedUser && (
            <Badge variant="secondary" className="flex items-center gap-1">
              VAT: {filters.vatAssignedUser === 'me' ? 'My Clients' : 
                    filters.vatAssignedUser === 'unassigned' ? 'Unassigned' : 
                    users.find(u => u.id === filters.vatAssignedUser)?.name || filters.vatAssignedUser}
            </Badge>
          )}
        </div>
      )}

      {/* Advanced Filter Modal */}
      <AdvancedFilterModal
        isOpen={showAdvancedFilter}
        onClose={() => setShowAdvancedFilter(false)}
        onApplyFilter={handleAdvancedFilter}
        currentFilter={currentAdvancedFilter}
        users={users}
      />
    </div>
  )
} 