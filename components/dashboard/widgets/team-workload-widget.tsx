'use client'

import { useState, useEffect, useMemo } from 'react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users,
  Crown,
  Shield,
  User,
  Receipt,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  role: string
  clientCount: number
  vatClients: number
  accountsClients: number
}

interface TeamWorkloadData {
  teamWorkload: TeamMember[]
}

type SortField = 'name' | 'vatClients' | 'accountsClients'
type SortDirection = 'asc' | 'desc'

export function TeamWorkloadWidget() {
  const [data, setData] = useState<TeamWorkloadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const fetchTeamWorkload = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/widgets/team-workload', {
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch team workload')
      }
      
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch team workload')
      }
    } catch (err) {
      console.error('Team workload fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamWorkload()
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc') // Default to desc for number columns to show highest first
    }
  }

  const sortedTeamWorkload = useMemo(() => {
    if (!data?.teamWorkload) return []

    return [...data.teamWorkload].sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'vatClients':
          aValue = a.vatClients
          bValue = b.vatClients
          break
        case 'accountsClients':
          aValue = a.accountsClients
          bValue = b.accountsClients
          break
        default:
          return 0
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
  }, [data?.teamWorkload, sortField, sortDirection])

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'partner': return <Crown className="h-3 w-3 text-purple-600" />
      case 'manager': return <Shield className="h-3 w-3 text-blue-600" />
      default: return <User className="h-3 w-3 text-gray-600" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'partner': return 'default'
      case 'manager': return 'secondary'
      default: return 'outline'
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3" />
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3" /> : 
      <ArrowDown className="h-3 w-3" />
  }

  if (loading) {
    return (
      <>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Workload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p className="text-sm">Loading team workload...</p>
          </div>
        </CardContent>
      </>
    )
  }

  if (error) {
    return (
      <>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Workload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">
            <p className="text-sm">Error: {error}</p>
          </div>
        </CardContent>
      </>
    )
  }

  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className="justify-start h-auto p-0 hover:bg-transparent"
              onClick={() => handleSort('name')}
            >
              <span>Team Member</span>
              {getSortIcon('name')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-center h-auto p-0 hover:bg-transparent"
              onClick={() => handleSort('vatClients')}
            >
              <Receipt className="h-3 w-3 mr-1" />
              <span>VAT</span>
              {getSortIcon('vatClients')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="justify-center h-auto p-0 hover:bg-transparent"
              onClick={() => handleSort('accountsClients')}
            >
              <FileText className="h-3 w-3 mr-1" />
              <span>Accounts</span>
              {getSortIcon('accountsClients')}
            </Button>
            <div className="text-center">Total</div>
          </div>

          {/* Table Body */}
          <div className="max-h-64 overflow-y-auto">
            {sortedTeamWorkload.map((member) => {
              const totalClients = member.vatClients + member.accountsClients
              const hasWork = totalClients > 0
              
              return (
                <div key={member.id} className={`grid grid-cols-4 gap-2 px-4 py-2 border-b border-border/50 text-sm hover:bg-muted/30 transition-colors ${
                  !hasWork ? 'opacity-60' : ''
                }`}>
                  {/* Team Member */}
                  <div className="flex items-center gap-2 min-w-0">
                    {getRoleIcon(member.role)}
                    <span className="truncate font-medium">{member.name}</span>
                    <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs px-1 py-0 ml-auto">
                      {member.role.charAt(0)}
                    </Badge>
                  </div>

                  {/* VAT */}
                  <div className="text-center">
                    {member.vatClients > 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                        {member.vatClients}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Accounts */}
                  <div className="text-center">
                    {member.accountsClients > 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                        {member.accountsClients}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Total */}
                  <div className="text-center">
                    {totalClients > 0 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-xs font-bold">
                        {totalClients}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {sortedTeamWorkload.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No team members found</p>
            </div>
          )}
        </div>
      </CardContent>
    </>
  )
} 