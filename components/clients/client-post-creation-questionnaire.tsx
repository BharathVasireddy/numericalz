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
import { calculateVATQuarter, VAT_QUARTER_GROUPS } from '@/lib/vat-workflow'

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
      // Calculate the NEXT filing quarter (the quarter that files in the current/next month)
      // For example: If we're in June and client has 2_5_8_11 group:
      // - Current quarter is Jun-Aug (files in September)
      // - But we want the NEXT filing which is Mar-May quarter filing in June
      
      const today = new Date()
      const currentMonth = today.getMonth() + 1 // 1-based month
      
      // Find the next filing month for this quarter group
      const quarterGroups = {
        '1_4_7_10': [2, 5, 8, 11], // Files in Feb, May, Aug, Nov
        '2_5_8_11': [3, 6, 9, 12], // Files in Mar, Jun, Sep, Dec  
        '3_6_9_12': [4, 7, 10, 1]  // Files in Apr, Jul, Oct, Jan
      }
      
      const filingMonths = quarterGroups[vatData.vatQuarterGroup as keyof typeof quarterGroups] || []
      
      // Find the next filing month (current month or next one)
      let nextFilingMonth = filingMonths.find(month => month >= currentMonth)
      let nextFilingYear = today.getFullYear()
      
      // If no filing month found this year, use the first one next year
      if (!nextFilingMonth) {
        nextFilingMonth = filingMonths[0]
        nextFilingYear = today.getFullYear() + 1
      }
      
      // Ensure we have a valid filing month (fallback to first month if still undefined)
      if (!nextFilingMonth) {
        nextFilingMonth = filingMonths[0] || 1 // Default to January if no filing months
      }
      
      // Calculate the quarter that files in this month
      // Filing month is the month AFTER quarter end, so quarter ends in previous month
      const quarterEndMonth = nextFilingMonth === 1 ? 12 : nextFilingMonth - 1
      const quarterEndYear = nextFilingMonth === 1 ? nextFilingYear - 1 : nextFilingYear
      
      // Calculate quarter info for the quarter that ends in that month
      const quarterEndDate = new Date(quarterEndYear, quarterEndMonth - 1, 15) // Mid-month to avoid edge cases
      const quarterInfo = calculateVATQuarter(vatData.vatQuarterGroup, quarterEndDate)
      
      // Use the filing due date
      const filingDueDate = quarterInfo.filingDueDate
      const year = filingDueDate.getFullYear()
      const month = filingDueDate.getMonth()
      const day = filingDueDate.getDate()
      
      const filingDueDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      setVatData(prev => ({ ...prev, nextVatReturnDue: filingDueDateString }))
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
                          {Object.entries(VAT_QUARTER_GROUPS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {key.replace(/_/g, '/')} ({label})
                            </SelectItem>
                          ))}
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
                        Automatically calculated based on UK VAT rules (last day of month following quarter end)
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