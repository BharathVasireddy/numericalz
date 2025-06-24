'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, CheckCircle, Clock, FileText, Calendar, Settings } from 'lucide-react'
import { getCTTrackingSummary, type CTStatus, type CTDueSource } from '@/lib/ct-tracking'
import { useToast } from '@/hooks/use-toast'

interface CTStatusManagerProps {
  client: {
    id: string
    companyName: string
    corporationTaxStatus?: CTStatus
    corporationTaxPeriodStart?: Date | string | null
    corporationTaxPeriodEnd?: Date | string | null
    nextCorporationTaxDue?: Date | string | null
    manualCTDueOverride?: Date | string | null
    ctDueSource?: CTDueSource
    lastCTStatusUpdate?: Date | string | null
    ctStatusUpdatedBy?: string | null
  }
  currentUser: {
    id: string
    name: string
    role: string
  }
  onUpdate?: () => void
}

export function CTStatusManager({ client, currentUser, onUpdate }: CTStatusManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showMarkFiledDialog, setShowMarkFiledDialog] = useState(false)
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [nextYearEnd, setNextYearEnd] = useState('')
  const [manualDueDate, setManualDueDate] = useState('')
  const { toast } = useToast()

  // Convert dates to proper format
  const ctData = {
    corporationTaxStatus: client.corporationTaxStatus || 'PENDING',
    corporationTaxPeriodStart: client.corporationTaxPeriodStart ? new Date(client.corporationTaxPeriodStart) : null,
    corporationTaxPeriodEnd: client.corporationTaxPeriodEnd ? new Date(client.corporationTaxPeriodEnd) : null,
    nextCorporationTaxDue: client.nextCorporationTaxDue ? new Date(client.nextCorporationTaxDue) : null,
    manualCTDueOverride: client.manualCTDueOverride ? new Date(client.manualCTDueOverride) : null,
    ctDueSource: client.ctDueSource || 'AUTO',
    lastCTStatusUpdate: client.lastCTStatusUpdate ? new Date(client.lastCTStatusUpdate) : null,
    ctStatusUpdatedBy: client.ctStatusUpdatedBy || null
  }

  const summary = getCTTrackingSummary(ctData)

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return 'Not set'
    try {
      return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch (e) {
      return 'Not set'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'FILED': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'OVERDUE': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'PENDING': return <Clock className="h-4 w-4 text-amber-600" />
      default: return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FILED': return 'bg-green-100 text-green-800'
      case 'OVERDUE': return 'bg-red-100 text-red-800'
      case 'PENDING': return 'bg-amber-100 text-amber-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleCTStatusUpdate = async (action: string, data?: any) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/clients/${client.id}/ct-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "CT Status Updated",
          description: result.message,
        })
        onUpdate?.()
        setShowMarkFiledDialog(false)
        setShowManualDialog(false)
        setNextYearEnd('')
        setManualDueDate('')
      } else {
        toast({
          title: "Update Failed",
          description: result.error || 'Failed to update CT status',
          variant: "destructive",
        })
        
        if (result.warnings?.length > 0) {
          toast({
            title: "Warning",
            description: result.warnings.join('. '),
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: 'Failed to update CT status',
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Only show to managers and partners
  if (currentUser.role !== 'MANAGER' && currentUser.role !== 'PARTNER') {
    return null
  }

  return (
    <Card className="shadow-professional">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <FileText className="h-5 w-5" />
          Corporation Tax Status
        </CardTitle>
        <CardDescription>
          Manage CT filing status and due dates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(summary.status)}
              <Badge className={getStatusColor(summary.status)}>
                {summary.status}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">CT Due:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{summary.dueDate}</span>
              {summary.source === 'MANUAL' && (
                <Badge variant="outline" className="text-xs">Manual</Badge>
              )}
            </div>
          </div>



          {ctData.lastCTStatusUpdate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Updated:</span>
              <span className="text-sm">{formatDate(ctData.lastCTStatusUpdate)}</span>
            </div>
          )}
        </div>

        {/* Warnings */}
        {summary.warnings.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="space-y-1">
                {summary.warnings.map((warning, index) => (
                  <p key={index} className="text-sm text-amber-800">{warning}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {/* Mark as Filed */}
          {ctData.corporationTaxStatus !== 'FILED' && (
            <Dialog open={showMarkFiledDialog} onOpenChange={setShowMarkFiledDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Filed
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mark CT as Filed</DialogTitle>
                  <DialogDescription>
                    Mark the current CT period as filed and optionally set up the next period.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nextYearEnd">Next Year End (Optional)</Label>
                    <Input
                      id="nextYearEnd"
                      type="date"
                      value={nextYearEnd}
                      onChange={(e) => setNextYearEnd(e.target.value)}
                      placeholder="Leave blank to not set up next period"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowMarkFiledDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleCTStatusUpdate('mark_filed', { nextYearEnd: nextYearEnd || undefined })}
                    disabled={isLoading}
                  >
                    Mark as Filed
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Manual Override */}
          <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Set Manual Date
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Manual CT Due Date</DialogTitle>
                <DialogDescription>
                  Override the automatic calculation with a manual due date.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="manualDueDate">Manual CT Due Date</Label>
                  <Input
                    id="manualDueDate"
                    type="date"
                    value={manualDueDate}
                    onChange={(e) => setManualDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowManualDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCTStatusUpdate('set_manual', { manualDueDate })}
                  disabled={isLoading || !manualDueDate}
                >
                  Set Manual Date
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reset to Auto */}
          {ctData.ctDueSource === 'MANUAL' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCTStatusUpdate('reset_auto')}
              disabled={isLoading}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Reset to Auto
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 