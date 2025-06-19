'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Building,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  PoundSterling,
  TrendingUp,
  Receipt
} from 'lucide-react'

interface CTFilingHistoryProps {
  clientId: string
  clientCode: string
  companyName: string
  companyNumber: string
  yearEndDate: string
  corporationTaxDue: string
}

export function CTFilingHistory({
  clientId,
  clientCode,
  companyName,
  companyNumber,
  yearEndDate,
  corporationTaxDue
}: CTFilingHistoryProps) {
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

  // Calculate CT deadline status
  const getCTDeadlineStatus = () => {
    if (!corporationTaxDue) return null
    
    const today = new Date()
    const ctDeadline = new Date(corporationTaxDue)
    const daysLeft = Math.ceil((ctDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      daysLeft,
      isOverdue: daysLeft < 0,
      isDueSoon: daysLeft >= 0 && daysLeft <= 30
    }
  }

  const ctStatus = getCTDeadlineStatus()

  return (
    <div className="space-y-6">
      {/* Current CT Period Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accounting Period End</p>
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
                <p className="text-sm text-muted-foreground">CT600 Due Date</p>
                <p className="text-lg font-bold">{formatDate(corporationTaxDue)}</p>
                {ctStatus && (
                  <p className={`text-xs ${
                    ctStatus.isOverdue ? 'text-red-600' : 
                    ctStatus.isDueSoon ? 'text-amber-600' : 
                    'text-green-600'
                  }`}>
                    {ctStatus.isOverdue 
                      ? `${Math.abs(ctStatus.daysLeft)} days overdue`
                      : `${ctStatus.daysLeft} days remaining`
                    }
                  </p>
                )}
              </div>
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payment Due</p>
                <p className="text-lg font-bold">
                  {yearEndDate 
                    ? formatDate(new Date(new Date(yearEndDate).setMonth(new Date(yearEndDate).getMonth() + 9)).toISOString())
                    : '-'
                  }
                </p>
                <p className="text-xs text-muted-foreground">9 months after year end</p>
              </div>
              <PoundSterling className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Important CT Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Corporation Tax Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Key Deadlines</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CT600 return: 12 months after accounting period end</li>
                <li>• Tax payment: 9 months and 1 day after accounting period end</li>
                <li>• iXBRL accounts: Must be filed with CT600</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Company Details</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• UTR: To be retrieved from HMRC</li>
                <li>• Company Number: {companyNumber}</li>
                <li>• Tax Rate: 19% (small companies)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for Historical CT Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Corporation Tax Filing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Corporation Tax Tracking Coming Soon</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Historical corporation tax filing data will be displayed here once the tracking system is implemented.
              This will include CT600 submissions, payment records, and HMRC confirmations.
            </p>
          </div>

          {/* Sample Data Structure Preview */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Expected Features:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• CT600 filing history and submission dates</li>
              <li>• Tax computation tracking</li>
              <li>• Payment records and confirmations</li>
              <li>• HMRC reference numbers</li>
              <li>• Loss carry forward/back tracking</li>
              <li>• R&D claims and other reliefs</li>
              <li>• Workflow stages (computation, review, filing, payment)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" disabled>
          <Download className="mr-2 h-4 w-4" />
          Export CT History
        </Button>
      </div>
    </div>
  )
} 