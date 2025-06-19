'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Calendar,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Send,
  UserCheck,
  Phone,
  Building,
  Download,
  RefreshCw
} from 'lucide-react'
import { showToast } from '@/lib/toast'
import { formatQuarterPeriodForDisplay, VAT_WORKFLOW_STAGE_NAMES, calculateTotalFilingDays, calculateStageDurations } from '@/lib/vat-workflow'

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
  }
  // Milestone dates
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
  // Workflow history
  workflowHistory?: {
    id: string
    fromStage?: string
    toStage: string
    stageChangedAt: string
    daysInPreviousStage?: number
    userName: string
    notes?: string
    user: {
      id: string
      name: string
      email: string
    }
  }[]
}

interface VATFilingHistoryProps {
  clientId: string
  clientCode: string
  companyName: string
  vatQuarterGroup: string
  vatReturnsFrequency: string
}

export function VATFilingHistory({
  clientId,
  clientCode,
  companyName,
  vatQuarterGroup,
  vatReturnsFrequency
}: VATFilingHistoryProps) {
  const [loading, setLoading] = useState(true)
  const [vatQuarters, setVatQuarters] = useState<VATQuarter[]>([])
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchVATQuarters()
  }, [clientId])

  const fetchVATQuarters = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}/vat-quarters`)
      const data = await response.json()

      if (data.success) {
        setVatQuarters(data.data.vatQuarters || [])
      } else {
        showToast.error('Failed to fetch VAT quarters')
      }
    } catch (error) {
      console.error('Error fetching VAT quarters:', error)
      showToast.error('Failed to fetch VAT quarters')
    } finally {
      setLoading(false)
    }
  }

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

  const getStatusBadge = (quarter: VATQuarter) => {
    const today = new Date()
    const filingDueDate = new Date(quarter.filingDueDate)

    if (quarter.isCompleted) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    }

    if (today > filingDueDate) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
    }

    const daysUntilDue = Math.ceil((filingDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilDue <= 7) {
      return <Badge className="bg-amber-100 text-amber-800">Due Soon</Badge>
    }

    return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
  }

  const getStageBadge = (stage: string) => {
    const stageName = VAT_WORKFLOW_STAGE_NAMES[stage as keyof typeof VAT_WORKFLOW_STAGE_NAMES] || stage
    
    const stageColors: { [key: string]: string } = {
      'CLIENT_BOOKKEEPING': 'bg-blue-100 text-blue-800',
      'WORK_IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
      'QUERIES_PENDING': 'bg-orange-100 text-orange-800',
      'REVIEW_PENDING_MANAGER': 'bg-purple-100 text-purple-800',
      'REVIEW_PENDING_PARTNER': 'bg-purple-100 text-purple-800',
      'EMAILED_TO_PARTNER': 'bg-indigo-100 text-indigo-800',
      'EMAILED_TO_CLIENT': 'bg-cyan-100 text-cyan-800',
      'CLIENT_APPROVED': 'bg-emerald-100 text-emerald-800',
      'FILED_TO_HMRC': 'bg-green-100 text-green-800'
    }
    
    const color = stageColors[stage] || 'bg-gray-100 text-gray-800'
    
    return (
      <Badge variant="outline" className={`text-xs ${color}`}>
        {stageName}
      </Badge>
    )
  }

  const toggleQuarterExpansion = (quarterId: string) => {
    const newExpanded = new Set(expandedQuarters)
    if (newExpanded.has(quarterId)) {
      newExpanded.delete(quarterId)
    } else {
      newExpanded.add(quarterId)
    }
    setExpandedQuarters(newExpanded)
  }

  const renderMilestones = (quarter: VATQuarter) => {
    const milestones = [
      { 
        id: 'CHASE_STARTED', 
        date: quarter.chaseStartedDate, 
        user: quarter.chaseStartedByUserName,
        label: 'Chase Started',
        icon: <Phone className="h-3 w-3" />
      },
      { 
        id: 'PAPERWORK_RECEIVED', 
        date: quarter.paperworkReceivedDate, 
        user: quarter.paperworkReceivedByUserName,
        label: 'Paperwork Received',
        icon: <FileText className="h-3 w-3" />
      },
      { 
        id: 'WORK_STARTED', 
        date: quarter.workStartedDate, 
        user: quarter.workStartedByUserName,
        label: 'Work Started',
        icon: <Clock className="h-3 w-3" />
      },
      { 
        id: 'WORK_FINISHED', 
        date: quarter.workFinishedDate, 
        user: quarter.workFinishedByUserName,
        label: 'Work Finished',
        icon: <CheckCircle className="h-3 w-3" />
      },
      { 
        id: 'SENT_TO_CLIENT', 
        date: quarter.sentToClientDate, 
        user: quarter.sentToClientByUserName,
        label: 'Sent to Client',
        icon: <Send className="h-3 w-3" />
      },
      { 
        id: 'CLIENT_APPROVED', 
        date: quarter.clientApprovedDate, 
        user: quarter.clientApprovedByUserName,
        label: 'Client Approved',
        icon: <UserCheck className="h-3 w-3" />
      },
      { 
        id: 'FILED_TO_HMRC', 
        date: quarter.filedToHMRCDate, 
        user: quarter.filedToHMRCByUserName,
        label: 'Filed to HMRC',
        icon: <Building className="h-3 w-3" />
      }
    ]

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {milestones.map((milestone) => {
          const isCompleted = !!milestone.date
          
          return (
            <div 
              key={milestone.id} 
              className={`p-3 rounded-lg border ${
                isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`p-1 rounded ${isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                  {milestone.icon}
                </div>
                <p className="text-xs font-medium text-gray-700">{milestone.label}</p>
              </div>
              {isCompleted ? (
                <div>
                  <p className="text-xs text-green-600 font-medium">
                    {formatDate(milestone.date)}
                  </p>
                  {milestone.user && (
                    <p className="text-xs text-gray-500">by {milestone.user}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Not completed</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Group quarters by year
  const quartersByYear = vatQuarters.reduce((acc, quarter) => {
    const year = new Date(quarter.quarterEndDate).getFullYear()
    if (!acc[year]) acc[year] = []
    acc[year].push(quarter)
    return acc
  }, {} as Record<number, VATQuarter[]>)

  const years = Object.keys(quartersByYear).sort((a, b) => Number(b) - Number(a))

  // Calculate statistics
  const totalQuarters = vatQuarters.length
  const completedQuarters = vatQuarters.filter(q => q.isCompleted).length
  const overdueQuarters = vatQuarters.filter(q => {
    const today = new Date()
    const filingDueDate = new Date(q.filingDueDate)
    return !q.isCompleted && today > filingDueDate
  }).length

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Quarters</p>
                <p className="text-2xl font-bold">{totalQuarters}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedQuarters}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueQuarters}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Frequency</p>
                <p className="text-lg font-bold">{vatReturnsFrequency}</p>
                <p className="text-xs text-muted-foreground">{vatQuarterGroup.replace(/_/g, '/')}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VAT Quarters by Year */}
      {vatQuarters.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">No VAT quarters found for this client</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {years.map(year => (
            <div key={year}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {year} VAT Returns
                <Badge variant="secondary" className="ml-2">
                  {quartersByYear[Number(year)]?.length || 0} quarters
                </Badge>
              </h3>
              
              <div className="space-y-3">
                {quartersByYear[Number(year)]?.map(quarter => (
                  <Card key={quarter.id} className="overflow-hidden">
                    <CardHeader 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleQuarterExpansion(quarter.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {expandedQuarters.has(quarter.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <CardTitle className="text-base">
                              {formatQuarterPeriodForDisplay(quarter.quarterPeriod)}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(quarter)}
                            {getStageBadge(quarter.currentStage)}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Filing due: {formatDate(quarter.filingDueDate)}
                        </div>
                      </div>
                    </CardHeader>

                    {expandedQuarters.has(quarter.id) && (
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {/* Quarter Details */}
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Quarter Start</p>
                              <p className="font-medium">{formatDate(quarter.quarterStartDate)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Quarter End</p>
                              <p className="font-medium">{formatDate(quarter.quarterEndDate)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Assigned To</p>
                              <p className="font-medium">
                                {quarter.assignedUser?.name || 'Unassigned'}
                              </p>
                            </div>
                          </div>

                          {/* Duration Tracking */}
                          <div className="border-t pt-4">
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Duration Tracking
                            </h4>
                            {(() => {
                              const totalDays = calculateTotalFilingDays(quarter)
                              const stageDurations = calculateStageDurations(quarter, quarter.workflowHistory)
                              
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="text-center p-3 bg-blue-50 rounded-lg border">
                                    <div className="text-lg font-bold text-blue-600">
                                      {totalDays !== null ? `${totalDays}` : '—'}
                                    </div>
                                    <div className="text-xs text-blue-700">
                                      {quarter.isCompleted ? 'Days to Complete' : 'Days in Progress'}
                                    </div>
                                  </div>
                                  
                                  <div className="text-center p-3 bg-green-50 rounded-lg border">
                                    <div className="text-lg font-bold text-green-600">
                                      {quarter.workflowHistory?.length || 0}
                                    </div>
                                    <div className="text-xs text-green-700">
                                      Stage Changes
                                    </div>
                                  </div>
                                  
                                  <div className="text-center p-3 bg-amber-50 rounded-lg border">
                                    <div className="text-lg font-bold text-amber-600">
                                      {quarter.workflowHistory?.[0]?.daysInPreviousStage !== undefined 
                                        ? quarter.workflowHistory[0].daysInPreviousStage 
                                        : '—'}
                                    </div>
                                    <div className="text-xs text-amber-700">
                                      Days in Current Stage
                                    </div>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>

                          {/* Milestones */}
                          <div className="border-t pt-4">
                            <h4 className="text-sm font-medium mb-3">Workflow Milestones</h4>
                            {renderMilestones(quarter)}
                          </div>

                          {/* Workflow History */}
                          {quarter.workflowHistory && quarter.workflowHistory.length > 0 && (
                            <div className="border-t pt-4">
                              <h4 className="text-sm font-medium mb-3">Workflow History</h4>
                              <div className="space-y-2">
                                {quarter.workflowHistory.map((history, index) => (
                                  <div key={history.id} className="flex items-start gap-3 text-sm">
                                    <div className="mt-0.5">
                                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                                      {index < quarter.workflowHistory!.length - 1 && (
                                        <div className="w-0.5 h-8 bg-gray-200 ml-[3px] mt-1" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium">
                                        {VAT_WORKFLOW_STAGE_NAMES[history.toStage as keyof typeof VAT_WORKFLOW_STAGE_NAMES] || history.toStage}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatDate(history.stageChangedAt)} by {history.userName}
                                        {history.daysInPreviousStage && ` • ${history.daysInPreviousStage} days in previous stage`}
                                      </p>
                                      {history.notes && (
                                        <p className="text-xs text-muted-foreground mt-1">{history.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export VAT History
        </Button>
      </div>
    </div>
  )
} 