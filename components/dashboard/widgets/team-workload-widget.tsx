'use client'

import { useState, useEffect } from 'react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users,
  Crown,
  Shield,
  User,
  Receipt,
  FileText
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

export function TeamWorkloadWidget() {
  const [data, setData] = useState<TeamWorkloadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamWorkload = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/widgets/team-workload', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch team workload data')
      }
    } catch (error) {
      console.error('Team workload API error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamWorkload()
  }, [])

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'partner': return <Crown className="h-3 w-3 text-purple-600" />
      case 'manager': return <Shield className="h-3 w-3 text-blue-600" />
      default: return <User className="h-3 w-3 text-gray-600" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'partner': return 'default' as const
      case 'manager': return 'secondary' as const
      default: return 'outline' as const
    }
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
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
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
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Failed to load team workload</p>
            <button 
              onClick={fetchTeamWorkload}
              className="text-xs text-primary hover:underline mt-1"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </>
    )
  }

  if (!data || !data.teamWorkload) {
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
            <p className="text-sm">No team data available</p>
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
      <CardContent>
        <div className="space-y-2">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
            <div className="col-span-5">Team Member</div>
            <div className="col-span-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <Receipt className="h-3 w-3" />
                <span>VAT</span>
              </div>
            </div>
            <div className="col-span-2 text-center">
              <div className="flex items-center justify-center gap-1">
                <FileText className="h-3 w-3" />
                <span>Accounts</span>
              </div>
            </div>
            <div className="col-span-3 text-center">Total</div>
          </div>

          {/* Team Member Rows */}
          {data.teamWorkload.map((member) => {
            const totalClients = member.vatClients + member.accountsClients
            const hasWork = totalClients > 0
            
            return (
              <div key={member.id} className={`grid grid-cols-12 gap-2 p-2 rounded-lg border transition-all duration-200 ${
                hasWork ? 'bg-slate-50 border-slate-200' : 'bg-gray-50 border-gray-200 opacity-70'
              }`}>
                {/* Team Member Info */}
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  {getRoleIcon(member.role)}
                  <span className="text-sm font-medium truncate">{member.name}</span>
                  <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs px-1 py-0 flex-shrink-0">
                    {member.role.charAt(0)}
                  </Badge>
                </div>

                {/* VAT Clients */}
                <div className="col-span-2 flex items-center justify-center">
                  {member.vatClients > 0 ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 border border-blue-200">
                      <span className="text-sm font-bold text-blue-800">{member.vatClients}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">0</span>
                  )}
                </div>

                {/* Accounts Clients */}
                <div className="col-span-2 flex items-center justify-center">
                  {member.accountsClients > 0 ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 border border-green-200">
                      <span className="text-sm font-bold text-green-800">{member.accountsClients}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">0</span>
                  )}
                </div>

                {/* Total */}
                <div className="col-span-3 flex items-center justify-center">
                  {hasWork ? (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                      <span className="text-sm font-bold text-gray-800">{totalClients}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">No assignments</span>
                  )}
                </div>
              </div>
            )
          })}
          
          {data.teamWorkload.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <p className="text-sm">No team members found</p>
            </div>
          )}
        </div>
      </CardContent>
    </>
  )
} 