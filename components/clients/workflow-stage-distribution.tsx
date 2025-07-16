'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  BarChart3, 
  Calendar, 
  Clock, 
  FileText,
  Send,
  UserCheck,
  Building,
  CheckCircle,
  Phone,
  User
} from 'lucide-react'

interface VATQuarter {
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

interface VATClient {
  id: string
  clientCode: string
  companyName: string
  contactEmail?: string
  vatReturnsFrequency?: string
  vatQuarterGroup?: string
  createdAt: string // Client creation date to determine if old quarters are applicable
  
  // Current VAT quarter workflow info (for backward compatibility)
  currentVATQuarter?: VATQuarter
  
  // All VAT quarters for this client
  vatQuartersWorkflow?: VATQuarter[]
}

interface WorkflowStage {
  key: string
  label: string
  icon: React.ReactNode
  color: string
}

interface WorkflowStageDistributionProps {
  clients: VATClient[]
  monthNumber: number
  monthName: string
  getQuarterForMonth: (client: VATClient, monthNumber: number) => VATQuarter | null
}

// All VAT workflow stages for display purposes
const ALL_VAT_WORKFLOW_STAGES: WorkflowStage[] = [
  { key: 'WAITING_FOR_QUARTER_END', label: 'Waiting for quarter end', icon: <Calendar className="h-4 w-4" />, color: 'bg-gray-100 text-gray-800' },
  { key: 'PAPERWORK_PENDING_CHASE', label: 'Pending to chase', icon: <Clock className="h-4 w-4" />, color: 'bg-amber-100 text-amber-800' },
  { key: 'PAPERWORK_CHASED', label: 'Paperwork chased', icon: <Phone className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'PAPERWORK_RECEIVED', label: 'Paperwork received', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' },
  { key: 'WORK_IN_PROGRESS', label: 'Work in progress', icon: <Clock className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'QUERIES_PENDING', label: 'Queries pending', icon: <Clock className="h-4 w-4" />, color: 'bg-yellow-100 text-yellow-800' },
  { key: 'REVIEW_PENDING_MANAGER', label: 'Review pending by manager', icon: <UserCheck className="h-4 w-4" />, color: 'bg-orange-100 text-orange-800' },
  { key: 'REVIEWED_BY_MANAGER', label: 'Reviewed by manager', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'REVIEW_PENDING_PARTNER', label: 'Review pending by partner', icon: <UserCheck className="h-4 w-4" />, color: 'bg-purple-100 text-purple-800' },
  { key: 'REVIEWED_BY_PARTNER', label: 'Reviewed by partner', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800' },
  { key: 'EMAILED_TO_PARTNER', label: 'Emailed to partner', icon: <Send className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-800' },
  { key: 'EMAILED_TO_CLIENT', label: 'Emailed to client', icon: <Send className="h-4 w-4" />, color: 'bg-cyan-100 text-cyan-800' },
  { key: 'CLIENT_APPROVED', label: 'Client approved', icon: <CheckCircle className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-800' },
  { key: 'FILED_TO_HMRC', label: 'Filed to HMRC', icon: <Building className="h-4 w-4" />, color: 'bg-green-100 text-green-800' },
  { key: 'CLIENT_BOOKKEEPING', label: 'Client to do bookkeeping', icon: <User className="h-4 w-4" />, color: 'bg-blue-100 text-blue-800' }
]

export function WorkflowStageDistribution({ 
  clients, 
  monthNumber, 
  monthName, 
  getQuarterForMonth 
}: WorkflowStageDistributionProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Calculate stage distribution for the current month
  const stageDistribution = useMemo(() => {
    const distribution: { [key: string]: { count: number; clients: Array<{ client: VATClient; quarter: VATQuarter }> } } = {}
    
    // Initialize all stages with 0 count
    ALL_VAT_WORKFLOW_STAGES.forEach(stage => {
      distribution[stage.key] = { count: 0, clients: [] }
    })
    
    // Add special categories
    distribution['NOT_STARTED'] = { count: 0, clients: [] }
    distribution['COMPLETED'] = { count: 0, clients: [] }
    distribution['UNASSIGNED'] = { count: 0, clients: [] }

    // Count clients in each stage for the current month
    clients.forEach(client => {
      const quarter = getQuarterForMonth(client, monthNumber)
      
      if (quarter) {
        const clientQuarterData = { client, quarter }
        
        // Check if completed
        if (quarter.isCompleted || quarter.currentStage === 'FILED_TO_HMRC') {
          distribution['COMPLETED']!.count++
          distribution['COMPLETED']!.clients.push(clientQuarterData)
        }
        // Check if unassigned
        else if (!quarter.assignedUser) {
          distribution['UNASSIGNED']!.count++
          distribution['UNASSIGNED']!.clients.push(clientQuarterData)
        }
        // Check specific stage
        else if (quarter.currentStage && distribution[quarter.currentStage]) {
          distribution[quarter.currentStage]!.count++
          distribution[quarter.currentStage]!.clients.push(clientQuarterData)
        }
        // Not started (has assignment but no stage set)
        else {
          distribution['NOT_STARTED']!.count++
          distribution['NOT_STARTED']!.clients.push(clientQuarterData)
        }
      }
    })

    return distribution
  }, [clients, monthNumber, getQuarterForMonth])

  // Get stages with counts > 0, sorted by count
  const activeStages = useMemo(() => {
    const stages = [
      // Special categories first
      ...(stageDistribution['UNASSIGNED']!.count > 0 ? [{ 
        key: 'UNASSIGNED', 
        label: 'Unassigned', 
        icon: <User className="h-4 w-4" />, 
        color: 'bg-red-100 text-red-800' 
      }] : []),
      ...(stageDistribution['NOT_STARTED']!.count > 0 ? [{ 
        key: 'NOT_STARTED', 
        label: 'Not Started', 
        icon: <Clock className="h-4 w-4" />, 
        color: 'bg-gray-100 text-gray-800' 
      }] : []),
      // Regular workflow stages
      ...ALL_VAT_WORKFLOW_STAGES.filter(stage => stageDistribution[stage.key]!.count > 0),
      // Completed last
      ...(stageDistribution['COMPLETED']!.count > 0 ? [{ 
        key: 'COMPLETED', 
        label: 'Completed', 
        icon: <CheckCircle className="h-4 w-4" />, 
        color: 'bg-green-100 text-green-800' 
      }] : [])
    ]

    return stages.sort((a, b) => stageDistribution[b.key]!.count - stageDistribution[a.key]!.count)
  }, [stageDistribution])

  const totalClients = clients.length
  const completedCount = stageDistribution['COMPLETED']!.count
  const unassignedCount = stageDistribution['UNASSIGNED']!.count
  const completionPercentage = totalClients > 0 ? Math.round((completedCount / totalClients) * 100) : 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Stage Distribution
          <Badge variant="secondary" className="ml-1">
            {activeStages.length}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Workflow Stage Distribution - {monthName}
          </DialogTitle>
          <DialogDescription>
            Overview of how many clients are in each workflow stage for {monthName}
          </DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalClients}</div>
                <div className="text-sm text-muted-foreground">Total Clients</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{unassignedCount}</div>
                <div className="text-sm text-muted-foreground">Unassigned</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{completionPercentage}%</div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stage Distribution Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Stage Breakdown</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead className="text-center">Count</TableHead>
                <TableHead className="text-center">Percentage</TableHead>
                <TableHead>Clients</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeStages.map((stage) => {
                const stageData = stageDistribution[stage.key]!
                const percentage = totalClients > 0 ? Math.round((stageData.count / totalClients) * 100) : 0
                
                return (
                  <TableRow key={stage.key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {stage.icon}
                        <span className="font-medium">{stage.label}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={stage.color}>
                        {stageData.count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{percentage}%</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {stageData.clients.slice(0, 3).map(({ client }) => (
                          <Badge key={client.id} variant="secondary" className="text-xs">
                            {client.clientCode}
                          </Badge>
                        ))}
                        {stageData.clients.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{stageData.clients.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{completedCount}/{totalClients} completed ({completionPercentage}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 