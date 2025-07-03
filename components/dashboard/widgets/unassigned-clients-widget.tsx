'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface UnassignedCounts {
  ltd: number
  nonLtd: number
  vat: number
}

interface UnassignedClientsWidgetProps {
  onNavigate: (type: 'ltd' | 'nonLtd' | 'vat') => void
}

export function UnassignedClientsWidget({ onNavigate }: UnassignedClientsWidgetProps) {
  const [unassignedCounts, setUnassignedCounts] = useState<UnassignedCounts | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUnassignedClients = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/widgets/unassigned-clients', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const result = await response.json()
      
      if (result.success) {
        setUnassignedCounts(result.data.unassignedCounts)
      } else {
        console.error('Failed to fetch unassigned clients data:', result.error)
      }
    } catch (error) {
      console.error('Error fetching unassigned clients data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnassignedClients()
  }, [])

  if (loading) {
    return (
      <>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Unassigned Clients
            </CardTitle>
            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
              Loading...
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p className="text-sm">Loading unassigned clients...</p>
          </div>
        </CardContent>
      </>
    )
  }

  if (!unassignedCounts) {
    return (
      <>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Unassigned Clients
            </CardTitle>
            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
              Error
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <p className="text-sm">Failed to load unassigned clients</p>
          </div>
        </CardContent>
      </>
    )
  }

  const totalUnassigned = unassignedCounts.ltd + unassignedCounts.nonLtd + unassignedCounts.vat

  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            Unassigned Clients
          </CardTitle>
          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
            {totalUnassigned} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div 
            className={`flex items-center justify-between p-2 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
              unassignedCounts.ltd > 0 
                ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer' 
                : 'opacity-60'
            }`}
            onClick={() => unassignedCounts.ltd > 0 && onNavigate('ltd')}
          >
            <span className="text-sm text-amber-800">Ltd Accounts</span>
            <span className="font-bold text-amber-900">{unassignedCounts.ltd}</span>
          </div>
          
          <div 
            className={`flex items-center justify-between p-2 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
              unassignedCounts.nonLtd > 0 
                ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer' 
                : 'opacity-60'
            }`}
            onClick={() => unassignedCounts.nonLtd > 0 && onNavigate('nonLtd')}
          >
            <span className="text-sm text-amber-800">Non-Ltd Accounts</span>
            <span className="font-bold text-amber-900">{unassignedCounts.nonLtd}</span>
          </div>
          
          <div 
            className={`flex items-center justify-between p-2 rounded-lg bg-amber-100 border border-amber-200 transition-all duration-200 ${
              unassignedCounts.vat > 0 
                ? 'hover:bg-amber-200 hover:border-amber-300 cursor-pointer' 
                : 'opacity-60'
            }`}
            onClick={() => unassignedCounts.vat > 0 && onNavigate('vat')}
          >
            <span className="text-sm text-amber-800">VAT Returns</span>
            <span className="font-bold text-amber-900">{unassignedCounts.vat}</span>
          </div>
        </div>
        
        {totalUnassigned > 0 && (
          <div className="pt-2 border-t border-amber-200">
            <p className="text-xs text-amber-700 text-center">
              Click on any section above to assign clients
            </p>
          </div>
        )}
      </CardContent>
    </>
  )
} 