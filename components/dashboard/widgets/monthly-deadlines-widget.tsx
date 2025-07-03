'use client'

import { useState, useEffect } from 'react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Calendar,
  FileText,
  Receipt,
  CheckCircle,
  Calculator
} from 'lucide-react'

interface MonthlyDeadlines {
  accounts: number
  vat: number
  cs: number
  ct: number
}

interface MonthlyDeadlinesData {
  monthlyDeadlines: MonthlyDeadlines
  monthName: string
}

export function MonthlyDeadlinesWidget() {
  const [data, setData] = useState<MonthlyDeadlinesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMonthlyDeadlines = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/widgets/monthly-deadlines', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Failed to fetch monthly deadlines data')
      }
    } catch (err) {
      console.error('Error fetching monthly deadlines:', err)
      setError('Failed to fetch monthly deadlines data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonthlyDeadlines()
  }, [])

  if (loading) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Monthly Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </>
    )
  }

  if (error) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Monthly Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Monthly Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No deadlines data available</p>
          </div>
        </CardContent>
      </>
    )
  }

  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {data.monthName} Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <FileText className="h-3 w-3 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Accounts</span>
            </div>
            <div className="text-xl font-bold text-blue-700">{data.monthlyDeadlines.accounts}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-green-50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Receipt className="h-3 w-3 text-green-600" />
              <span className="text-xs font-medium text-green-600">VAT</span>
            </div>
            <div className="text-xl font-bold text-green-700">{data.monthlyDeadlines.vat}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-orange-50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3 text-orange-600" />
              <span className="text-xs font-medium text-orange-600">Confirmations</span>
            </div>
            <div className="text-xl font-bold text-orange-700">{data.monthlyDeadlines.cs}</div>
          </div>
          
          <div className="p-3 rounded-lg bg-purple-50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calculator className="h-3 w-3 text-purple-600" />
              <span className="text-xs font-medium text-purple-600">Corporation Tax</span>
            </div>
            <div className="text-xl font-bold text-purple-700">{data.monthlyDeadlines.ct}</div>
          </div>
        </div>
      </CardContent>
    </>
  )
} 