'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText, 
  Calculator, 
  Calendar,
  Loader2,
  ArrowRight,
  CheckCircle
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

interface QuestionnaireData {
  // VAT Information
  isVatEnabled: boolean
  vatNumber?: string
  vatRegistrationDate?: string
  vatReturnsFrequency?: string
  nextVatReturnDue?: string
  
  // Additional Services
  requiresPayroll: boolean
  requiresBookkeeping: boolean
  requiresManagementAccounts: boolean
  
  // Communication Preferences
  preferredContactMethod?: string
  specialInstructions?: string
}

export function ClientPostCreationQuestionnaire({ 
  isOpen, 
  onComplete, 
  client 
}: ClientPostCreationQuestionnaireProps) {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData>({
    isVatEnabled: false,
    requiresPayroll: false,
    requiresBookkeeping: false,
    requiresManagementAccounts: false,
  })

  // Debug logging
  useEffect(() => {
    console.log('🎯 Questionnaire component - isOpen:', isOpen, 'client:', client)
  }, [isOpen, client])

  const totalSteps = 3

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Update client with questionnaire data
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // VAT fields
          isVatEnabled: questionnaireData.isVatEnabled,
          vatNumber: questionnaireData.vatNumber || null,
          vatRegistrationDate: questionnaireData.vatRegistrationDate || null,
          vatReturnsFrequency: questionnaireData.vatReturnsFrequency || null,
          nextVatReturnDue: questionnaireData.nextVatReturnDue || null,
          
          // Service requirements
          requiresPayroll: questionnaireData.requiresPayroll,
          requiresBookkeeping: questionnaireData.requiresBookkeeping,
          requiresManagementAccounts: questionnaireData.requiresManagementAccounts,
          
          // Communication
          preferredContactMethod: questionnaireData.preferredContactMethod || null,
          specialInstructions: questionnaireData.specialInstructions || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        showToast.success('Client information updated successfully')
        onComplete(data.data)
      } else {
        throw new Error(data.error || 'Failed to update client')
      }
    } catch (error: any) {
      console.error('Error updating client:', error)
      showToast.error('Failed to update client information')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Skip questionnaire and proceed with original client data
    onComplete(client)
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Calculator className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-lg font-semibold">VAT Information</h3>
        <p className="text-sm text-muted-foreground">
          Let us know about the client's VAT requirements
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* VAT Enabled Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="vatEnabled"
              checked={questionnaireData.isVatEnabled}
              onCheckedChange={(checked) =>
                setQuestionnaireData(prev => ({ ...prev, isVatEnabled: checked as boolean }))
              }
            />
            <Label htmlFor="vatEnabled" className="text-sm font-medium">
              This client is VAT registered
            </Label>
          </div>

          {/* VAT Details - Only show if VAT is enabled */}
          {questionnaireData.isVatEnabled && (
            <div className="space-y-4 pl-6 border-l-2 border-blue-100">
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number</Label>
                <Input
                  id="vatNumber"
                  placeholder="e.g., GB123456789"
                  value={questionnaireData.vatNumber || ''}
                  onChange={(e) =>
                    setQuestionnaireData(prev => ({ ...prev, vatNumber: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatRegistrationDate">VAT Registration Date</Label>
                <Input
                  id="vatRegistrationDate"
                  type="date"
                  value={questionnaireData.vatRegistrationDate || ''}
                  onChange={(e) =>
                    setQuestionnaireData(prev => ({ ...prev, vatRegistrationDate: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatFrequency">VAT Returns Frequency</Label>
                <Select
                  value={questionnaireData.vatReturnsFrequency || ''}
                  onValueChange={(value) =>
                    setQuestionnaireData(prev => ({ ...prev, vatReturnsFrequency: value }))
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

              <div className="space-y-2">
                <Label htmlFor="nextVatDue">Next VAT Return Due</Label>
                <Input
                  id="nextVatDue"
                  type="date"
                  value={questionnaireData.nextVatReturnDue || ''}
                  onChange={(e) =>
                    setQuestionnaireData(prev => ({ ...prev, nextVatReturnDue: e.target.value }))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <FileText className="mx-auto h-12 w-12 text-green-600 mb-4" />
        <h3 className="text-lg font-semibold">Additional Services</h3>
        <p className="text-sm text-muted-foreground">
          What services does this client require?
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="payroll"
              checked={questionnaireData.requiresPayroll}
              onCheckedChange={(checked) =>
                setQuestionnaireData(prev => ({ ...prev, requiresPayroll: checked as boolean }))
              }
            />
            <Label htmlFor="payroll" className="text-sm font-medium">
              Payroll Services
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="bookkeeping"
              checked={questionnaireData.requiresBookkeeping}
              onCheckedChange={(checked) =>
                setQuestionnaireData(prev => ({ ...prev, requiresBookkeeping: checked as boolean }))
              }
            />
            <Label htmlFor="bookkeeping" className="text-sm font-medium">
              Bookkeeping Services
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="managementAccounts"
              checked={questionnaireData.requiresManagementAccounts}
              onCheckedChange={(checked) =>
                setQuestionnaireData(prev => ({ ...prev, requiresManagementAccounts: checked as boolean }))
              }
            />
            <Label htmlFor="managementAccounts" className="text-sm font-medium">
              Management Accounts
            </Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Calendar className="mx-auto h-12 w-12 text-purple-600 mb-4" />
        <h3 className="text-lg font-semibold">Communication Preferences</h3>
        <p className="text-sm text-muted-foreground">
          How should we communicate with this client?
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contactMethod">Preferred Contact Method</Label>
            <Select
              value={questionnaireData.preferredContactMethod || ''}
              onValueChange={(value) =>
                setQuestionnaireData(prev => ({ ...prev, preferredContactMethod: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preferred method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="PHONE">Phone</SelectItem>
                <SelectItem value="POST">Post</SelectItem>
                <SelectItem value="IN_PERSON">In Person</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea
              id="specialInstructions"
              placeholder="Any special instructions or notes for this client..."
              value={questionnaireData.specialInstructions || ''}
              onChange={(e) =>
                setQuestionnaireData(prev => ({ ...prev, specialInstructions: e.target.value }))
              }
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Client Setup - Additional Information
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Client "{client.companyName}" has been created. Let's gather some additional information to better serve them.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                    i + 1 <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleSkip}>
                Skip This Step
              </Button>
              
              {currentStep < totalSteps ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 