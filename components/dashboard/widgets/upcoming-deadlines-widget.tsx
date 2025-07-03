'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Receipt, FileText } from 'lucide-react'

interface DeadlineBreakdown {
  vat: {
    days7: number
    days15: number
    days30: number
    days60: number
    days90: number
  }
  accounts: {
    days7: number
    days15: number
    days30: number
    days60: number
    days90: number
  }
}

export function UpcomingDeadlinesWidget() {
  const [deadlineBreakdown, setDeadlineBreakdown] = useState<DeadlineBreakdown | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDeadlines = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/widgets/upcoming-deadlines', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const result = await response.json()
      
      if (result.success) {
        setDeadlineBreakdown(result.data.deadlineBreakdown)
      } else {
        console.error('Failed to fetch deadline data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching deadline data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeadlines()
  }, [])

  if (loading) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Loading deadlines...</p>
          </div>
        </CardContent>
      </>
    )
  }

  if (!deadlineBreakdown) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load deadlines</p>
          </div>
        </CardContent>
      </>
    )
  }

  const timeRows = [
    { 
      key: 'days7', 
      label: 'Due in 7 days', 
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    { 
      key: 'days15', 
      label: 'Due in 15 days', 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    { 
      key: 'days30', 
      label: 'Due in 30 days', 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    { 
      key: 'days60', 
      label: 'Due in 60 days', 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    { 
      key: 'days90', 
      label: 'Due in 90 days', 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ]

  // Calculate totals
  const totals = timeRows.map(row => ({
    ...row,
    vatCount: deadlineBreakdown.vat[row.key as keyof typeof deadlineBreakdown.vat],
    accountsCount: deadlineBreakdown.accounts[row.key as keyof typeof deadlineBreakdown.accounts],
    total: deadlineBreakdown.vat[row.key as keyof typeof deadlineBreakdown.vat] + 
           deadlineBreakdown.accounts[row.key as keyof typeof deadlineBreakdown.accounts]
  }))

  const grandTotal = totals.reduce((sum, row) => sum + row.total, 0)

  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        {grandTotal === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table Header */}
            <div className="grid grid-cols-4 gap-2 pb-2 border-b border-gray-200">
              <div className="text-sm font-medium text-gray-700">Period</div>
              <div className="text-center text-sm font-medium text-blue-700 flex items-center justify-center gap-1">
                <Receipt className="h-3 w-3" />
                VAT
              </div>
              <div className="text-center text-sm font-medium text-green-700 flex items-center justify-center gap-1">
                <FileText className="h-3 w-3" />
                Accounts
              </div>
              <div className="text-center text-sm font-medium text-gray-700">Total</div>
            </div>
            
            {/* Table Rows */}
            <div className="space-y-1">
              {totals.map((row, index) => (
                <div key={row.key} className={`grid grid-cols-4 gap-2 p-2 rounded-lg border ${row.bgColor} ${row.borderColor}`}>
                  <div className={`text-sm font-medium ${row.color}`}>
                    {row.label}
                  </div>
                  <div className="text-center">
                    <span className={`font-bold ${row.vatCount > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                      {row.vatCount}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`font-bold ${row.accountsCount > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                      {row.accountsCount}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`font-bold ${row.total > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {row.total}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary */}
            <div className="pt-2 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Total: <span className="font-bold text-foreground">{grandTotal}</span> deadlines in next 90 days
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </>
  )
} 