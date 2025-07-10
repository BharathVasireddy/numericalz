import { useState, useEffect, useCallback } from 'react'

interface CombinedDashboardData {
  clientCounts: {
    total: number
    ltd: number
    nonLtd: number
    vat: number
  }
  unassignedCounts: {
    ltd: number
    nonLtd: number
    vat: number
  }
  monthlyDeadlines: {
    accounts: number
    vat: number
    cs: number
    ct: number
  }
  upcomingDeadlines: {
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
  teamWorkload: Array<{
    id: string
    name: string
    role: string
    clientCount: number
    generalAssignments: number
    ltdAssignments: number
    nonLtdAssignments: number
    activeVATQuarters: number
    activeLtdWorkflows: number
  }>
  monthName: string
}

export function useCombinedDashboard() {
  const [data, setData] = useState<CombinedDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/combined-widgets', {
        // Use smart caching - the API handles cache headers
        method: 'GET'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data')
      }
      
    } catch (err) {
      console.error('Combined dashboard fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Manual refresh function for force updates
  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refresh
  }
} 