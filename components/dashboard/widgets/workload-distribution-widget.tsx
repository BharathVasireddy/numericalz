'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useRouter } from 'next/navigation'
import { Users, TrendingUp, AlertCircle, Crown, Shield, User } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  role: 'PARTNER' | 'MANAGER' | 'STAFF'
  email: string
  clientCount: number
  overdueCount: number
  completedThisMonth: number
  workloadPercentage: number
  status: 'available' | 'busy' | 'overloaded'
}

interface WorkloadDistributionWidgetProps {
  teamMembers: TeamMember[]
  title?: string
}

export function WorkloadDistributionWidget({ 
  teamMembers, 
  title = "Team Workload Distribution" 
}: WorkloadDistributionWidgetProps) {
  const router = useRouter()

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'PARTNER':
        return <Crown className="h-4 w-4 text-purple-600" />
      case 'MANAGER':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'STAFF':
        return <User className="h-4 w-4 text-gray-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700'
      case 'busy':
        return 'bg-yellow-100 text-yellow-700'
      case 'overloaded':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-orange-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const handleMemberClick = (member: TeamMember) => {
    router.push(`/dashboard/clients?assignee=${member.id}`)
  }

  const handleViewTeamManagement = () => {
    router.push('/dashboard/staff')
  }

  const totalClients = teamMembers.reduce((sum, member) => sum + member.clientCount, 0)
  const totalOverdue = teamMembers.reduce((sum, member) => sum + member.overdueCount, 0)
  const averageWorkload = teamMembers.length > 0 
    ? teamMembers.reduce((sum, member) => sum + member.workloadPercentage, 0) / teamMembers.length 
    : 0

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Badge variant="secondary" className="ml-2">
            {teamMembers.length} members
          </Badge>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalClients}</p>
            <p className="text-xs text-muted-foreground">Total Clients</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{totalOverdue}</p>
            <p className="text-xs text-muted-foreground">Overdue Items</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{Math.round(averageWorkload)}%</p>
            <p className="text-xs text-muted-foreground">Avg Workload</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {teamMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No team members found</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleMemberClick(member)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(member.role)}
                      <span className="font-medium text-sm">{member.name}</span>
                      <Badge className={`text-xs ${getStatusColor(member.status)}`}>
                        {member.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.overdueCount > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-red-500" />
                          <span className="text-xs text-red-600">{member.overdueCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {member.clientCount} clients • {member.completedThisMonth} completed this month
                      </span>
                      <span className="font-medium">{member.workloadPercentage}%</span>
                    </div>
                    <Progress 
                      value={member.workloadPercentage} 
                      className="h-2"
                      style={{
                        '--progress-background': getWorkloadColor(member.workloadPercentage)
                      } as React.CSSProperties}
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t">
              <button
                onClick={handleViewTeamManagement}
                className="w-full p-2 text-sm text-center text-muted-foreground hover:text-primary transition-colors"
              >
                View Team Management →
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
} 