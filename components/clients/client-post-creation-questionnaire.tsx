'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calculator, 
  Loader2,
  CheckCircle,
  Info
} from 'lucide-react'
import { showToast } from '@/lib/toast'

interface ClientPostCreationQuestionnaireProps {
  isOpen: boolean
  onComplete: (updatedClient: any) => void
  client: {
    id: string
    companyName: string
    companyNumber?: string
    clientCode: string
    companyType: string
  }
}

interface VATData {
  isVatEnabled: boolean
  vatReturnsFrequency?: string
  vatQuarterGroup?: string
  nextVatReturnDue?: string
}

// Helper function to calculate next VAT return date based on UK VAT rules
const calculateNextVATReturn = (quarterGroup: string): string => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed
  
  // Define quarter end months for each group
  const quarterEndMonths: { [key: string]: number[] } = {
    '1_4_7_10': [1, 4, 7, 10], // Jan, Apr, Jul, Oct
    '2_5_8_11': [2, 5, 8, 11], // Feb, May, Aug, Nov
    '3_6_9_12': [3, 6, 9, 12]  // Mar, Jun, Sep, Dec
  }
  
  const endMonths = quarterEndMonths[quarterGroup]
  if (!endMonths) return ''
  
  // Find the next quarter end month
  let nextEndMonth = endMonths.find(month => month > currentMonth)
  let nextYear = currentYear
  
  // If no month found in current year, take first month of next year
  if (!nextEndMonth) {
    nextEndMonth = endMonths[0]
    nextYear = currentYear + 1
  }
  
  // Safety check for TypeScript
  if (!nextEndMonth) return ''
  
  // VAT return is due by the last day of the month following quarter end
  // UK VAT Rule: Filing due by the last day of the month following the quarter end
  const quarterEndDate = new Date(nextYear, nextEndMonth - 1, 0) // Last day of the quarter end month
  const dueDate = new Date(quarterEndDate)
  dueDate.setMonth(dueDate.getMonth() + 1) // Move to next month
  dueDate.setDate(1) // Go to first day of next month
  dueDate.setMonth(dueDate.getMonth() + 1) // Move to month after that
  dueDate.setDate(0) // Go back to last day of previous month (which is the month we want)
  
  return dueDate.toISOString().split('T')[0] || '' // Return YYYY-MM-DD format
}

export function ClientPostCreationQuestionnaire({ 
  isOpen, 
  onComplete, 
  client 
}: ClientPostCreationQuestionnaireProps) {
  const [loading, setLoading] = useState(false)
  const [vatData, setVatData] = useState<VATData>({
    isVatEnabled: false,
  })

  // Debug logging
  useEffect(() => {
    console.log('🎯 VAT Questionnaire - isOpen:', isOpen, 'client:', client)
  }, [isOpen, client])

  // Auto-calculate next VAT return date when quarter group changes
  useEffect(() => {
    if (vatData.vatQuarterGroup && vatData.vatReturnsFrequency === 'QUARTERLY') {
      const nextDate = calculateNextVATReturn(vatData.vatQuarterGroup)
      setVatData(prev => ({ ...prev, nextVatReturnDue: nextDate }))
    }
  }, [vatData.vatQuarterGroup, vatData.vatReturnsFrequency])

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Only send VAT-related fields
      const requestData: any = {
        isVatEnabled: vatData.isVatEnabled,
      }

      // Only include VAT details if VAT is enabled
      if (vatData.isVatEnabled) {
        requestData.vatReturnsFrequency = vatData.vatReturnsFrequency || null
        requestData.vatQuarterGroup = vatData.vatQuarterGroup || null
        requestData.nextVatReturnDue = vatData.nextVatReturnDue || null
      }

      console.log('🔍 Sending VAT data:', requestData)

      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('VAT information saved successfully')
        onComplete(data.client)
      } else {
        throw new Error(data.error || 'Failed to save VAT information')
      }
    } catch (error: any) {
      console.error('Error saving VAT information:', error)
      showToast.error('Failed to save VAT information')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Skip questionnaire and proceed with original client data
    onComplete(client)
  }

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            VAT Registration Setup
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Client "{client.companyName}" has been created. Let's set up their VAT information.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-5 w-5 text-blue-600" />
                VAT Registration
              </CardTitle>
              <CardDescription>
                Configure VAT settings for this client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* VAT Registration Question */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Is this client VAT registered?</Label>
                <Select
                  value={vatData.isVatEnabled ? 'yes' : 'no'}
                  onValueChange={(value) => {
                    const isEnabled = value === 'yes'
                    setVatData(prev => ({
                      isVatEnabled: isEnabled,
                      // Reset other fields if VAT is disabled
                      ...(isEnabled ? {} : {
                        vatReturnsFrequency: undefined,
                        vatQuarterGroup: undefined,
                        nextVatReturnDue: undefined
                      })
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select VAT registration status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No - Not VAT registered</SelectItem>
                    <SelectItem value="yes">Yes - VAT registered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* VAT Details - Only show if VAT is enabled */}
              {vatData.isVatEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-100">
                  {/* VAT Returns Frequency */}
                  <div className="space-y-2">
                    <Label htmlFor="vatFrequency">VAT Returns Frequency</Label>
                    <Select
                      value={vatData.vatReturnsFrequency || ''}
                      onValueChange={(value) =>
                        setVatData(prev => ({ 
                          ...prev, 
                          vatReturnsFrequency: value,
                          // Reset quarter group if not quarterly
                          ...(value !== 'QUARTERLY' ? { 
                            vatQuarterGroup: undefined,
                            nextVatReturnDue: undefined 
                          } : {})
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="ANNUALLY">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quarter Group - Only show for quarterly */}
                  {vatData.vatReturnsFrequency === 'QUARTERLY' && (
                    <div className="space-y-2">
                      <Label htmlFor="vatQuarterGroup">VAT Quarter Group</Label>
                      <Select
                        value={vatData.vatQuarterGroup || ''}
                        onValueChange={(value) =>
                          setVatData(prev => ({ ...prev, vatQuarterGroup: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select quarter group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1_4_7_10">1/4/7/10 (Jan/Apr/Jul/Oct)</SelectItem>
                          <SelectItem value="2_5_8_11">2/5/8/11 (Feb/May/Aug/Nov)</SelectItem>
                          <SelectItem value="3_6_9_12">3/6/9/12 (Mar/Jun/Sep/Dec)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Auto-calculated Next VAT Return Date */}
                  {vatData.nextVatReturnDue && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Info className="h-4 w-4" />
                        <span className="font-medium">Next VAT Return Due</span>
                      </div>
                      <p className="text-blue-700 mt-1">
                        {formatDateForDisplay(vatData.nextVatReturnDue)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Automatically calculated based on UK VAT rules
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="ghost" onClick={handleSkip}>
              Skip for Now
            </Button>
            
            <Button onClick={handleComplete} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 