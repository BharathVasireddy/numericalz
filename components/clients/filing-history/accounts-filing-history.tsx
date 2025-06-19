'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Building,
  TrendingUp
} from 'lucide-react'

interface AccountsFilingHistoryProps {
  clientId: string
  clientCode: string
  companyName: string
  companyNumber: string
  yearEndDate: string
  accountsFilingDeadline: string
  confirmationStatementDeadline: string
}

export function AccountsFilingHistory({
  clientId,
  clientCode,
  companyName,
  companyNumber,
  yearEndDate,
  accountsFilingDeadline,
  confirmationStatementDeadline
}: AccountsFilingHistoryProps) {
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

  // Calculate next deadlines
  const getNextDeadlines = () => {
    const today = new Date()
    const accountsDeadline = accountsFilingDeadline ? new Date(accountsFilingDeadline) : null
    const csDeadline = confirmationStatementDeadline ? new Date(confirmationStatementDeadline) : null

    const accountsDaysLeft = accountsDeadline 
      ? Math.ceil((accountsDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const csDaysLeft = csDeadline
      ? Math.ceil((csDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return { accountsDaysLeft, csDaysLeft }
  }

  const { accountsDaysLeft, csDaysLeft } = getNextDeadlines()

  return (
    <div className="space-y-6">
      {/* Current Filing Period Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Year End</p>
                <p className="text-lg font-bold">{formatDate(yearEndDate)}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accounts Due</p>
                <p className="text-lg font-bold">{formatDate(accountsFilingDeadline)}</p>
                {accountsDaysLeft !== null && (
                  <p className={`text-xs ${
                    accountsDaysLeft < 0 ? 'text-red-600' : 
                    accountsDaysLeft <= 30 ? 'text-amber-600' : 
                    'text-green-600'
                  }`}>
                    {accountsDaysLeft < 0 
                      ? `${Math.abs(accountsDaysLeft)} days overdue`
                      : `${accountsDaysLeft} days remaining`
                    }
                  </p>
                )}
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmation Statement</p>
                <p className="text-lg font-bold">{formatDate(confirmationStatementDeadline)}</p>
                {csDaysLeft !== null && (
                  <p className={`text-xs ${
                    csDaysLeft < 0 ? 'text-red-600' : 
                    csDaysLeft <= 30 ? 'text-amber-600' : 
                    'text-green-600'
                  }`}>
                    {csDaysLeft < 0 
                      ? `${Math.abs(csDaysLeft)} days overdue`
                      : `${csDaysLeft} days remaining`
                    }
                  </p>
                )}
              </div>
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for Historical Filing Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Annual Accounts Filing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Annual Accounts Tracking Coming Soon</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Historical annual accounts filing data will be displayed here once the tracking system is implemented.
              This will include filing dates, submission status, and Companies House acceptance confirmations.
            </p>
          </div>

          {/* Sample Data Structure Preview */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Expected Features:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Filing history for each accounting period</li>
              <li>• Submission and acceptance dates</li>
              <li>• Document upload tracking</li>
              <li>• Companies House confirmation numbers</li>
              <li>• Workflow stages (preparation, review, filing)</li>
              <li>• Team member assignments and progress</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled>
          <Download className="mr-2 h-4 w-4" />
          Export Accounts History
        </Button>
      </div>
    </div>
  )
} 