'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChevronDown, 
  ChevronUp,
  ChevronRight,
  Building2,
  FileText,
  Receipt,
  Users,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Eye,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface WorkloadAssignment {
  id: string
  clientCode: string
  companyName: string
  companyType: string
  workflowId: string | null
  workflowType: string
  currentStage: string
  dueDate: string | null
  endDate: string | null
  isCompleted: boolean
  hasWorkflow: boolean
}

interface WorkloadData {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  vatClients: WorkloadAssignment[]
  ltdCompanies: WorkloadAssignment[]
  nonLtdCompanies: WorkloadAssignment[]
  contractors: WorkloadAssignment[]
  subContractors: WorkloadAssignment[]
}

interface IndividualWorkloadViewProps {
  workloadData: WorkloadData
}

export function IndividualWorkloadView({ workloadData }: IndividualWorkloadViewProps) {
  const router = useRouter()
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set(['vatClients']))
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  const toggleAccordion = (accordionKey: string) => {
    const newExpanded = new Set(expandedAccordions)
    if (newExpanded.has(accordionKey)) {
      newExpanded.delete(accordionKey)
    } else {
      newExpanded.add(accordionKey)
    }
    setExpandedAccordions(newExpanded)
  }

  const getWorkflowStatus = (stage: string, hasWorkflow: boolean) => {
    if (!hasWorkflow) {
      return { 
        label: 'Not Started', 
        icon: <Clock className="h-4 w-4" />, 
        color: 'bg-gray-100 text-gray-800' 
      }
    }

    if (stage === 'FILED_TO_HMRC' || stage === 'COMPLETED') {
      return { 
        label: 'Completed', 
        icon: <CheckCircle className="h-4 w-4" />, 
        color: 'bg-green-100 text-green-800' 
      }
    }

    // Map common workflow stages to readable labels
    const stageMap: Record<string, string> = {
      'NOT_STARTED': 'Not Started',
      'WAITING_FOR_YEAR_END': 'Waiting for Year End',
      'PAPERWORK_PENDING_CHASE': 'Pending to Chase',
      'PAPERWORK_CHASED': 'Paperwork Chased',
      'PAPERWORK_RECEIVED': 'Paperwork Received',
      'WORK_IN_PROGRESS': 'Work in Progress',
      'DISCUSS_WITH_MANAGER': 'Discuss with Manager',
      'REVIEWED_BY_MANAGER': 'Reviewed by Manager',
      'REVIEW_BY_PARTNER': 'Review by Partner',
      'REVIEWED_BY_PARTNER': 'Reviewed by Partner',
      'REVIEW_DONE_HELLO_SIGN': 'Review Done - Hello Sign',
      'SENT_TO_CLIENT_HELLO_SIGN': 'Sent to Client',
      'APPROVED_BY_CLIENT': 'Approved by Client',
      'SUBMISSION_APPROVED_PARTNER': 'Submission Approved',
      'FILED_TO_COMPANIES_HOUSE': 'Filed to Companies House',
      'FILED_TO_HMRC': 'Filed to HMRC'
    }

    const label = stageMap[stage] || stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
    
    return { 
      label, 
      icon: <Clock className="h-4 w-4" />, 
      color: 'bg-blue-100 text-blue-800' 
    }
  }

  const getDaysUntilDue = (dueDateString: string | null) => {
    if (!dueDateString) return null
    
    const dueDate = new Date(dueDateString)
    const today = new Date()
    const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff < 0) {
      return { label: `Overdue by ${Math.abs(daysDiff)} days`, color: 'text-red-600' }
    } else if (daysDiff === 0) {
      return { label: 'Due today', color: 'text-red-600' }
    } else if (daysDiff <= 7) {
      return { label: `Due in ${daysDiff} days`, color: 'text-orange-600' }
    } else if (daysDiff <= 30) {
      return { label: `Due in ${daysDiff} days`, color: 'text-yellow-600' }
    } else {
      return { label: `Due in ${daysDiff} days`, color: 'text-green-600' }
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return '—'
    }
  }

  const handleViewClient = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`)
  }

  const handleViewWorkflow = (workflowId: string, workflowType: string) => {
    // Navigate to appropriate workflow page based on type
    if (workflowType === 'VAT_QUARTER') {
      router.push(`/dashboard/clients/vat-quarters/${workflowId}`)
    } else if (workflowType === 'LTD_WORKFLOW') {
      router.push(`/dashboard/clients/ltd-companies`)
    } else if (workflowType === 'NON_LTD_WORKFLOW') {
      router.push(`/dashboard/clients/non-ltd-companies`)
    }
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortData = (data: WorkloadAssignment[]) => {
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof WorkloadAssignment]
      let bValue: any = b[sortConfig.key as keyof WorkloadAssignment]

      // Handle null values
      if (aValue === null) aValue = ''
      if (bValue === null) bValue = ''

      // Handle date sorting
      if (sortConfig.key === 'dueDate' || sortConfig.key === 'endDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      }

      // Handle boolean sorting (completed status)
      if (sortConfig.key === 'isCompleted') {
        aValue = aValue ? 1 : 0
        bValue = bValue ? 1 : 0
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
  }

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronDown className="h-3 w-3 opacity-50" />
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronDown className="h-3 w-3" /> : 
      <ChevronUp className="h-3 w-3" />
  }

  const renderAssignmentTable = (assignments: WorkloadAssignment[], category: string) => {
    if (assignments.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            {category === 'vatClients' && <Receipt className="h-8 w-8" />}
            {category === 'ltdCompanies' && <Building2 className="h-8 w-8" />}
            {category === 'nonLtdCompanies' && <FileText className="h-8 w-8" />}
            {category === 'contractors' && <Users className="h-8 w-8" />}
            {category === 'subContractors' && <User className="h-8 w-8" />}
          </div>
          <p>No {category.replace(/([A-Z])/g, ' $1').toLowerCase()} assignments</p>
        </div>
      )
    }

    const sortedAssignments = sortData(assignments)

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="w-20 cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('clientCode')}
            >
              <div className="flex items-center gap-1">
                Client Code
                {getSortIcon('clientCode')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('companyName')}
            >
              <div className="flex items-center gap-1">
                Company Name
                {getSortIcon('companyName')}
              </div>
            </TableHead>
            <TableHead 
              className="w-24 cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('dueDate')}
            >
              <div className="flex items-center gap-1">
                Due Date
                {getSortIcon('dueDate')}
              </div>
            </TableHead>
            <TableHead 
              className="w-32 cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('currentStage')}
            >
              <div className="flex items-center gap-1">
                Status
                {getSortIcon('currentStage')}
              </div>
            </TableHead>
            <TableHead className="w-16">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAssignments.map((assignment) => {
            const status = getWorkflowStatus(assignment.currentStage, assignment.hasWorkflow)
            const dueInfo = getDaysUntilDue(assignment.dueDate)
            
            return (
              <TableRow key={assignment.id} className={assignment.isCompleted ? 'opacity-60' : ''}>
                <TableCell className="font-mono text-sm">
                  {assignment.clientCode}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{assignment.companyName}</div>
                  <div className="text-xs text-muted-foreground">
                    {assignment.companyType}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">
                    {formatDate(assignment.dueDate)}
                  </div>
                  {dueInfo && (
                    <div className={`text-xs ${dueInfo.color}`}>
                      {dueInfo.label}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${status.color}`}>
                    <div className="flex items-center gap-1">
                      {status.icon}
                      <span className="max-w-[80px] truncate" title={status.label}>
                        {status.label}
                      </span>
                    </div>
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="action-trigger-button h-8 w-8 p-0">
                        <Settings className="action-trigger-icon h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={() => handleViewClient(assignment.id)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                        View Client
                      </DropdownMenuItem>
                      {assignment.hasWorkflow && assignment.workflowId && (
                        <DropdownMenuItem 
                          onClick={() => handleViewWorkflow(assignment.workflowId!, assignment.workflowType)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <FileText className="h-4 w-4" />
                          View Workflow
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  const accordionData = [
    {
      key: 'vatClients',
      title: 'VAT Clients',
      icon: <Receipt className="h-5 w-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      assignments: workloadData.vatClients,
      count: workloadData.vatClients.length
    },
    {
      key: 'ltdCompanies',
      title: 'Ltd Companies',
      icon: <Building2 className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      assignments: workloadData.ltdCompanies,
      count: workloadData.ltdCompanies.length
    },
    {
      key: 'nonLtdCompanies',
      title: 'Non-Ltd Companies',
      icon: <FileText className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      assignments: workloadData.nonLtdCompanies,
      count: workloadData.nonLtdCompanies.length
    },
    {
      key: 'contractors',
      title: 'Contractors',
      icon: <Users className="h-5 w-5" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      assignments: workloadData.contractors,
      count: workloadData.contractors.length
    },
    {
      key: 'subContractors',
      title: 'Sub-Contractors',
      icon: <User className="h-5 w-5" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      assignments: workloadData.subContractors,
      count: workloadData.subContractors.length
    }
  ]

  return (
    <div className="space-y-6">
      {/* User Summary Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {workloadData.user.role === 'PARTNER' && <User className="h-6 w-6 text-purple-600" />}
                {workloadData.user.role === 'MANAGER' && <User className="h-6 w-6 text-blue-600" />}
                {workloadData.user.role === 'STAFF' && <User className="h-6 w-6 text-gray-600" />}
                <div>
                  <h2 className="text-xl font-bold">{workloadData.user.name}</h2>
                  <p className="text-sm text-muted-foreground">{workloadData.user.email}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {workloadData.vatClients.length + 
                 workloadData.ltdCompanies.length + 
                 workloadData.nonLtdCompanies.length + 
                 workloadData.contractors.length + 
                 workloadData.subContractors.length}
              </div>
              <p className="text-sm text-muted-foreground">Total Assignments</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accordions */}
      <div className="space-y-4">
        {accordionData.map((accordion) => (
          <Card key={accordion.key} className="overflow-hidden">
            <CardHeader 
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${accordion.bgColor}`}
              onClick={() => toggleAccordion(accordion.key)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={accordion.color}>
                    {accordion.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{accordion.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {accordion.count} assignment{accordion.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {accordion.count}
                  </Badge>
                  {expandedAccordions.has(accordion.key) ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
            
            {expandedAccordions.has(accordion.key) && (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {renderAssignmentTable(accordion.assignments, accordion.key)}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
} 