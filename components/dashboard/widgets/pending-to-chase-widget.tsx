'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Phone, 
  Clock, 
  Building, 
  FileText, 
  AlertTriangle,
  ExternalLink,
  Users,
  ArrowRight,
  Target,
  Calendar
} from 'lucide-react'
import { showToast } from '@/lib/toast'

interface PendingToChaseClient {
  id: string
  clientId: string
  clientCode: string
  companyName: string
  workflowType: 'VAT' | 'ACCOUNTS'
  quarterPeriod?: string // For VAT quarters
  yearEnd: string
  filingDate: string
  daysSinceYearEnd: number
  priority: 'low' | 'medium' | 'high'
  chaseTeamMembers: Array<{
    id: string
    name: string
    email: string
    role: string
  }>
}

interface PendingToChaseWidgetProps {
  userRole: string
  userId: string
}

export function PendingToChaseWidget({ userRole, userId }: PendingToChaseWidgetProps) {
  const router = useRouter()
  const [clients, setClients] = useState<PendingToChaseClient[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetchPendingToChaseClients()
  }, [userRole, userId])

  const fetchPendingToChaseClients = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/pending-to-chase', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        setClients(data.clients || [])
      } else {
        console.error('Failed to fetch pending to chase clients:', data.error)
      }
    } catch (error) {
      console.error('Error fetching pending to chase clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-3 w-3" />
      case 'medium':
        return <Clock className="h-3 w-3" />
      default:
        return <Target className="h-3 w-3" />
    }
  }

  const getWorkflowIcon = (type: string) => {
    return type === 'VAT' 
      ? <FileText className="h-4 w-4 text-blue-600" />
      : <Building className="h-4 w-4 text-green-600" />
  }

  const handleClientClick = (client: PendingToChaseClient) => {
    const url = client.workflowType === 'VAT' 
      ? `/dashboard/clients/vat-dt?focus=${client.clientId}`
      : `/dashboard/clients/ltd-companies?focus=${client.clientId}`
    router.push(url)
  }

  const handleStartChasing = async (client: PendingToChaseClient) => {
    try {
      const endpoint = client.workflowType === 'VAT' 
        ? `/api/vat-quarters/${client.id}/workflow`
        : `/api/clients/ltd-deadlines/${client.clientId}/workflow`

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: 'PAPERWORK_CHASED',
          comments: 'Started chasing paperwork from dashboard widget'
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Chase started successfully')
        await fetchPendingToChaseClients() // Refresh the list
      } else {
        showToast.error(data.error || 'Failed to start chase')
      }
    } catch (error) {
      console.error('Error starting chase:', error)
      showToast.error('Failed to start chase')
    }
  }

  // Show only to managers and partners
  if (userRole !== 'MANAGER' && userRole !== 'PARTNER') {
    return null
  }

  // Show only first 3 items by default for more compact display
  const displayClients = expanded ? clients : clients.slice(0, 3)
  const hasMore = clients.length > 3

  if (loading) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-amber-600" />
            Pending to Chase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (clients.length === 0) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-amber-600" />
            Pending to Chase
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Phone className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No pending chases</p>
            <p className="text-xs text-muted-foreground mt-1">All clients up to date!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-fit border-l-4 border-l-amber-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-amber-600" />
            Pending to Chase
            <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800 text-xs">
              {clients.length}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/clients/vat-dt?stage=PAPERWORK_PENDING_CHASE')}
            className="text-xs h-7"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Clients ready for paperwork chase after year/quarter end
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {displayClients.map((client) => (
            <div
              key={client.id}
              className="p-3 rounded border bg-gradient-to-r from-amber-50 to-orange-50 hover:shadow-sm transition-all duration-200 cursor-pointer"
              onClick={() => handleClientClick(client)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getWorkflowIcon(client.workflowType)}
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-sm truncate">{client.companyName}</h4>
                    <p className="text-xs text-muted-foreground">{client.clientCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getPriorityColor(client.priority)}`}
                  >
                    {getPriorityIcon(client.priority)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {client.workflowType}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {client.workflowType === 'VAT' ? 'QE:' : 'YE:'} {client.yearEnd}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>Due: {client.filingDate}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-amber-700">
                    <Clock className="h-3 w-3" />
                    {client.daysSinceYearEnd} days since {client.workflowType === 'VAT' ? 'quarter end' : 'year end'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {client.chaseTeamMembers.length} chase team
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartChasing(client)
                  }}
                  className="h-6 px-2 text-xs bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
                >
                  Start <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-amber-700 hover:text-amber-800 h-7"
            >
              {expanded ? 'Show Less' : `+${clients.length - 3} More`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 