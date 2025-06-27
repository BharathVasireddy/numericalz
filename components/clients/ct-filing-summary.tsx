'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Receipt,
  PoundSterling,
  FileText,
  TrendingUp,
  Eye
} from 'lucide-react'

interface CTFilingSummaryProps {
  client: {
    id: string
    companyName: string
    companyNumber?: string
    nextYearEnd?: string | null
    nextCorporationTaxDue?: string | null
    corporationTaxStatus?: string | null
    corporationTaxPeriodEnd?: string | null
    corporationTaxPeriodStart?: string | null
    ctDueSource?: string | null
    lastCTStatusUpdate?: string | null
    ctStatusUpdatedBy?: string | null
    manualCTDueOverride?: string | null
  }
  onViewFullHistory?: () => void
}

export function CTFilingSummary({ client, onViewFullHistory }: CTFilingSummaryProps) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not set'
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return 'Not set'
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getDaysUntilDue = (dateString?: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    const diffTime = date.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const formatDaysUntilDue = (dateString?: string | null) => {
    const days = getDaysUntilDue(dateString)
    if (days === null) return ''
    if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}`
    if (days === 0) return 'Due today'
    return `Due in ${days} day${days === 1 ? '' : 's'}`
  }

  const getStatusBadge = (status?: string | null) => {
    switch (status?.toUpperCase()) {
      case 'FILED':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Filed</Badge>
      case 'PENDING':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
      case 'OVERDUE':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">Overdue</Badge>
      case 'NOT_REQUIRED':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">Not Required</Badge>
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">Unknown</Badge>
    }
  }

  const calculatePaymentDue = (yearEndDate?: string | null) => {
    if (!yearEndDate) return null
    try {
      const yearEnd = new Date(yearEndDate)
      const paymentDue = new Date(yearEnd)
      paymentDue.setMonth(paymentDue.getMonth() + 9)
      paymentDue.setDate(paymentDue.getDate() + 1) // 9 months and 1 day
      return paymentDue.toISOString()
    } catch {
      return null
    }
  }

  const days = getDaysUntilDue(client.nextCorporationTaxDue)
  const isOverdue = days !== null && days < 0
  const isDueSoon = days !== null && days >= 0 && days <= 30

  return (
    <Card className="shadow-professional">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              Corporation Tax Status
            </CardTitle>
            <CardDescription>Current CT filing status and key dates</CardDescription>
          </div>
          {onViewFullHistory && (
            <Button variant="outline" size="sm" onClick={onViewFullHistory}>
              <Eye className="mr-2 h-4 w-4" />
              View History
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-background rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Filing Status</span>
              {getStatusBadge(client.corporationTaxStatus)}
            </div>
            <div className="text-xs text-muted-foreground">
              {client.lastCTStatusUpdate && (
                <p>Last updated: {formatDateTime(client.lastCTStatusUpdate)}</p>
              )}
              {client.ctStatusUpdatedBy && (
                <p>Updated by: {client.ctStatusUpdatedBy}</p>
              )}
            </div>
          </div>

          <div className="p-3 bg-background rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Due Date Source</span>
              <Badge variant="outline" className="text-xs">
                {client.ctDueSource === 'MANUAL' ? 'Manual' : 'Auto'}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {client.manualCTDueOverride ? (
                <p>Manual override: {formatDate(client.manualCTDueOverride)}</p>
              ) : (
                <p>Calculated from year end date</p>
              )}
            </div>
          </div>
        </div>

        {/* Key Dates */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Key Dates</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Accounting Period */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Accounting Period</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {client.corporationTaxPeriodStart && client.corporationTaxPeriodEnd ? (
                  <p>{formatDate(client.corporationTaxPeriodStart)} to {formatDate(client.corporationTaxPeriodEnd)}</p>
                ) : client.nextYearEnd ? (
                  <p>Ends: {formatDate(client.nextYearEnd)}</p>
                ) : (
                  <p>Not set</p>
                )}
              </div>
            </div>

            {/* CT600 Due */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">CT600 Due</span>
              </div>
              <div className="text-xs">
                <p className="font-medium">{formatDate(client.nextCorporationTaxDue)}</p>
                {client.nextCorporationTaxDue && (
                  <p className={`mt-1 ${
                    isOverdue ? 'text-red-600' :
                    isDueSoon ? 'text-amber-600' :
                    'text-muted-foreground'
                  }`}>
                    {formatDaysUntilDue(client.nextCorporationTaxDue)}
                  </p>
                )}
              </div>
            </div>

            {/* Payment Due */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <PoundSterling className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Payment Due</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {(() => {
                  const paymentDue = calculatePaymentDue(client.nextYearEnd)
                  return paymentDue ? (
                    <p>{formatDate(paymentDue)}</p>
                  ) : (
                    <p>Not calculated</p>
                  )
                })()}
                <p className="mt-1">9 months + 1 day after year end</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent CT Activity */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Recent CT Activity</h4>
          
          <div className="space-y-2">
            {client.lastCTStatusUpdate ? (
              <div className="flex items-start gap-3 p-2 rounded-sm border border-border">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Status Updated</p>
                  <p className="text-xs text-muted-foreground">
                    Status changed to {client.corporationTaxStatus} • {formatDateTime(client.lastCTStatusUpdate)}
                    {client.ctStatusUpdatedBy && ` • by ${client.ctStatusUpdatedBy}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent CT activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Information Note */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Corporation Tax Information</p>
              <ul className="space-y-1">
                <li>• CT600 return due 12 months after accounting period end</li>
                <li>• Tax payment due 9 months and 1 day after accounting period end</li>
                <li>• iXBRL accounts must be filed with CT600</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 