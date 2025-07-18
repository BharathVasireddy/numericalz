'use client'

import React, { useState, useEffect } from 'react'
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
  Calendar,
  User,
  Plus,
  Briefcase,
  CheckCircle,
  Send,
  UserCheck
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Workflow stage definitions for Ltd companies
const LTD_WORKFLOW_STAGES = [
  { key: 'PAPERWORK_PENDING_CHASE', label: 'Pending to chase', icon: <Clock className="h-4 w-4" />, color: 'bg-amber-100 text-amber-800' },
  { key: 'PAPERWORK_CHASED', label: 'Paperwork chased', icon: <Phone className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'PAPERWORK_RECEIVED', label: 'Paperwork received', icon: <FileText className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'WORK_IN_PROGRESS', label: 'Work in progress', icon: <Target className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  { key: 'DISCUSS_WITH_MANAGER', label: 'Discuss with manager', icon: <Users className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
  { key: 'REVIEWED_BY_MANAGER', label: 'Reviewed by manager', icon: <User className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-800' },
  { key: 'REVIEW_BY_PARTNER', label: 'Review by partner', icon: <User className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-800' },
  { key: 'REVIEWED_BY_PARTNER', label: 'Reviewed by partner', icon: <User className="h-4 w-4" />, color: 'bg-pink-100 text-pink-800' },
  { key: 'REVIEW_DONE_HELLO_SIGN', label: 'Review done - HelloSign', icon: <FileText className="h-4 w-4" />, color: 'bg-teal-100 text-teal-800' },
  { key: 'SENT_TO_CLIENT_HELLO_SIGN', label: 'Sent to client (HelloSign)', icon: <ArrowRight className="h-4 w-4" />, color: 'bg-lime-100 text-lime-800' },
  { key: 'APPROVED_BY_CLIENT', label: 'Approved by client', icon: <User className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800' },
  { key: 'SUBMISSION_APPROVED_PARTNER', label: 'Submission approved by partner', icon: <User className="h-4 w-4" />, color: 'bg-violet-100 text-violet-800' },
        { key: 'FILED_TO_COMPANIES_HOUSE', label: 'Filed to Companies House', icon: <Building className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
      { key: 'FILED_TO_HMRC', label: 'Filed to HMRC', icon: <Building className="h-4 w-4" />, color: 'bg-green-100 text-green-800' }
]

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

  // VAT Workflow Modal state
  const [showVATModal, setShowVATModal] = useState(false)
  const [selectedVATQuarter, setSelectedVATQuarter] = useState<any>(null)

  // Ltd Workflow Modal state  
  const [showLtdModal, setShowLtdModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<PendingToChaseClient | null>(null)
  const [updateComments, setUpdateComments] = useState('')
  const [updating, setUpdating] = useState(false)

  // Users data for assignment dropdowns
  const [users, setUsers] = useState<Array<{
    id: string
    name: string
    email: string
    role: string
  }>>([])

  useEffect(() => {
    fetchPendingToChaseClients()
    fetchUsers()
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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        setUsers(data.users || [])
      } else {
        console.error('Failed to fetch users:', data.error)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
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
    if (client.workflowType === 'VAT') {
      // For VAT workflows, we need to fetch the quarter data and open VAT modal
      await handleOpenVATModal(client)
    } else if (client.workflowType === 'ACCOUNTS') {
      // For Ltd workflows, open the Ltd modal
      handleOpenLtdModal(client)
    }
  }

  const handleOpenVATModal = async (client: PendingToChaseClient) => {
    try {
      // Fetch the VAT quarter data for the modal
      const response = await fetch(`/api/clients/${client.clientId}/vat-quarters`)
      const data = await response.json()
      
      if (data.success && data.data && data.data.vatQuarters && data.data.vatQuarters.length > 0) {
        // Find the quarter that matches the pending workflow
        const matchingQuarter = data.data.vatQuarters.find((q: any) => 
          q.id === client.id || q.currentStage === 'PAPERWORK_PENDING_CHASE'
        )
        
        if (matchingQuarter) {
          setSelectedVATQuarter({
            ...matchingQuarter,
            client: {
              id: client.clientId,
              companyName: client.companyName,
              vatQuarterGroup: data.data.client.vatQuarterGroup || '1_4_7_10'
            }
          })
          setShowVATModal(true)
        } else {
          showToast.error('VAT quarter not found')
        }
      } else {
        showToast.error('Failed to fetch VAT quarter data')
      }
    } catch (error) {
      console.error('Error fetching VAT quarter:', error)
      showToast.error('Failed to open VAT workflow modal')
    }
  }

  const handleOpenLtdModal = (client: PendingToChaseClient) => {
    setSelectedClient(client)
    setUpdateComments('')
    setShowLtdModal(true)
  }

  const handleVATWorkflowUpdate = async () => {
    if (!selectedVATQuarter) {
      showToast.error('No VAT quarter selected')
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/vat-quarters/${selectedVATQuarter.id}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'PAPERWORK_CHASED', // Automatically advance to "Paperwork Chased"
          comments: updateComments.trim() || 'Started chasing paperwork from Pending to Chase widget'
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Started chasing - workflow updated successfully')
        setShowVATModal(false)
        setSelectedVATQuarter(null)
        setUpdateComments('')
        await fetchPendingToChaseClients() // Refresh the list
      } else {
        showToast.error(data.error || 'Failed to start chasing')
      }
    } catch (error) {
      console.error('Error starting chase:', error)
      showToast.error('Failed to start chasing')
    } finally {
      setUpdating(false)
    }
  }

  const handleLtdWorkflowUpdate = async () => {
    if (!selectedClient) {
      showToast.error('No client selected')
      return
    }

    setUpdating(true)
    try {
      // For Ltd companies, we'll need to create or update the workflow
      // This is a simplified approach - you may need to adjust the API endpoint
      const response = await fetch(`/api/clients/ltd-deadlines/${selectedClient.clientId}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: 'PAPERWORK_CHASED', // Automatically advance to "Paperwork Chased"
          comments: updateComments.trim() || 'Started chasing paperwork from Pending to Chase widget'
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Started chasing - workflow updated successfully')
        setShowLtdModal(false)
        setSelectedClient(null)
        setUpdateComments('')
        await fetchPendingToChaseClients() // Refresh the list
      } else {
        showToast.error(data.error || 'Failed to start chasing')
      }
    } catch (error) {
      console.error('Error starting chase:', error)
      showToast.error('Failed to start chasing')
    } finally {
      setUpdating(false)
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
    <>
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

    {/* VAT Start Chasing Modal - Simplified */}
    <Dialog open={showVATModal} onOpenChange={setShowVATModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Chasing Paperwork</DialogTitle>
          <DialogDescription>
            Begin chasing paperwork for {selectedVATQuarter?.client?.companyName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Client Info Display */}
          {selectedVATQuarter && (
            <div className="bg-muted/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Client Information</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Company:</span>
                  <span className="text-sm font-medium">{selectedVATQuarter.client.companyName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Action:</span>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800">
                    Start Chasing → Paperwork Chased
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-2">
            <Label htmlFor="chase-comments">Comments (Optional)</Label>
            <Textarea
              id="chase-comments"
              placeholder="Add any notes about starting the chase process..."
              value={updateComments}
              onChange={(e) => setUpdateComments(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will automatically advance the workflow to "Paperwork Chased" stage
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowVATModal(false)}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleVATWorkflowUpdate}
            disabled={updating}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {updating ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Starting Chase...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Started Chasing
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Ltd Start Chasing Modal - Simplified */}
    <Dialog open={showLtdModal} onOpenChange={setShowLtdModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Chasing Paperwork</DialogTitle>
          <DialogDescription>
            Begin chasing paperwork for {selectedClient?.companyName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Client Info Display */}
          {selectedClient && (
            <div className="bg-muted/20 p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Client Information</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Company:</span>
                  <span className="text-sm font-medium">{selectedClient.companyName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Ltd Company Accounts
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Action:</span>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800">
                    Start Chasing → Paperwork Chased
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="space-y-2">
            <Label htmlFor="ltd-chase-comments">Comments (Optional)</Label>
            <Textarea
              id="ltd-chase-comments"
              placeholder="Add any notes about starting the chase process..."
              value={updateComments}
              onChange={(e) => setUpdateComments(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will automatically advance the workflow to "Paperwork Chased" stage
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowLtdModal(false)}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleLtdWorkflowUpdate}
            disabled={updating}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {updating ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Starting Chase...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                Started Chasing
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
} 