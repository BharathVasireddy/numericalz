'use client'

import { useState, useEffect } from 'react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Building,
  Users, 
  Building2,
  Receipt
} from 'lucide-react'

interface ClientCounts {
  total: number
  ltd: number
  nonLtd: number
  vat: number
}

export function ClientOverviewWidget() {
  const [clientCounts, setClientCounts] = useState<ClientCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClientCounts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/dashboard/widgets/client-overview', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setClientCounts(data.data.clientCounts)
      } else {
        setError(data.error || 'Failed to fetch client overview data')
      }
    } catch (err) {
      console.error('Error fetching client overview:', err)
      setError('Failed to fetch client overview data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientCounts()
  }, [])

  if (loading) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4" />
            Client Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
            <Building className="h-4 w-4" />
            Client Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </>
    )
  }

  if (!clientCounts) {
    return (
      <>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building className="h-4 w-4" />
            Client Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No client data available</p>
          </div>
        </CardContent>
      </>
    )
  }

  return (
    <>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building className="h-4 w-4" />
          Client Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-50">
            <div className="flex items-center justify-between">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-bold text-blue-700">{clientCounts.total}</span>
            </div>
            <p className="text-xs text-blue-600 font-medium mt-1">Total Clients</p>
          </div>

          <div className="p-3 rounded-lg bg-green-50">
            <div className="flex items-center justify-between">
              <Building2 className="h-4 w-4 text-green-600" />
              <span className="text-lg font-bold text-green-700">{clientCounts.ltd}</span>
            </div>
            <p className="text-xs text-green-600 font-medium mt-1">Ltd Companies</p>
          </div>

          <div className="p-3 rounded-lg bg-orange-50">
            <div className="flex items-center justify-between">
              <Building className="h-4 w-4 text-orange-600" />
              <span className="text-lg font-bold text-orange-700">{clientCounts.nonLtd}</span>
            </div>
            <p className="text-xs text-orange-600 font-medium mt-1">Non-Limited</p>
          </div>

          <div className="p-3 rounded-lg bg-purple-50">
            <div className="flex items-center justify-between">
              <Receipt className="h-4 w-4 text-purple-600" />
              <span className="text-lg font-bold text-purple-700">{clientCounts.vat}</span>
            </div>
            <p className="text-xs text-purple-600 font-medium mt-1">VAT Enabled</p>
          </div>
        </div>
      </CardContent>
    </>
  )
} 