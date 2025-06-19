'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Calendar, 
  User, 
  CheckCircle, 
  Clock, 
  FileText,
  Send,
  UserCheck,
  Building,
  RefreshCw,
  Users
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { calculateVATQuarter } from '@/lib/vat-workflow'

interface VATClient {
  id: string
  clientCode: string
  companyName: string
  vatReturnsFrequency?: string
  vatQuarterGroup?: string
  
  // VAT-specific assignee
  vatAssignedUser?: {
    id: string
    name: string
    email: string
    role: string
  }
  
  // Current VAT quarter workflow info
  currentVATQuarter?: {
    id: string
    quarterPeriod: string
    quarterStartDate: string
    quarterEndDate: string
    filingDueDate: string
    currentStage: string
    isCompleted: boolean
    assignedUser?: {
      id: string
      name: string
      email: string
      role: string
    }
    // Milestone dates with user attribution
    chaseStartedDate?: string
    chaseStartedByUserName?: string
    paperworkReceivedDate?: string
    paperworkReceivedByUserName?: string
    workStartedDate?: string
    workStartedByUserName?: string
    workFinishedDate?: string
    workFinishedByUserName?: string
    sentToClientDate?: string
    sentToClientByUserName?: string
    clientApprovedDate?: string
    clientApprovedByUserName?: string
    filedToHMRCDate?: string
    filedToHMRCByUserName?: string
  }
}

interface WorkflowStage {
  key: string
  label: string
  icon: React.ReactNode
  color: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  { key: 'CHASE_STARTED', label: 'Chase Started', icon: <User className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'PAPERWORK_RECEIVED', label: 'Paperwork Received', icon: <FileText className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'WORK_STARTED', label: 'Work Started', icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'WORK_FINISHED', label: 'Work Finished', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  { key: 'SENT_TO_CLIENT', label: 'Sent to Client', icon: <Send className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
  { key: 'CLIENT_APPROVED', label: 'Client Approved', icon: <UserCheck className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-800' },
  { key: 'FILED_TO_HMRC', label: 'Filed to HMRC', icon: <Building className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800' }
]

// Month configuration for tabs
const MONTHS = [
  { key: 'jan', name: 'January', short: 'Jan', number: 1 },
  { key: 'feb', name: 'February', short: 'Feb', number: 2 },
  { key: 'mar', name: 'March', short: 'Mar', number: 3 },
  { key: 'apr', name: 'April', short: 'Apr', number: 4 },
  { key: 'may', name: 'May', short: 'May', number: 5 },
  { key: 'jun', name: 'June', short: 'Jun', number: 6 },
  { key: 'jul', name: 'July', short: 'Jul', number: 7 },
  { key: 'aug', name: 'August', short: 'Aug', number: 8 },
  { key: 'sep', name: 'September', short: 'Sep', number: 9 },
  { key: 'oct', name: 'October', short: 'Oct', number: 10 },
  { key: 'nov', name: 'November', short: 'Nov', number: 11 },
  { key: 'dec', name: 'December', short: 'Dec', number: 12 }
]

// Quarter group to filing months mapping
const QUARTER_GROUP_FILING_MONTHS = {
  '1_4_7_10': [2, 5, 8, 11], // Filing months: Feb, May, Aug, Nov
  '2_5_8_11': [3, 6, 9, 12], // Filing months: Mar, Jun, Sep, Dec
  '3_6_9_12': [4, 7, 10, 1]  // Filing months: Apr, Jul, Oct, Jan
}

export function VATDeadlinesTable() {
  const { data: session } = useSession()
  const [vatClients, setVatClients] = useState<VATClient[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<VATClient | null>(null)
  const [selectedStage, setSelectedStage] = useState<string>('')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')
  const [updateComments, setUpdateComments] = useState<string>('')
  const [updating, setUpdating] = useState(false)
  const [activeMonth, setActiveMonth] = useState<string>('')
  const hasFetchedRef = useRef(false)

  // Get current month for default tab
  const currentMonth = new Date().getMonth() + 1
  const currentMonthKey = MONTHS.find(m => m.number === currentMonth)?.key || 'jan'

  // Initialize active month
  useEffect(() => {
    if (!activeMonth) {
      setActiveMonth(currentMonthKey)
    }
  }, [currentMonthKey, activeMonth])

  const fetchVATClients = useCallback(async () => {
    if (hasFetchedRef.current && vatClients.length > 0) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/clients/vat-clients')
      const data = await response.json()

      if (data.success) {
        setVatClients(data.clients)
        hasFetchedRef.current = true
      } else {
        showToast.error('Failed to fetch VAT clients')
      }
    } catch (error) {
      console.error('Error fetching VAT clients:', error)
      showToast.error('Failed to fetch VAT clients')
    } finally {
      setLoading(false)
    }
  }, [vatClients.length])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()

      if (data.success) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  useEffect(() => {
    fetchVATClients()
    fetchUsers()
  }, [fetchVATClients, fetchUsers])

  // Get clients for specific filing month
  const getClientsForMonth = useCallback((monthNumber: number) => {
    return vatClients.filter(client => {
      if (!client.vatQuarterGroup) return false
      
      const filingMonths = QUARTER_GROUP_FILING_MONTHS[client.vatQuarterGroup as keyof typeof QUARTER_GROUP_FILING_MONTHS]
      return filingMonths?.includes(monthNumber)
    })
  }, [vatClients])

  // Get current month clients count for prominent display
  const currentMonthClients = getClientsForMonth(currentMonth)
  const currentMonthName = MONTHS.find(m => m.number === currentMonth)?.name || ''

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  const getFilingMonth = (client: VATClient) => {
    if (!client.vatQuarterGroup || !client.currentVATQuarter) return '-'
    
    try {
      const quarterEndDate = new Date(client.currentVATQuarter.quarterEndDate)
      const filingMonth = new Date(quarterEndDate)
      filingMonth.setMonth(filingMonth.getMonth() + 1)
      
      return filingMonth.toLocaleDateString('en-GB', { month: 'long' })
    } catch {
      return '-'
    }
  }

  const getFrequencyBadge = (frequency?: string) => {
    const colors = {
      'QUARTERLY': 'bg-blue-100 text-blue-800',
      'MONTHLY': 'bg-green-100 text-green-800',
      'ANNUALLY': 'bg-purple-100 text-purple-800'
    }
    
    const color = colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800'
    const label = frequency ? frequency.charAt(0) + frequency.slice(1).toLowerCase() : 'Unknown'
    
    return (
      <Badge variant="outline" className={`text-xs ${color}`}>
        {label}
      </Badge>
    )
  }

  const toggleRowExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId)
    } else {
      newExpanded.add(clientId)
    }
    setExpandedRows(newExpanded)
  }

  const handleAddUpdate = (client: VATClient) => {
    setSelectedClient(client)
    setSelectedStage('')
    setSelectedAssignee(client.vatAssignedUser?.id || '')
    setUpdateComments('')
    setUpdateModalOpen(true)
  }

  const handleSubmitUpdate = async () => {
    if (!selectedClient || (!selectedStage && selectedAssignee === (selectedClient?.vatAssignedUser?.id || ''))) {
      showToast.error('Please select a stage to update or assign a user')
      return
    }

    setUpdating(true)
    try {
      // Handle assignment if assignee changed
      if (selectedAssignee !== (selectedClient.vatAssignedUser?.id || '')) {
        const assignResponse = await fetch(`/api/clients/${selectedClient.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: selectedAssignee || null,
            assignmentType: 'vat' 
          })
        })

        if (!assignResponse.ok) {
          throw new Error('Failed to assign user')
        }
      }

      // Handle workflow stage update if stage selected
      if (selectedStage && selectedClient.currentVATQuarter) {
        const workflowResponse = await fetch(`/api/vat-quarters/${selectedClient.currentVATQuarter.id}/workflow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stage: selectedStage,
            comments: updateComments,
            userId: session?.user?.id
          })
        })

        if (!workflowResponse.ok) {
          throw new Error('Failed to update workflow stage')
        }
      }

      showToast.success('Update completed successfully')
      setUpdateModalOpen(false)
      
      // Refresh data
      hasFetchedRef.current = false
      fetchVATClients()
      
    } catch (error) {
      console.error('Error updating:', error)
      showToast.error('Failed to update. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleQuickAssign = async (clientId: string, userId: string | null) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: userId,
          assignmentType: 'vat'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to assign user')
      }

      showToast.success('Assignment updated successfully')
      
      // Refresh data
      hasFetchedRef.current = false
      fetchVATClients()
      
    } catch (error) {
      console.error('Error assigning user:', error)
      showToast.error('Failed to assign user. Please try again.')
    }
  }

  const renderWorkflowTimeline = (client: VATClient) => {
    const quarter = client.currentVATQuarter
    if (!quarter) return null

    const milestones = [
      { 
        stage: 'CHASE_STARTED', 
        date: quarter.chaseStartedDate, 
        user: quarter.chaseStartedByUserName,
        label: 'Chase Started'
      },
      { 
        stage: 'PAPERWORK_RECEIVED', 
        date: quarter.paperworkReceivedDate, 
        user: quarter.paperworkReceivedByUserName,
        label: 'Paperwork Received'
      },
      { 
        stage: 'WORK_STARTED', 
        date: quarter.workStartedDate, 
        user: quarter.workStartedByUserName,
        label: 'Work Started'
      },
      { 
        stage: 'WORK_FINISHED', 
        date: quarter.workFinishedDate, 
        user: quarter.workFinishedByUserName,
        label: 'Work Finished'
      },
      { 
        stage: 'SENT_TO_CLIENT', 
        date: quarter.sentToClientDate, 
        user: quarter.sentToClientByUserName,
        label: 'Sent to Client'
      },
      { 
        stage: 'CLIENT_APPROVED', 
        date: quarter.clientApprovedDate, 
        user: quarter.clientApprovedByUserName,
        label: 'Client Approved'
      },
      { 
        stage: 'FILED_TO_HMRC', 
        date: quarter.filedToHMRCDate, 
        user: quarter.filedToHMRCByUserName,
        label: 'Filed to HMRC'
      }
    ]

    return (
      <div className="py-4 px-6 bg-gray-50 border-t">
        <h4 className="text-sm font-medium text-gray-900 mb-4">
          Workflow Timeline - {quarter.quarterPeriod}
        </h4>
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200"></div>
          
          {/* Timeline Items */}
          <div className="flex justify-between items-start">
            {milestones.map((milestone, index) => {
              const isCompleted = !!milestone.date
              const stageInfo = WORKFLOW_STAGES.find(s => s.key === milestone.stage)
              
              return (
                <div key={milestone.stage} className="flex flex-col items-center text-center min-w-0 flex-1">
                  {/* Timeline Node */}
                  <div className={`
                    relative z-10 w-12 h-12 rounded-full border-2 flex items-center justify-center
                    ${isCompleted 
                      ? 'bg-green-100 border-green-500 text-green-700' 
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                    }
                  `}>
                    {stageInfo?.icon || <Clock className="h-4 w-4" />}
                  </div>
                  
                  {/* Stage Label */}
                  <div className="mt-2 px-2">
                    <p className="text-xs font-medium text-gray-900 leading-tight">
                      {milestone.label}
                    </p>
                    {isCompleted ? (
                      <div className="mt-1">
                        <p className="text-xs text-green-600 font-medium">
                          {formatDate(milestone.date)}
                        </p>
                        {milestone.user && (
                          <p className="text-xs text-gray-500">
                            by {milestone.user}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">Pending</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderMonthContent = (monthNumber: number) => {
    const monthClients = getClientsForMonth(monthNumber)
    
    if (monthClients.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No VAT clients have filing due in this month</p>
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16"></TableHead>
            <TableHead className="w-24">Client Code</TableHead>
            <TableHead className="w-64">Company Name</TableHead>
            <TableHead className="w-24">Frequency</TableHead>
            <TableHead className="w-32">Quarter End</TableHead>
            <TableHead className="w-32">Filing Month</TableHead>
            <TableHead className="w-40">Assigned To</TableHead>
            <TableHead className="w-32">Add Update</TableHead>
            <TableHead className="w-16">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthClients.map((client) => (
            <>
              {/* Main Row */}
              <TableRow key={client.id} className="hover:bg-muted/50">
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => toggleRowExpansion(client.id)}
                  >
                    {expandedRows.has(client.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {client.clientCode}
                </TableCell>
                <TableCell className="font-medium">
                  {client.companyName}
                </TableCell>
                <TableCell>
                  {getFrequencyBadge(client.vatReturnsFrequency)}
                </TableCell>
                <TableCell>
                  {formatDate(client.currentVATQuarter?.quarterEndDate)}
                </TableCell>
                <TableCell>
                  {getFilingMonth(client)}
                </TableCell>
                <TableCell>
                  {(session?.user?.role === 'MANAGER' || session?.user?.role === 'PARTNER') ? (
                    <Select
                      value={client.vatAssignedUser?.id || 'unassigned'}
                      onValueChange={(value) => handleQuickAssign(client.id, value === 'unassigned' ? null : value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {client.vatAssignedUser?.name || 'Unassigned'}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddUpdate(client)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    Update
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => toggleRowExpansion(client.id)}
                  >
                    {expandedRows.has(client.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
              
              {/* Expanded Row - Workflow Timeline */}
              {expandedRows.has(client.id) && (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    {renderWorkflowTimeline(client)}
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="content-sections">
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading VAT deadlines...
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="content-sections">
          {/* Prominent Current Month Display */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">VAT Deadlines - {currentMonthName}</h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span className="text-blue-100">Current Month</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      {currentMonthClients.length} clients filing this month
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    hasFetchedRef.current = false
                    fetchVATClients()
                  }}
                  disabled={loading}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Monthly Tabs */}
          <Card>
            <CardContent className="p-0">
              <Tabs value={activeMonth} onValueChange={setActiveMonth} className="w-full">
                <div className="border-b px-6 py-4">
                  <TabsList className="grid grid-cols-6 lg:grid-cols-12 gap-1 h-auto p-1">
                    {MONTHS.map((month) => {
                      const monthClients = getClientsForMonth(month.number)
                      return (
                        <TabsTrigger
                          key={month.key}
                          value={month.key}
                          className="flex flex-col items-center gap-1 py-2 px-3 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <span className="font-medium">{month.short}</span>
                          <Badge 
                            variant="secondary" 
                            className="text-xs px-1.5 py-0.5 h-auto min-w-[1.5rem] justify-center"
                          >
                            {monthClients.length}
                          </Badge>
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>
                </div>

                {MONTHS.map((month) => (
                  <TabsContent key={month.key} value={month.key} className="mt-0">
                    {renderMonthContent(month.number)}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Update Modal */}
      <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update VAT Workflow</DialogTitle>
            <DialogDescription>
              Update workflow stage and assignment for {selectedClient?.companyName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Assignment Section - Only for Managers/Partners */}
            {(session?.user?.role === 'MANAGER' || session?.user?.role === 'PARTNER') && (
              <div>
                <Label htmlFor="assignee">Assign To</Label>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {user.name} ({user.role})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="stage">Workflow Stage (Optional)</Label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage to update" />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_STAGES.map((stage) => (
                    <SelectItem key={stage.key} value={stage.key}>
                      <div className="flex items-center gap-2">
                        {stage.icon}
                        {stage.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="updatedBy">Updated By</Label>
              <Input 
                id="updatedBy" 
                value={session?.user?.name || ''} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                placeholder="Add comments about this update (visible to everyone)"
                value={updateComments}
                onChange={(e) => setUpdateComments(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setUpdateModalOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitUpdate}
              disabled={updating || (!selectedStage && selectedAssignee === (selectedClient?.vatAssignedUser?.id || ''))}
            >
              {updating ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 